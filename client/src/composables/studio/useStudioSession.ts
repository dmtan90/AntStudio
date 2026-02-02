import { ref, watch, onUnmounted, type Ref } from 'vue';
import axios from 'axios';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user.js';
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher.js';
import { ActionSyncService } from '@/utils/ai/ActionSyncService.js';
import { useTranslations } from '@/composables/useTranslations';
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
    }
) {
    const { t } = useTranslations();
    const studioStore = useStudioStore();
    const userStore = useUserStore();

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
                        const infoRes = await axios.get(`/api/platforms/${pId}/live-info`, {
                            params: {
                                title: options.currentProject.value.title,
                                description: 'Live via AntFlow'
                            }
                        });
                        if (infoRes.data.success) {
                            acc.streamKey = infoRes.data.data.streamKey;
                            acc.rtmpUrl = infoRes.data.data.rtmpUrl;
                        }
                    }
                }

                const quality = options.qualityPresets[options.streamQuality.value];
                const res = await axios.post('/api/streaming/start', {
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

                if (res.data.success) {
                    const { sessionId, mode, amsAccount } = res.data.data;
                    currentSessionId.value = sessionId;
                    studioStore.currentSessionId = sessionId;

                    if (mode === 'webrtc_ams' && amsAccount) {
                        await initWebRTCPublisher(amsAccount);
                    } else if (mode === 'webrtc_relay') {
                        toast.info("Using Direct Backend Relay (High Performance)");
                        startRelayStream(sessionId);
                    }

                    isLive.value = true;
                    timerInterval = setInterval(() => liveTime.value++, 1000);
                    toast.success(t('studio.messages.live'));
                    return 'started';
                }
            } catch (e: any) {
                console.error(e);
                cleanupPublishers();
                toast.error(e.response?.data?.error || t('studio.messages.liveError'));
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
                await axios.post('/api/streaming/stop', { sessionId: currentSessionId.value });
                currentSessionId.value = null;
            }
        } catch (e) { }
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
            const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
            const wsHost = new URL(serverUrl).host;
            const websocketUrl = `${wsProtocol}//${wsHost}/${appName}/websocket`;
            currentWebRTCUrl.value = websocketUrl;

            const quality = options.qualityPresets[options.streamQuality.value];
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
                        fps: stats.framesEncoded > 0 ? 30 : 0
                    });
                },
                onDisconnect: () => {
                    // handleStreamDisconnect(amsAccount); 
                }
            });

            const canvasStream = outputCanvas.value!.captureStream(quality?.fps || 30);
            if (hostStream.value) hostStream.value.getAudioTracks().forEach(track => canvasStream.addTrack(track));

            await rtcPublisher.value.start(canvasStream);
            toast.success("Connection synchronized. Stream starting...");
            startHighlightBuffering(canvasStream);
        }
    };

    const startRelayStream = (sessionId: string) => {
        if (mediaRecorder.value) mediaRecorder.value.stop();

        const quality = options.qualityPresets[options.streamQuality.value];
        const canvasStream = outputCanvas.value!.captureStream(quality?.fps || 30);

        // Add host audio to the stream
        if (hostStream.value) {
            hostStream.value.getAudioTracks().forEach(track => {
                canvasStream.addTrack(track);
                console.log("[Relay] Added host audio track to ingest stream");
            });
        }

        // Use standard WebM for server compatibility
        const recorderOptions = {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: quality.video * 1000
        };

        try {
            mediaRecorder.value = new MediaRecorder(canvasStream, recorderOptions);
        } catch (e) {
            console.warn("[Relay] Preferred mimeType not supported, using default");
            mediaRecorder.value = new MediaRecorder(canvasStream);
        }

        mediaRecorder.value.ondataavailable = (e) => {
            if (e.data.size > 0) {
                ActionSyncService.sendStreamRelay(sessionId, e.data);
            }
        };

        mediaRecorder.value.start(1000); // 1s chunks
        console.log(`[Relay] MediaRecorder started for session: ${sessionId}`);
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
        cleanupPublishers();
    });

    return {
        isLive,
        isRecording,
        liveTime,
        currentSessionId,
        currentWebRTCUrl,
        toggleLive,
        stopLive
    };
}
