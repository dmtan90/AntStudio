import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';

export function useStudioP2P(
    localStream: Ref<MediaStream | null>,
    canvasStream?: Ref<MediaStream | null>,
    isGuestMode?: Ref<boolean>
) {
    const studioStore = useStudioStore();
    const p2pConnections = new Map<string, RTCPeerConnection>();
    const guestStreams = new Map<string, MediaStream>();
    const guestVideoElements = reactive(new Map<string, HTMLVideoElement>());

    const guestVideos = ref<Record<string, HTMLVideoElement>>({});
    const connectedHostId = ref<string | null>(null);

    const syncGuestVideos = () => {
        // For Guests: ensure our own camera is available in the video map for previews
        if (isGuestMode?.value && localStream.value && studioStore.myGuestId) {
            // We use a dummy video element or just the source element if it's already a video
            // But usually we want a consistent HTMLVideoElement
            let myVideo = guestVideoElements.get(studioStore.myGuestId);
            if (!myVideo) {
                myVideo = document.createElement('video');
                myVideo.autoplay = true;
                myVideo.muted = true;
                myVideo.srcObject = localStream.value;
                guestVideoElements.set(studioStore.myGuestId, myVideo);
                myVideo.play();
            }
        }

        studioStore.liveGuests.forEach((g) => {
            const stream = guestStreams.get(g.id);
            if (stream) {
                let video = guestVideoElements.get(g.id);
                if (!video) {
                    video = document.createElement('video');
                    video.autoplay = true;
                    video.playsInline = true;
                    video.srcObject = stream;
                    video.muted = false;
                    guestVideoElements.set(g.id, video);
                    video.play().catch(e => console.warn("[Studio P2P] Video play failed:", e));
                } else {
                    if (video.srcObject !== stream) video.srcObject = stream;
                    // Re-trigger play even if stream object is the same
                    video.play().catch(() => { });
                }
            }
        });

        // Special handling for Host stream (incoming to Guest)
        const hostStream = guestStreams.get('host');
        if (hostStream) {
            let hostVideo = guestVideoElements.get('host');
            if (!hostVideo) {
                hostVideo = document.createElement('video');
                hostVideo.autoplay = true;
                hostVideo.playsInline = true;
                hostVideo.srcObject = hostStream;
                hostVideo.muted = false;
                guestVideoElements.set('host', hostVideo);
                hostVideo.play().catch(() => { });
            } else if (hostVideo.srcObject !== hostStream) {
                hostVideo.srcObject = hostStream;
                hostVideo.play().catch(() => { });
            }
        }

        const nextVideos: Record<string, HTMLVideoElement> = {};

        // Use the centralized map to ensure consistency with labels/placeholders
        Object.entries(studioStore.guestSlotMap).forEach(([slotKey, g]: [string, any]) => {
            // g can be null if the slot is empty, so check for g.id
            if (g && g.id) {

                const video = guestVideoElements.get(g.id);
                if (video) {
                    nextVideos[slotKey] = video;
                }
            }
        });

        // If guest, ensure host video is mapped
        const hostVideo = guestVideoElements.get('host');
        if (hostVideo) nextVideos['host'] = hostVideo;

        guestVideos.value = nextVideos;
    };

    const stopGuestSubscriber = (guestId: string) => {
        const pc = p2pConnections.get(guestId);
        if (pc) {
            pc.close();
            p2pConnections.delete(guestId);
        }
        guestStreams.delete(guestId);
        guestVideoElements.delete(guestId);
        syncGuestVideos();
    };

    const addLocalTracks = (pc: RTCPeerConnection) => {
        // 1. Audio from Microphone (localStream) - ALWAYS send audio
        if (localStream.value) {
            localStream.value.getAudioTracks().forEach(track => {
                pc.addTrack(track, localStream.value!);
            });
        }

        // 2. Video Source
        // PROGRAM FEED: If host, send the produced Canvas Stream (final composition).
        // This ensures all guests see the exact same layout/overlays as the broadcast.
        if (canvasStream && canvasStream.value) {
            console.log("[Studio P2P] Sending Program Feed (Host Mode)");
            canvasStream.value.getVideoTracks().forEach(track => {
                pc.addTrack(track, canvasStream.value!);
            });
        } else if (localStream.value) {
            console.log("[Studio P2P] Sending Camera Stream (Guest Mode)");
            localStream.value.getVideoTracks().forEach(track => {
                pc.addTrack(track, localStream.value!);
            });
        }
    };

    const initiateAsGuest = async (hostId: string) => {
        connectedHostId.value = hostId;
        if (p2pConnections.has(hostId)) {
            console.log("[Studio P2P] Connection to host already exists:", hostId);
            return;
        }
        console.log("[Studio P2P] Initiating connection to host:", hostId);

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        p2pConnections.set(hostId, pc);

        addLocalTracks(pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                ActionSyncService.sendGuestSignal(hostId, {
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            console.log("[Studio P2P] Received track from host:", event.track.kind);
            if (event.streams && event.streams[0]) {
                let hostStream = guestStreams.get('host');

                if (!hostStream) {
                    hostStream = new MediaStream();
                    guestStreams.set('host', hostStream);
                }

                if (!hostStream.getTracks().find(t => t.id === event.track.id)) {
                    hostStream.addTrack(event.track);
                    console.log(`[Studio P2P] Added ${event.track.kind} track to host stream`);
                }

                syncGuestVideos();
            }
        };

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ActionSyncService.sendGuestSignal(hostId, {
                type: 'offer',
                sdp: offer.sdp
            });
        } catch (err) {
            console.error("[Studio P2P] Failed to create offer:", err);
        }
    };

    const handleGuestSignal = async (e: any) => {
        const { from, signal } = e.detail;

        if (signal.type === 'offer') {
            const isRenegotiation = p2pConnections.has(from);
            console.log(`[Studio P2P] Received offer from: ${from} (Renegotiation: ${isRenegotiation})`);

            let pc = p2pConnections.get(from);
            if (!pc) {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
                });
                p2pConnections.set(from, pc);

                addLocalTracks(pc);

                // Forward *other* active guest streams to this new guest
                // If Host Mode (canvasStream present), ONLY forward Audio.
                // If Guest Mode (canvasStream missing), Forward Everything (though Guest usually acts as leaf).
                const shouldForwardVideo = isGuestMode?.value ? true : false;

                guestStreams.forEach((stream, guestId) => {
                    if (guestId !== from) {
                        stream.getTracks().forEach(track => {
                            if (track.kind === 'video' && !shouldForwardVideo) return;

                            // Check consistency
                            const senders = pc!.getSenders();
                            if (!senders.find(s => s.track === track)) {
                                pc!.addTrack(track, stream);
                            }
                        });
                    }
                });

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        ActionSyncService.sendGuestSignal(from, {
                            type: 'candidate',
                            candidate: event.candidate
                        });
                    }
                };

                pc.ontrack = (event) => {
                    console.log(`[Studio P2P] Received track from ${from}:`, event.track.kind);
                    if (event.streams && event.streams[0]) {
                        const incomingStream = event.streams[0];

                        // Identify stream owner
                        let targetId = 'host';
                        const matchedGuest = studioStore.liveGuests.find(g => g.streamId === incomingStream.id || g.id === from);

                        if (matchedGuest) {
                            targetId = matchedGuest.id;
                            if (matchedGuest.id === from && matchedGuest.streamId !== incomingStream.id) {
                                matchedGuest.streamId = incomingStream.id;
                                studioStore.broadcastCurrentState();
                            }
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
                        p2pConnections.forEach((otherPC, otherGuestId) => {
                            if (otherGuestId !== from) {
                                if (event.track.kind === 'video' && !shouldForwardVideo) return;
                                const senders = otherPC.getSenders();
                                if (!senders.find(s => s.track === event.track)) {
                                    otherPC.addTrack(event.track, targetStream!);
                                }
                            }
                        });
                    }
                };

                // Handle negotiation needed (Host sending offer for forwarding updates)
                pc.onnegotiationneeded = async () => {
                    try {
                        // Only renegotiate if we are stable (not already handling an offer/answer)
                        if (pc.signalingState !== 'stable') {
                            // console.log(`[Studio P2P] onnegotiationneeded skipped due to state: ${pc.signalingState}`);
                            return;
                        }

                        console.log(`[Studio P2P] Negotiation needed for ${from} - Sending updated Offer`);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        ActionSyncService.sendGuestSignal(from, {
                            type: 'offer',
                            sdp: offer.sdp
                        });
                    } catch (e) {
                        console.error("[Studio P2P] Negotiation failed:", e);
                    }
                };
            }

            try {
                // If reuse, check state
                if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
                    // Start of negotiation
                }

                // If we are reusing PC and it has 'have-local-offer', it means we tried to send them an offer?
                // Collision handling is complex. For now assume Host is boss.
                await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));

                // We might have added tracks above (forwarding). 
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                ActionSyncService.sendGuestSignal(from, {
                    type: 'answer',
                    sdp: answer.sdp
                });
            } catch (err) {
                console.error("[Studio P2P] SDP negotiation failed:", err);
            }
        } else if (signal.type === 'answer') {
            const pc = p2pConnections.get(from);
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
                } catch (err) {
                    console.error("[Studio P2P] Failed to set remote answer:", err);
                }
            }
        } else if (signal.type === 'candidate') {
            const pc = p2pConnections.get(from);
            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (err) {
                    console.error("[Studio P2P] Failed to add ICE candidate:", err);
                }
            }
        }
    };

    onMounted(() => {
        window.addEventListener('guest:signal', handleGuestSignal);
    });

    onUnmounted(() => {
        window.removeEventListener('guest:signal', handleGuestSignal);
        p2pConnections.forEach(pc => pc.close());
        p2pConnections.clear();
        guestStreams.clear();
        guestVideoElements.clear();
    });

    watch(() => canvasStream?.value, (newStream) => {
        if (newStream) {
            console.log("[Studio P2P] Canvas Stream Available - Updating Tracks");
            const newVideoTrack = newStream.getVideoTracks()[0];

            p2pConnections.forEach((pc) => {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');

                if (videoSender && newVideoTrack) {
                    videoSender.replaceTrack(newVideoTrack).catch(e => console.error("Video replace failed:", e));
                } else if (!videoSender && newVideoTrack) {
                    pc.addTrack(newVideoTrack, newStream);
                }
            });
        }
    });

    watch(() => studioStore.liveGuests, (guests) => {
        const activeIds = new Set(guests.map(g => g.id));
        for (const guestId of p2pConnections.keys()) {
            // Protected: Do not disconnect Host if we are Guest
            if (isGuestMode?.value && guestId === connectedHostId.value) continue;

            if (!activeIds.has(guestId)) {
                stopGuestSubscriber(guestId);
            }
        }
        syncGuestVideos();
    }, { deep: true, immediate: true });

    return {
        guestVideos,
        guestVideoElements, // Expose for sidebar previews
        stopGuestSubscriber,
        syncGuestVideos,
        initiateAsGuest
    };
}

