import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { audioMixerService } from '@/utils/ai/AudioMixerService';

export class RelayEncoder {
    private mediaRecorder: MediaRecorder | null = null;
    private highlightRecorder: MediaRecorder | null = null;
    private relayStatsInterval: any = null;
    private bytesSentInInterval = 0;
    private lastStatsTime = 0;

    constructor(
        private sessionId: string,
        private onNetworkStats: (stats: any, latency: number, fps: number) => void,
        private store: any // reference to studio store for highlights
    ) {}

    public startRelayStream(canvasStream: MediaStream, quality: any) {
        this.stop();

        // Add mixed audio to the stream
        const mixedAudioStream = audioMixerService.getDestinationStream();
        if (mixedAudioStream) {
            mixedAudioStream.getAudioTracks().forEach(track => {
                if (!canvasStream.getAudioTracks().find(t => t.id === track.id)) {
                    canvasStream.addTrack(track);
                    console.log("[RelayEncoder] Added mixed audio track to ingest stream");
                }
            });
        }

        const recorderOptions = {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=h264') 
                ? 'video/webm;codecs=h264' 
                : 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: quality.video * 1000
        };

        try {
            this.mediaRecorder = new MediaRecorder(canvasStream, recorderOptions);
            console.log(`[RelayEncoder] Started MediaRecorder with mimeType: ${this.mediaRecorder.mimeType}`);
        } catch (e) {
            console.warn("[RelayEncoder] Preferred mimeType not supported, using default");
            this.mediaRecorder = new MediaRecorder(canvasStream);
        }

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                ActionSyncService.sendStreamRelay(this.sessionId, e.data);
                this.bytesSentInInterval += e.data.size;
            }
        };

        this.lastStatsTime = Date.now();
        this.bytesSentInInterval = 0;
        
        this.relayStatsInterval = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - this.lastStatsTime) / 1000;
            if (deltaTime > 0) {
                const bitrateKbps = Math.round((this.bytesSentInInterval * 8) / (deltaTime * 1000));
                const latency = ActionSyncService.getLatency();
                
                this.onNetworkStats({
                    bitrate: bitrateKbps,
                    timestamp: now,
                    mode: 'relay',
                    latency
                }, latency, quality?.fps || 30);
            }
            this.lastStatsTime = now;
            this.bytesSentInInterval = 0;
        }, 2000);

        this.mediaRecorder.start(100);
    }

    public startHighlightBuffering(canvasStream: MediaStream) {
        if (this.highlightRecorder) this.highlightRecorder.stop();
        const opts = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1000000 };
        try {
            this.highlightRecorder = new MediaRecorder(canvasStream, opts);
            this.highlightRecorder.ondataavailable = (e) => {
                if (e.data.size > 0 && this.store?.appendHighlightChunk) {
                    this.store.appendHighlightChunk(e.data);
                }
            };
            this.highlightRecorder.start(1000); 
        } catch (e) {
            console.warn("[RelayEncoder] Highlight buffering failed:", e);
        }
    }

    public stop() {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
        if (this.highlightRecorder) {
            this.highlightRecorder.stop();
            this.highlightRecorder = null;
        }
        if (this.relayStatsInterval) {
            clearInterval(this.relayStatsInterval);
            this.relayStatsInterval = null;
        }
    }

    public isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }
}
