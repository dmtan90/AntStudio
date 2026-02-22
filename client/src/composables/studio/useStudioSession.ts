import { ref, watch, onUnmounted, type Ref } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user.js';
import { usePlatformStore } from '@/stores/platform';
import { useStreamingStore } from '@/stores/streaming';
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher.js';
import { ActionSyncService } from '@/utils/ai/ActionSyncService.js';
import { useTranslations } from '@/composables/useTranslations';
import { audioMixerService } from '@/utils/ai/AudioMixerService';
import { toast } from 'vue-sonner';

export function useStudioSession(
    outputCanvas: Ref<HTMLCanvasElement | null>,
    hostStream: Ref<MediaStream | null>,
    options: {
        streamQuality: Ref<string>;
        currentProject: Ref<{ title: string }>;
        selectedPlatforms: Ref<string[]>;
        availableAccounts: Ref<any[]>;
        networkStats: Ref<any>;
        qualityPresets: any;
        resizeCanvas?: (width: number, height: number) => void;
    }
) {
    const { t } = useTranslations();
    const studioStore = useStudioStore();
    const userStore = useUserStore();
    const platformStore = usePlatformStore();
    const streamingStore = useStreamingStore();

    const isLive = ref(false);
    const isRecording = ref(false);
    const liveTime = ref(0);
    const currentSessionId = ref<string | null>(null);
    const currentWebRTCUrl = ref<string | null>(null);
    const rtcPublisher = ref<WebRTCPublisher | null>(null);
    const mediaRecorder = ref<MediaRecorder | null>(null);
    const highlightRecorder = ref<MediaRecorder | null>(null);

    let timerInterval: any = null;
    let infraInterval: any = null;
    let relayStatsInterval: any = null;
    let bytesSentInInterval = 0;
    let lastStatsTime = 0;
    const effectiveQuality = ref('high');
    let lastQualitySwitch = 0;
    const QUALITY_SWITCH_COOLDOWN = 10000;

    watch(() => studioStore.health.bitrate, (bitrate) => {
        if (options.streamQuality.value !== 'auto' || !isLive.value) return;

        const now = Date.now();
        if (now - lastQualitySwitch < QUALITY_SWITCH_COOLDOWN) return;

        let targetQuality = effectiveQuality.value;
        // Thresholds with some hysteresis
        if (bitrate < 600) targetQuality = 'low';
        else if (bitrate < 1500) targetQuality = 'medium';
        else if (bitrate < 3000) targetQuality = 'high';
        else if (bitrate > 4500) targetQuality = 'ultra';

        if (targetQuality !== effectiveQuality.value) {
            console.log(`[ABR] Triggering switch: ${effectiveQuality.value} -> ${targetQuality} (Current Bitrate: ${bitrate}kbps)`);
            applyQualityChange(targetQuality);
            effectiveQuality.value = targetQuality;
            lastQualitySwitch = now;
        }
    });

    const applyQualityChange = async (qualityKey: string) => {
        const quality = options.qualityPresets[qualityKey];
        if (!quality || !isLive.value) return;

        console.log(`[ABR] Applying quality change: ${qualityKey} (${quality.width}x${quality.height}, ${quality.video}kbps)`);
        effectiveQuality.value = qualityKey;

        // Update Canvas Dimensions
        if (options.resizeCanvas) {
             options.resizeCanvas(quality.width, quality.height);
        } else if (outputCanvas.value) {
             // Fallback if resizeCanvas not provided (legacy behavior, but risky with worker)
            outputCanvas.value.width = quality.width;
            outputCanvas.value.height = quality.height;
        }

        // 1. Update WebRTC
        if (rtcPublisher.value) {
            await rtcPublisher.value.updateConfig({
                videoBitrate: quality.video,
                maxFramerate: quality.fps
            });
        }

        // 2. Update Relay (Restart Recorder)
        if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
            const sid = currentSessionId.value;
            if (sid) {
                console.log("[ABR] Restarting Relay Recorder for resolution/bitrate change");
                if (mediaRecorder.value) {
                    mediaRecorder.value.stop();
                    mediaRecorder.value = null;
                }
                if (relayStatsInterval) {
                    clearInterval(relayStatsInterval);
                    relayStatsInterval = null;
                }
                startRelayStream(sid);
            }
        }
    };

    watch(currentSessionId, (id) => {
        if (infraInterval) clearInterval(infraInterval);
        // if (relayStatsInterval) clearInterval(relayStatsInterval);
        studioStore.currentSessionId = id;
        if (id) {
            if (userStore.token) {
                ActionSyncService.connect(id, userStore.token);
            }
            studioStore.fetchSessionInfra(id);
            infraInterval = setInterval(() => {
                if (isLive.value) {
                    studioStore.fetchSessionInfra(id);
                } else {
                    clearInterval(infraInterval);
                }
            }, 15000);
        }
    });

    const toggleLive = async () => {
        if (!isLive.value) {
            if (options.selectedPlatforms.value.length === 0) {
                toast.error(t('studio.messages.selectPlatform'));
                return 'select_platform';
            }
            try {
                for (const pId of options.selectedPlatforms.value) {
                    const acc = options.availableAccounts.value.find(a => a._id === pId);
                    if (acc && !acc.streamKey && (acc.platform === 'youtube' || acc.platform === 'ant-media')) {
                        toast.info(`Configuring live stream for ${acc.accountName}...`);
                        const data = await platformStore.fetchLiveInfo(pId, {
                            title: options.currentProject.value.title,
                            description: 'Live via AntFlow'
                        });

                        // Store updates the account automatically, but we might need to update our local reference if it's a copy
                        // However, availableAccounts is a Ref passed in, and likely comes from store or is reactive.
                        // But just in case, fetchLiveInfo returns data which has streamKey/rtmpUrl
                        if (data) {
                            acc.streamKey = data.streamKey;
                            acc.rtmpUrl = data.rtmpUrl;
                        }
                    }
                }

                const qualityKey = options.streamQuality.value === 'auto' ? effectiveQuality.value : options.streamQuality.value;
                const quality = options.qualityPresets[qualityKey];
                
                if (!quality) {
                    console.error(`[StudioSession] Invalid quality preset: ${qualityKey}`);
                    throw new Error(`Invalid quality preset: ${qualityKey}`);
                }

                const res = await streamingStore.startStream({
                    platformAccountIds: options.selectedPlatforms.value,
                    sessionId: currentSessionId.value,
                    source: 'webrtc',
                    quality: {
                        width: quality.width,
                        height: quality.height,
                        videoBitrate: quality.video,
                        audioBitrate: quality.audio,
                        fps: quality.fps
                    }
                });

                if (res) {
                    // startStream returns res.data which corresponds to 'data' in axios response? 
                    // Let's check streaming.ts: returns res.data.
                    // And res.data usually has { success: true, data: { ... } } or just the data content?
                    // api.js usually returns response object. 
                    // streaming.ts: const res = await api.post(...) -> return res.data
                    // In previous axios call: res.data.data
                    // So here resData is likely { success: true, data: {...} } or just the object?
                    // Wait, api.js usually returns the axios response.
                    // streaming.ts says `return res.data`.
                    // So resData IS the body.

                    const { sessionId, mode, amsAccount } = res.data || res; // Handle potential wrapping

                    currentSessionId.value = sessionId;
                    studioStore.currentSessionId = sessionId;

                    console.log(`[StudioSession] Stream started. SessionID: ${sessionId}, Mode: ${mode}`);
                    
                    if (mode === 'webrtc_ams' && amsAccount) {
                        console.log("[StudioSession] Initializing WebRTC AMS Publisher");
                        await initWebRTCPublisher(amsAccount);
                    } else if (mode === 'webrtc_relay') {
                        console.log("[StudioSession] Initializing WebRTC Relay");
                        toast.info("Using Direct Backend Relay (High Performance)");
                        startRelayStream(sessionId);
                    } else {
                        console.warn("[StudioSession] Unknown or unsupported mode:", mode);
                    }

                    isLive.value = true;
                    timerInterval = setInterval(() => liveTime.value++, 1000);
                    toast.success(t('studio.messages.live'));
                    return 'started';
                }
            } catch (e: any) {
                console.error(e);
                cleanupPublishers();
                // Error toast handled in store mostly, but fallback:
                // toast.error(e.response?.data?.error || t('studio.messages.liveError'));
            }
        } else {
            stopLive();
        }
        return null;
    };

    const stopLive = async () => {
        isLive.value = false;
        clearInterval(timerInterval);
        toast.info(t('studio.messages.stopped'));
        cleanupPublishers();

        try {
            if (currentSessionId.value) {
                await streamingStore.stopStream(currentSessionId.value);
                currentSessionId.value = null;
            }
        } catch (e) { }

        if (relayStatsInterval) {
            clearInterval(relayStatsInterval);
            relayStatsInterval = null;
        }
    };

    const cleanupPublishers = () => {
        if (rtcPublisher.value) {
            rtcPublisher.value.stop();
            rtcPublisher.value = null;
        }
        if (highlightRecorder.value) {
            highlightRecorder.value.stop();
            highlightRecorder.value = null;
        }
        if (mediaRecorder.value) {
            mediaRecorder.value.stop();
            mediaRecorder.value = null;
        }
    };

    const initWebRTCPublisher = async (amsAccount: any) => {
        const serverUrl = amsAccount.credentials.serverUrl;
        const appName = amsAccount.credentials.appName || 'WebRTCAppEE';
        const streamId = amsAccount.streamKey;

        if (serverUrl && streamId) {
			console.log("serverUrl", serverUrl);
            const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
            const wsHost = new URL(serverUrl).host;
            const websocketUrl = `${wsProtocol}//${wsHost}/${appName}/websocket`;
            currentWebRTCUrl.value = websocketUrl;

            const qualityKey = options.streamQuality.value === 'auto' ? effectiveQuality.value : options.streamQuality.value;
            const quality = options.qualityPresets[qualityKey];
            rtcPublisher.value = new WebRTCPublisher({
                websocketUrl,
                streamId,
                videoBitrate: quality?.video,
                audioBitrate: quality?.audio,
                maxFramerate: quality?.fps,
                onStats: (stats) => {
					console.log("[useStudioSession] Received WebRTC stats:", stats);
                    options.networkStats.value = stats;
                    studioStore.updateHealth({
                        bitrate: stats.bitrate,
                        rtt: stats.rtt,
                        packetLoss: stats.packetsLost || 0,
                        fps: stats.fps || 0
                    });
                },
                onDisconnect: () => {
                    // handleStreamDisconnect(amsAccount); 
                }
            });

            const canvasStream = outputCanvas.value!.captureStream(quality?.fps || 30);
            
            // Add host audio to the stream
            // if (hostStream.value) {
            //     hostStream.value.getAudioTracks().forEach(track => {
            //         canvasStream.addTrack(track);
            //         console.log("[WebRTC] Added host audio track to broadcast stream");
            //     });
            // }

            // Add mixed audio (Music + VTubers) to the stream
            const mixedAudioStream = audioMixerService.getDestinationStream();
            if (mixedAudioStream) {
                mixedAudioStream.getAudioTracks().forEach(track => {
                    canvasStream.addTrack(track);
                    console.log("[WebRTC] Attached mixed audio track to broadcast stream");
                });
            }

            await rtcPublisher.value.start(canvasStream);
            toast.success("Connection synchronized. Stream starting...");
            startHighlightBuffering(canvasStream);
        }
    };

    const startRelayStream = (sessionId: string) => {
        if (mediaRecorder.value) mediaRecorder.value.stop();

        const qualityKey = options.streamQuality.value === 'auto' ? effectiveQuality.value : options.streamQuality.value;
        const quality = options.qualityPresets[qualityKey];
        const canvasStream = outputCanvas.value!.captureStream(quality?.fps || 30);

        // Add host audio to the stream
        // if (hostStream.value) {
        //     hostStream.value.getAudioTracks().forEach(track => {
        //         canvasStream.addTrack(track);
        //         console.log("[Relay] Added host audio track to ingest stream");
        //     });
        // }

        // Add mixed audio to the stream
        const mixedAudioStream = audioMixerService.getDestinationStream();
        if (mixedAudioStream) {
            mixedAudioStream.getAudioTracks().forEach(track => {
                canvasStream.addTrack(track);
                console.log("[Relay] Added mixed audio track to ingest stream");
            });
        }

        // Use standard WebM with H.264 for server compatibility and performance
        // This allows the backend to use '-vcodec copy' reducing CPU load
        const recorderOptions = {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=h264') 
                ? 'video/webm;codecs=h264' 
                : 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: quality.video * 1000
        };

        try {
            mediaRecorder.value = new MediaRecorder(canvasStream, recorderOptions);
            console.log(`[Relay] Started MediaRecorder with mimeType: ${mediaRecorder.value.mimeType}`);
        } catch (e) {
            console.warn("[Relay] Preferred mimeType not supported, using default");
            mediaRecorder.value = new MediaRecorder(canvasStream);
        }

        mediaRecorder.value.ondataavailable = (e) => {
            if (e.data.size > 0) {
                ActionSyncService.sendStreamRelay(sessionId, e.data);
                bytesSentInInterval += e.data.size;
            }
        };

        // Start stats interval for relay
        lastStatsTime = Date.now();
        bytesSentInInterval = 0;
        relayStatsInterval = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastStatsTime) / 1000; // seconds
            if (deltaTime > 0) {
                const bitrateKbps = Math.round((bytesSentInInterval * 8) / (deltaTime * 1000));
                const latency = ActionSyncService.getLatency();

                console.log(`[Relay Stats] Bitrate: ${bitrateKbps} kbps, RTT: ${latency}ms`);
                
                options.networkStats.value = {
                    bitrate: bitrateKbps,
                    timestamp: now,
                    mode: 'relay',
                    latency
                };

                studioStore.updateHealth({
                    bitrate: bitrateKbps,
                    fps: quality?.fps || 30, // Fallback to preset FPS if real mapping is unavailable
                    rtt: latency, // Use real socket latency for relay RTT
                    packetLoss: 0
                });
            }
			lastStatsTime = now;
			bytesSentInInterval = 0;
        }, 2000);

        // Start with a small timeslice to force the header chunk out immediately
        mediaRecorder.value.start(100); 
        console.log(`[Relay] MediaRecorder started for session: ${sessionId} (100ms slice)`);
    };

    const startHighlightBuffering = (canvasStream: MediaStream) => {
        if (highlightRecorder.value) highlightRecorder.value.stop();
        const opts = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1000000 };
        highlightRecorder.value = new MediaRecorder(canvasStream, opts);
        highlightRecorder.value.ondataavailable = (e) => {
            if (e.data.size > 0) {
                studioStore.appendHighlightChunk(e.data);
            }
        };
        highlightRecorder.value.start(1000); // 1s chunks
    };

    onUnmounted(() => {
        clearInterval(timerInterval);
        clearInterval(infraInterval);
        if (relayStatsInterval) clearInterval(relayStatsInterval);
        cleanupPublishers();
    });

    return {
        isLive,
        isRecording,
        liveTime,
        currentSessionId,
        currentWebRTCUrl,
        effectiveQuality,
        toggleLive,
        stopLive
    };
}
