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
    const lastPlayTime = new Map<string, number>();
    const guestVideos = ref<Record<string, HTMLVideoElement>>({});
    const connectedHostId = ref<string | null>(null);

    const syncGuestVideos = () => {
        const now = Date.now();
        const playVideo = (v: HTMLVideoElement, guestId: string) => {
            const last = lastPlayTime.get(guestId) || 0;
            
            // If already playing and has video data, don't re-trigger
            if (!v.paused && v.readyState >= 2 && v.videoWidth > 0) return;

            // If ready, play immediately
            if (v.readyState >= 2) {
                if (now - last > 500) {
                    lastPlayTime.set(guestId, now);
                    v.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn(`[Studio P2P] Play failed for ${guestId}:`, e);
                    });
                }
            } else {
                // Not ready yet — always re-register handler since srcObject may have changed
                v.onloadedmetadata = () => {
                    v.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn(`[Studio P2P] Late play failed for ${guestId}:`, e);
                    });
                };
                // Also cover onscanstart for streams that skip loadedmetadata
                if (!v.oncanplay) {
                    v.oncanplay = () => {
                        if (v.paused) v.play().catch(() => {});
                    };
                }
            }
        };

        // For Guests: ensure our own camera is available in the video map for previews
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
                    video.muted = true; // Mute hidden source to bypass autoplay policy
                    guestVideoElements.set(g.uuid, video);
                } else if (video.srcObject !== stream || (stream.getTracks().length > 0 && !video.paused && video.readyState < 2)) {
                    // Stream object changed or tracks replaced (forcing re-assignment refreshes the pipeline)
                    video.srcObject = null; // Clear first to ensure a fresh start
                    video.srcObject = stream;
                    video.onloadedmetadata = null; // reset so playVideo re-registers
                    video.oncanplay = null;
                }
                playVideo(video, g.uuid);
            }
        });

        // Special handling for Host stream (incoming to Guest)
        const hostStream = guestStreams.get('host');
        if (hostStream) {
            let hostVideo = guestVideoElements.get('host');
            if (!hostVideo) {
                hostVideo = document.createElement('video');
                hostVideo.id = 'host';
                hostVideo.autoplay = true;
                hostVideo.playsInline = true;
                hostVideo.srcObject = hostStream;
                hostVideo.muted = true; // Mute hidden source to bypass autoplay policy
                guestVideoElements.set('host', hostVideo);
            } else if (hostVideo.srcObject !== hostStream) {
                hostVideo.srcObject = hostStream;
                hostVideo.onloadedmetadata = null;
                hostVideo.oncanplay = null;
            }
            playVideo(hostVideo, 'host');
        }

        const nextVideos: Record<string, HTMLVideoElement> = {};

        // 1. Map by Slot (e.g. guest1, guest2)
        Object.entries(studioStore.guestSlotMap).forEach(([slotKey, g]: [string, any]) => {
            if (g && g.id) {
                const video = guestVideoElements.get(g.id);
                if (video) {
                    nextVideos[slotKey] = video;
                }
            }
        });

        // 2. Map by Direct ID (Critical for Synthetic Guests & Canvas Lookup)
        guestVideoElements.forEach((video, id) => {
            nextVideos[id] = video;
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
                        const matchedGuest = studioStore.liveGuests.find(g => g.streamId === incomingStream.id || g.uuid === from);

                        if (matchedGuest) {
                            targetId = matchedGuest.uuid;
                            if (matchedGuest.uuid === from && matchedGuest.streamId !== incomingStream.id) {
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
                    console.warn(`[Studio P2P] Cannot set remote answer in state: ${pc.signalingState}`);
                    return;
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
        const activeIds = new Set(guests.map(g => g.uuid));
        for (const guestId of p2pConnections.keys()) {
            // Protected: Do not disconnect Host if we are Guest
            if (isGuestMode?.value && guestId === connectedHostId.value) continue;

            if (!activeIds.has(guestId)) {
                stopGuestSubscriber(guestId);
            }
        }
        syncGuestVideos();
    }, { deep: true, immediate: true });

    const addSyntheticGuest = (uuid: string, stream: MediaStream) => {
        console.log(`[Studio P2P] Adding synthetic guest stream: ${uuid}`);
        
        // Register with UUID (primary identifier)
        guestStreams.set(uuid, stream);
        
        // ALSO register by slot ID for rendering compatibility
        // The rendering worker currently expects slot-based lookups (guest1, guest2, etc.)
        const guest = studioStore.liveGuests.find(g => g.uuid === uuid);
        if (guest && guest.slotIndex !== undefined) {
            const slotId = `guest${guest.slotIndex + 1}`;
            console.log(`[Studio P2P] Mapping guest ${uuid} to slot ${slotId}`);
            guestStreams.set(slotId, stream);
        }
        
        // Create video element with UUID key
        let video = guestVideoElements.get(uuid);
        if (!video) {
            video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true; // Synthetic guests are mixed via audio context, so mute video elem to avoid echo? 
                                // Actually we probably want it muted here and handle audio blending separately or 
                                // rely on the stream's track. If it's from captureStream of canvas, it might not have audio yet.
                                // But VirtualGuest logic handles audio.
            video.srcObject = stream;
            guestVideoElements.set(uuid, video);
            video.play().catch(e => console.warn("[Studio P2P] Synthetic video play failed:", e));
        } else {
            video.srcObject = stream;
            video.play();
        }
        
        // Also register video element with slot ID for rendering
        if (guest && guest.slotIndex !== undefined) {
            const slotId = `guest${guest.slotIndex + 1}`;
            if (slotId !== uuid) {
                guestVideoElements.set(slotId, video); // Reuse same video element
            }
        }

        // Force a sync to update the reactive guestVideos ref
        syncGuestVideos();
    };

    return {
        guestVideos,
        guestVideoElements, // Expose for sidebar previews
        stopGuestSubscriber,
        syncGuestVideos,
        initiateAsGuest,
        addSyntheticGuest
    };
}

