import { ref, watch, onUnmounted, type Ref, unref } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user.js';
import { usePlatformStore } from '@/stores/platform';
import { useStreamingStore } from '@/stores/streaming';
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher.js';
import { ActionSyncService } from '@/utils/ai/ActionSyncService.js';
import { useI18n } from 'vue-i18n';
import { audioMixerService } from '@/utils/ai/AudioMixerService';
import { toast } from 'vue-sonner';
import { RelayEncoder } from './services/RelayEncoder';
import { ABRStateMachine } from './services/ABRStateMachine';

/**
 * useStudioSession
 * Greenfield, client-driven live state and stream pushing controller.
 * Binds stream drop events directly to freezing voice loops to save API costs.
 */
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
        onConnectionDrop?: () => void; // Custom hook for FSM Coupling
        onConnectionRestore?: () => void; // Custom hook for FSM Resume
        ensureWebSocketsConnected?: () => Promise<boolean>;
        autonomousMode?: Ref<boolean>;
        influencerId?: Ref<string | null | undefined>;
        productIds?: Ref<string[]>;
    }
) {
    const { t } = useI18n();
    const studioStore = useStudioStore();
    const userStore = useUserStore();
    const platformStore = usePlatformStore();
    const streamingStore = useStreamingStore();

    const isLive = ref(false);
    const isReconnecting = ref(false);
    const reconnectAttempt = ref(0);
    const liveTime = ref(0);
    const currentSessionId = ref<string | null>(null);
    const currentWebRTCUrl = ref<string | null>(null);
    const rtcPublisher = ref<WebRTCPublisher | null>(null);
    const relayEncoder = ref<RelayEncoder | null>(null);
    const abr = new ABRStateMachine();

    let timerInterval: any = null;
    let infraInterval: any = null;
    let reconnectTimerInterval: any = null;

    const startReconnectionRoutine = () => {
        if (!isLive.value || isReconnecting.value) return;

        console.warn("⚠️ [StudioSession] Connection loss detected during live stream! Entering PAUSED RECONNECTING mode...");
        isReconnecting.value = true;
        reconnectAttempt.value = 1;

        // 1. Pause Live Timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // 2. Pause FSM Storyboard Loop (don't kill live session)
        if (options.onConnectionDrop) {
            options.onConnectionDrop();
        }

        toast.warning("⚠️ Server connection lost! Pausing stream and auto-reconnecting...", { duration: 5000 });

        // 3. Start auto-retry reconnection interval loop
        if (reconnectTimerInterval) clearInterval(reconnectTimerInterval);

        reconnectTimerInterval = setInterval(async () => {
            reconnectAttempt.value++;
            console.log(`🔄 [StudioSession] Auto-reconnecting Server & WebSockets (Attempt ${reconnectAttempt.value}/30)...`);

            if (reconnectAttempt.value > 30) {
                console.error("❌ [StudioSession] Max reconnection attempts reached. Stopping live stream.");
                clearInterval(reconnectTimerInterval);
                reconnectTimerInterval = null;
                isReconnecting.value = false;
                toast.error("❌ Unable to reconnect to server after 30 attempts. Livestream stopped.");
                stopLive();
                return;
            }

            try {
                // A. Health check backend server endpoint
                const domain = window.location.origin;
                const healthRes = await fetch(`${domain}/api/health`, { method: 'GET' }).catch(() => null);
                if (!healthRes || !healthRes.ok) {
                    console.warn(`[StudioSession] Server ${domain}/api/health unreachable on attempt ${reconnectAttempt.value}`);
                    return;
                }

                console.log("✅ [StudioSession] Server backend health check passed! Re-establishing WebSockets...");

                // B. Reconnect ActionSyncService (/socket-io)
                if (currentSessionId.value) {
                    ActionSyncService.connect(currentSessionId.value, userStore.token || undefined);
                }

                // C. Re-verify & re-sync WebSocket connections
                if (options.ensureWebSocketsConnected) {
                    const wsOk = await options.ensureWebSocketsConnected();
                    if (!wsOk) return;
                }

                // D. Re-initialize RelayEncoder / WebRTC stream
                const qualityKey = options.streamQuality.value === 'auto' ? abr.currentQuality : options.streamQuality.value;
                const presets = unref(options.qualityPresets);
                const quality = presets[qualityKey] || presets.medium;

                const startPayload: any = {
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
                };
                await streamingStore.startStream(startPayload).catch(() => null);

                if (relayEncoder.value && outputCanvas.value) {
                    const canvasStream = outputCanvas.value.captureStream(quality.fps || 30);
                    relayEncoder.value.startRelayStream(canvasStream, quality);
                }

                // E. RECONNECTION SUCCESSFUL! Resume Streaming!
                console.log("🎉 [StudioSession] Reconnection successful! Resuming Live Stream...");
                clearInterval(reconnectTimerInterval);
                reconnectTimerInterval = null;

                isReconnecting.value = false;

                // Resume timer
                timerInterval = setInterval(() => {
                    liveTime.value++;
                    studioStore.liveTime = liveTime.value;
                }, 1000);

                // Resume FSM loop
                if (options.onConnectionRestore) {
                    options.onConnectionRestore();
                }

                toast.success("✅ Server connection restored! Resuming livestream...", { duration: 5000 });

            } catch (err: any) {
                console.warn(`[StudioSession] Reconnection attempt ${reconnectAttempt.value} failed:`, err.message);
            }
        }, 3000);
    };

    const handleConnectionDrop = () => {
        if (!isLive.value) return;
        startReconnectionRoutine();
    };

    const handleStreamError = (e: any) => {
        const payload = e.detail;
        console.error('[StudioSession] Stream error received:', payload);
        if (isLive.value) {
            handleConnectionDrop();
        }
    };

    const handleStreamStopped = (e: any) => {
        const payload = e.detail;
        console.warn('[StudioSession] Stream stopped by server:', payload);
        if (isLive.value) {
            toast.error(payload?.reason || "Stream stopped by server.");
            stopLive();
        }
    };

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
                        toast.info(`Configuring Stream for ${acc.accountName}...`);
                        const data = await platformStore.fetchLiveInfo(pId, {
                            title: options.currentProject.value.title,
                            description: 'Live via AntStudio Autonomous Engine'
                        });
                        if (data) {
                            acc.streamKey = data.streamKey;
                            acc.rtmpUrl = data.rtmpUrl;
                        }
                    }
                }

                const qualityKey = options.streamQuality.value === 'auto' ? abr.currentQuality : options.streamQuality.value;
                const presets = unref(options.qualityPresets);
                const quality = presets[qualityKey] || presets.medium;

                const startPayload: any = {
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
                };

                const rawProductIds = options.productIds?.value?.length 
                    ? options.productIds.value 
                    : (studioStore.featuredProducts?.length 
                        ? studioStore.featuredProducts.map((p: any) => p._id || p.id) 
                        : studioStore.liveProducts.map((p: any) => p._id || p.id));
                const productIds = Array.from(new Set(rawProductIds));
                console.log("[StudioSession] Start Stream with selected products:", productIds);
                startPayload.productIds = productIds;

                if (options.autonomousMode?.value) {
                    startPayload.influencerId = options.influencerId?.value;
                    startPayload.language = studioStore.visualSettings?.language;
                    startPayload.autonomousMode = true;
                    console.log(`[StudioSession] Triggering Autonomous FSM Mode. Influencer: ${startPayload.influencerId}, Products:`, startPayload.productIds, `Language: ${startPayload.language}`);
                }

                const res = await streamingStore.startStream(startPayload);

                if (res) {
                    const { sessionId, mode, amsAccount } = res.data || res;
                    currentSessionId.value = sessionId;
                    studioStore.currentSessionId = sessionId;

                    if (mode === 'webrtc_ams' && amsAccount) {
                        await initWebRTCPublisher(amsAccount, quality);
                    } else {
                        // WebRTC Relay model fallback
                        relayEncoder.value = new RelayEncoder(sessionId, (stats, latency, fps) => {
                            options.networkStats.value = stats;
                            studioStore.updateHealth({
                                bitrate: stats.bitrate,
                                fps: fps,
                                rtt: latency,
                                packetLoss: 0
                            });
                        }, studioStore);
                    }

                    // CRITICAL: Connect ActionSyncService to stream sessionId for all session modes
                    console.log(`[StudioSession] Connecting ActionSyncService to session ${sessionId}`);
                    ActionSyncService.connect(sessionId, userStore.token);

                    if (mode !== 'webrtc_ams' && outputCanvas.value) {
                        const canvasStream = outputCanvas.value.captureStream(quality.fps);
                        // Delay start by 1 second to allow socket handshake to complete
                        setTimeout(() => {
                            if (relayEncoder.value) {
                                relayEncoder.value.startRelayStream(canvasStream, quality);
                                console.log(`[StudioSession] RelayEncoder started for session ${sessionId}`);
                            }
                        }, 1000);
                    }

                    isLive.value = true;
                    studioStore.isLive = true;
                    timerInterval = setInterval(() => {
                        liveTime.value++;
                        studioStore.liveTime = liveTime.value;
                    }, 1000);
                    
                    toast.success("Autonomous Livestream is Live!");
                    return 'started';
                }
                else{
                    toast.error("Stream start failed!");    
                }
            } catch (e: any) {
                console.error("Stream start failed:", e);
                toast.error("Stream start failed:" + e.message);
                cleanupPublishers();
            }
        } else {
            stopLive();
        }
        return null;
    };

    const stopLive = async () => {
        isLive.value = false;
        isReconnecting.value = false;
        studioStore.isLive = false;
        if (reconnectTimerInterval) {
            clearInterval(reconnectTimerInterval);
            reconnectTimerInterval = null;
        }
        clearInterval(timerInterval);
        cleanupPublishers();

        try {
            if (currentSessionId.value) {
                await streamingStore.stopStream(currentSessionId.value);
                currentSessionId.value = null;
            }
        } catch (e) {}
        
        toast.info("Autonomous Livestream Stopped.");
    };

    const cleanupPublishers = () => {
        if (rtcPublisher.value) {
            rtcPublisher.value.stop();
            rtcPublisher.value = null;
        }
        if (relayEncoder.value) {
            relayEncoder.value.stop();
            relayEncoder.value = null;
        }
    };

    const initWebRTCPublisher = async (amsAccount: any, quality: any) => {
        const serverUrl = amsAccount.credentials.serverUrl;
        const appName = amsAccount.credentials.appName || 'WebRTCAppEE';
        const streamId = amsAccount.streamKey;

        if (serverUrl && streamId) {
            const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
            const wsHost = new URL(serverUrl).host;
            const websocketUrl = `${wsProtocol}//${wsHost}/${appName}/websocket`;
            currentWebRTCUrl.value = websocketUrl;

            rtcPublisher.value = new WebRTCPublisher({
                websocketUrl,
                streamId,
                videoBitrate: quality.video,
                audioBitrate: quality.audio,
                maxFramerate: quality.fps,
                onStats: (stats) => {
                    options.networkStats.value = stats;
                    studioStore.updateHealth({
                        bitrate: stats.bitrate,
                        rtt: stats.rtt,
                        packetLoss: stats.packetsLost || 0,
                        fps: stats.fps || 0
                    });
                },
                onDisconnect: handleConnectionDrop // Coupled directly to FSM interruption on drop
            });

            if (outputCanvas.value) {
                const canvasStream = outputCanvas.value.captureStream(quality.fps || 30);
                const mixedAudioStream = audioMixerService.getDestinationStream();
                
                if (mixedAudioStream) {
                    mixedAudioStream.getAudioTracks().forEach(track => {
                        canvasStream.addTrack(track);
                        console.log("[StudioSession] Bound mixed voice track to output canvas broadcast");
                    });
                }

                await rtcPublisher.value.start(canvasStream);
            }
        }
    };

    const handleActionSyncDisconnect = (e: any) => {
        if (isLive.value && !isReconnecting.value) {
            console.warn("⚠️ [StudioSession] ActionSync disconnect event received!", e?.detail?.reason);
            handleConnectionDrop();
        }
    };

    onUnmounted(() => {
        window.removeEventListener('stream:error', handleStreamError as EventListener);
        window.removeEventListener('stream:stopped', handleStreamStopped as EventListener);
        window.removeEventListener('actionsync:disconnect', handleActionSyncDisconnect as EventListener);
        clearInterval(timerInterval);
        clearInterval(infraInterval);
        if (reconnectTimerInterval) clearInterval(reconnectTimerInterval);
        cleanupPublishers();
    });

    // Mount listeners
    window.addEventListener('stream:error', handleStreamError as EventListener);
    window.addEventListener('stream:stopped', handleStreamStopped as EventListener);
    window.addEventListener('actionsync:disconnect', handleActionSyncDisconnect as EventListener);

    return {
        isLive,
        isReconnecting,
        reconnectAttempt,
        liveTime,
        currentSessionId,
        currentWebRTCUrl,
        toggleLive,
        stopLive
    };
}
