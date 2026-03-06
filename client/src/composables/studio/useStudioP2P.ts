import { ref, onMounted, onUnmounted, watch, type Ref, reactive } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { PeerNode } from './services/PeerNode';

export function useStudioP2P(
    localStream: Ref<MediaStream | null>,
    canvasStream?: Ref<MediaStream | null>,
    isGuestMode?: Ref<boolean>
) {
    const studioStore = useStudioStore();
    const peerNodes = new Map<string, PeerNode>();
    const guestStreams = new Map<string, MediaStream>();
    const guestVideoElements = reactive(new Map<string, HTMLVideoElement>());
    const lastPlayTime = new Map<string, number>();
    const guestVideos = ref<Record<string, HTMLVideoElement>>({});
    const connectedHostId = ref<string | null>(null);

    const syncGuestVideos = () => {
        const now = Date.now();
        const playVideo = (v: HTMLVideoElement, guestId: string) => {
            const last = lastPlayTime.get(guestId) || 0;
            if (!v.paused && v.readyState >= 2 && v.videoWidth > 0) return;

            if (v.readyState >= 2) {
                if (now - last > 500) {
                    lastPlayTime.set(guestId, now);
                    v.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn(`[Studio P2P] Play failed for ${guestId}:`, e);
                    });
                }
            } else {
                v.onloadedmetadata = () => {
                    v.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn(`[Studio P2P] Late play failed for ${guestId}:`, e);
                    });
                };
                if (!v.oncanplay) {
                    v.oncanplay = () => {
                        if (v.paused) v.play().catch(() => {});
                    };
                }
            }
        };

        if (isGuestMode?.value && localStream.value && studioStore.myGuestId) {
            let myVideo = guestVideoElements.get(studioStore.myGuestId);
            if (!myVideo) {
                myVideo = document.createElement('video');
                myVideo.id = studioStore.myGuestId;
                myVideo.autoplay = true;
                myVideo.muted = true;
                myVideo.srcObject = localStream.value;
                guestVideoElements.set(studioStore.myGuestId, myVideo);
            }
            playVideo(myVideo, studioStore.myGuestId);
        }

        studioStore.liveGuests.forEach((g) => {
            const stream = guestStreams.get(g.uuid);
            if (stream) {
                let video = guestVideoElements.get(g.uuid);
                if (!video) {
                    video = document.createElement('video');
                    video.id = g.uuid;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.srcObject = stream;
                    video.muted = true; 
                    guestVideoElements.set(g.uuid, video);
                } else if (video.srcObject !== stream || (stream.getTracks().length > 0 && !video.paused && video.readyState < 2)) {
                    video.srcObject = null;
                    video.srcObject = stream;
                    video.onloadedmetadata = null;
                    video.oncanplay = null;
                }
                playVideo(video, g.uuid);
            }
        });

        const hostStream = guestStreams.get('host');
        if (hostStream) {
            let hostVideo = guestVideoElements.get('host');
            if (!hostVideo) {
                hostVideo = document.createElement('video');
                hostVideo.id = 'host';
                hostVideo.autoplay = true;
                hostVideo.playsInline = true;
                hostVideo.srcObject = hostStream;
                hostVideo.muted = true;
                guestVideoElements.set('host', hostVideo);
            } else if (hostVideo.srcObject !== hostStream) {
                hostVideo.srcObject = hostStream;
                hostVideo.onloadedmetadata = null;
                hostVideo.oncanplay = null;
            }
            playVideo(hostVideo, 'host');
        }

        const nextVideos: Record<string, HTMLVideoElement> = {};

        Object.entries(studioStore.guestSlotMap).forEach(([slotKey, g]: [string, any]) => {
            if (g && g.id) {
                const video = guestVideoElements.get(g.id);
                if (video) nextVideos[slotKey] = video;
            }
        });

        guestVideoElements.forEach((video, id) => {
            nextVideos[id] = video;
        });

        const hostVid = guestVideoElements.get('host');
        if (hostVid) nextVideos['host'] = hostVid;

        guestVideos.value = nextVideos;
    };

    const handleTrack = (fromId: string, event: RTCTrackEvent) => {
        console.log(`[Studio P2P] Received track from ${fromId}:`, event.track.kind);
        if (event.streams && event.streams[0]) {
            const incomingStream = event.streams[0];
            let targetId = 'host';
            const matchedGuest = studioStore.liveGuests.find(g => g.streamId === incomingStream.id || g.uuid === fromId);

            if (matchedGuest) {
                targetId = matchedGuest.uuid;
                if (matchedGuest.uuid === fromId && matchedGuest.streamId !== incomingStream.id) {
                    matchedGuest.streamId = incomingStream.id;
                    studioStore.broadcastCurrentState();
                }
            } else if (fromId === connectedHostId.value) {
                targetId = 'host';
            }

            let targetStream = guestStreams.get(targetId);
            if (!targetStream) {
                targetStream = new MediaStream();
                guestStreams.set(targetId, targetStream);
            }

            if (!targetStream.getTracks().find(t => t.id === event.track.id)) {
                targetStream.addTrack(event.track);
            }

            syncGuestVideos();

            // HOST LOGIC: Forward this stream to OTHERS
            const shouldForwardVideo = isGuestMode?.value ? true : false;
            peerNodes.forEach((otherNode, otherGuestId) => {
                if (otherGuestId !== fromId) {
                    otherNode.forwardTracks(targetStream!, shouldForwardVideo);
                }
            });
        }
    };

    const stopGuestSubscriber = (guestId: string) => {
        const node = peerNodes.get(guestId);
        if (node) {
            node.close();
            peerNodes.delete(guestId);
        }
        guestStreams.delete(guestId);
        guestVideoElements.delete(guestId);
        syncGuestVideos();
    };

    const initiateAsGuest = async (hostId: string) => {
        connectedHostId.value = hostId;
        if (peerNodes.has(hostId)) return;
        
        console.log("[Studio P2P] Initiating connection to host:", hostId);

        const node = new PeerNode({
            targetId: hostId,
            onTrack: (event) => handleTrack(hostId, event)
        });
        
        peerNodes.set(hostId, node);
        node.addLocalTracks(localStream.value, canvasStream?.value);
        await node.createAndSendOffer();
    };

    const handleGuestSignal = async (e: any) => {
        const { from, signal } = e.detail;

        if (signal.type === 'offer') {
            console.log(`[Studio P2P] Received offer from: ${from}`);
            let node = peerNodes.get(from);
            
            if (!node) {
                node = new PeerNode({
                    targetId: from,
                    onTrack: (event) => handleTrack(from, event)
                });
                peerNodes.set(from, node);
                node.addLocalTracks(localStream.value, canvasStream?.value);

                const shouldForwardVideo = isGuestMode?.value ? true : false;
                guestStreams.forEach((stream, guestId) => {
                    if (guestId !== from) {
                        node!.forwardTracks(stream, shouldForwardVideo);
                    }
                });
            }

            await node.handleOffer(signal.sdp);
        } else if (signal.type === 'answer') {
            const node = peerNodes.get(from);
            if (node) await node.handleAnswer(signal.sdp);
        } else if (signal.type === 'candidate') {
            const node = peerNodes.get(from);
            if (node) await node.handleCandidate(signal.candidate);
        }
    };

    onMounted(() => {
        window.addEventListener('guest:signal', handleGuestSignal);
    });

    onUnmounted(() => {
        window.removeEventListener('guest:signal', handleGuestSignal);
        peerNodes.forEach(node => node.close());
        peerNodes.clear();
        guestStreams.clear();
        guestVideoElements.clear();
    });

    watch(() => canvasStream?.value, (newStream) => {
        if (newStream) {
            console.log("[Studio P2P] Canvas Stream Available - Updating Tracks");
            const newVideoTrack = newStream.getVideoTracks()[0];

            peerNodes.forEach((node) => {
                const senders = node.pc.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');

                if (videoSender && newVideoTrack) {
                    videoSender.replaceTrack(newVideoTrack).catch(e => console.error("Video replace failed:", e));
                } else if (!videoSender && newVideoTrack) {
                    node.pc.addTrack(newVideoTrack, newStream);
                }
            });
        }
    });

    watch(() => studioStore.liveGuests, (guests) => {
        const activeIds = new Set(guests.map(g => g.uuid));
        for (const guestId of peerNodes.keys()) {
            if (isGuestMode?.value && guestId === connectedHostId.value) continue;
            if (!activeIds.has(guestId)) stopGuestSubscriber(guestId);
        }
        syncGuestVideos();
    }, { deep: true, immediate: true });

    const addSyntheticGuest = (uuid: string, stream: MediaStream) => {
        console.log(`[Studio P2P] Adding synthetic guest stream: ${uuid}`);
        
        guestStreams.set(uuid, stream);
        
        const guest = studioStore.liveGuests.find(g => g.uuid === uuid);
        if (guest && guest.slotIndex !== undefined) {
            const slotId = `guest${guest.slotIndex + 1}`;
            guestStreams.set(slotId, stream);
        }
        
        let video = guestVideoElements.get(uuid);
        if (!video) {
            video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true; 
            video.srcObject = stream;
            guestVideoElements.set(uuid, video);
            video.play().catch(e => console.warn("[Studio P2P] Synthetic video play failed:", e));
        } else {
            video.srcObject = stream;
            video.play();
        }
        
        if (guest && guest.slotIndex !== undefined) {
            const slotId = `guest${guest.slotIndex + 1}`;
            if (slotId !== uuid) guestVideoElements.set(slotId, video);
        }

        syncGuestVideos();
    };

    return {
        guestVideos,
        guestVideoElements,
        stopGuestSubscriber,
        syncGuestVideos,
        initiateAsGuest,
        addSyntheticGuest
    };
}
