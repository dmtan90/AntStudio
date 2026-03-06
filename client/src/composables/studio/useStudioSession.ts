import { ref, watch, onUnmounted, type Ref } from 'vue';
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
    const { t } = useI18n()
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
    const relayEncoder = ref<RelayEncoder | null>(null);
    const abr = new ABRStateMachine();

    let timerInterval: any = null;
    let infraInterval: any = null;

    watch(() => studioStore.health.bitrate, (bitrate) => {
        if (options.streamQuality.value !== 'auto' || !isLive.value) return;

        const targetQuality = abr.determineQuality(bitrate);
        if (targetQuality) {
            console.log(`[ABR] Triggering switch: ${abr.currentQuality} (Current Bitrate: ${bitrate}kbps)`);
            applyQualityChange(targetQuality);
        }
    });

    const applyQualityChange = async (qualityKey: string) => {
        const quality = options.qualityPresets[qualityKey];
        if (!quality || !isLive.value) return;

        console.log(`[ABR] Applying quality change: ${qualityKey} (${quality.width}x${quality.height}, ${quality.video}kbps)`);

        if (options.resizeCanvas) {
             options.resizeCanvas(quality.width, quality.height);
        } else if (outputCanvas.value) {
            outputCanvas.value.width = quality.width;
            outputCanvas.value.height = quality.height;
        }

        if (rtcPublisher.value) {
            await rtcPublisher.value.updateConfig({
                videoBitrate: quality.video,
                maxFramerate: quality.fps
            });
        }

        if (relayEncoder.value && relayEncoder.value.isRecording()) {
            const sid = currentSessionId.value;
            if (sid && outputCanvas.value) {
                console.log("[ABR] Restarting Relay Recorder for resolution/bitrate change");
                const canvasStream = outputCanvas.value.captureStream(quality.fps);
                relayEncoder.value.startRelayStream(canvasStream, quality);
            }
        }
    };

    watch(currentSessionId, (id) => {
        if (infraInterval) clearInterval(infraInterval);
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
                            description: 'Live via AntStudio'
                        });

                        if (data) {
                            acc.streamKey = data.streamKey;
                            acc.rtmpUrl = data.rtmpUrl;
                        }
                    }
                }

                const qualityKey = options.streamQuality.value === 'auto' ? abr.currentQuality : options.streamQuality.value;
                const quality = options.qualityPresets[qualityKey];
                
                if (!quality) {
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
                    const { sessionId, mode, amsAccount } = res.data || res;

                    currentSessionId.value = sessionId;
                    studioStore.currentSessionId = sessionId;

                    console.log(`[StudioSession] Stream started. SessionID: ${sessionId}, Mode: ${mode}`);
                    
                    if (mode === 'webrtc_ams' && amsAccount) {
                        console.log("[StudioSession] Initializing WebRTC AMS Publisher");
                        await initWebRTCPublisher(amsAccount);
                    } else if (mode === 'webrtc_relay') {
                        console.log("[StudioSession] Initializing WebRTC Relay");
                        toast.info("Using Direct Backend Relay (High Performance)");
                        
                        relayEncoder.value = new RelayEncoder(sessionId, (stats, latency, fps) => {
                            options.networkStats.value = stats;
                            studioStore.updateHealth({
                                bitrate: stats.bitrate,
                                fps: fps,
                                rtt: latency,
                                packetLoss: 0
                            });
                        }, studioStore);
                        
                        if (outputCanvas.value) {
                            const canvasStream = outputCanvas.value.captureStream(quality.fps);
                            relayEncoder.value.startRelayStream(canvasStream, quality);
                        }
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

    const initWebRTCPublisher = async (amsAccount: any) => {
        const serverUrl = amsAccount.credentials.serverUrl;
        const appName = amsAccount.credentials.appName || 'WebRTCAppEE';
        const streamId = amsAccount.streamKey;

        if (serverUrl && streamId) {
            const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
            const wsHost = new URL(serverUrl).host;
            const websocketUrl = `${wsProtocol}//${wsHost}/${appName}/websocket`;
            currentWebRTCUrl.value = websocketUrl;

            const qualityKey = options.streamQuality.value === 'auto' ? abr.currentQuality : options.streamQuality.value;
            const quality = options.qualityPresets[qualityKey];
            
            rtcPublisher.value = new WebRTCPublisher({
                websocketUrl,
                streamId,
                videoBitrate: quality?.video,
                audioBitrate: quality?.audio,
                maxFramerate: quality?.fps,
                onStats: (stats) => {
                    options.networkStats.value = stats;
                    studioStore.updateHealth({
                        bitrate: stats.bitrate,
                        rtt: stats.rtt,
                        packetLoss: stats.packetsLost || 0,
                        fps: stats.fps || 0
                    });
                },
                onDisconnect: () => {}
            });

            if (outputCanvas.value) {
                const canvasStream = outputCanvas.value.captureStream(quality?.fps || 30);
                
                const mixedAudioStream = audioMixerService.getDestinationStream();
                if (mixedAudioStream) {
                    mixedAudioStream.getAudioTracks().forEach(track => {
                        canvasStream.addTrack(track);
                        console.log("[WebRTC] Attached mixed audio track to broadcast stream");
                    });
                }

                await rtcPublisher.value.start(canvasStream);
                toast.success("Connection synchronized. Stream starting...");
                
                // Highlight buffering could be injected directly here using RelayEncoder
                const tempEncoder = new RelayEncoder(streamId, () => {}, studioStore);
                tempEncoder.startHighlightBuffering(canvasStream);
                // Keep reference so we can stop it later
                if (!relayEncoder.value) relayEncoder.value = tempEncoder;
            }
        }
    };

    onUnmounted(() => {
        clearInterval(timerInterval);
        clearInterval(infraInterval);
        cleanupPublishers();
    });

    return {
        isLive,
        isRecording,
        liveTime,
        currentSessionId,
        currentWebRTCUrl,
        effectiveQuality: ref(abr.currentQuality),
        toggleLive,
        stopLive
    };
}
