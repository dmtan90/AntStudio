import { ref } from 'vue';

export interface CaptionWord {
    text: string;
    start: number;
    end: number;
}

export interface CaptionLine {
    id: string;
    text: string;
    words: CaptionWord[];
    startTime: number;
    endTime: number;
}

export class LiveCaptionService {
    private static isCapturing = false;
    private static audioContext: AudioContext | null = null;
    private static processor: ScriptProcessorNode | null = null;
    private static stream: MediaStream | null = null;
    
    public static currentCaption = ref<CaptionLine | null>(null);

    /**
     * Starts capturing audio and generating live captions.
     * In a production environment, this would use a WebSocket stream to Whisper/Gemini.
     */
    public static async start(mediaStream: MediaStream) {
        if (this.isCapturing) return;
        this.isCapturing = true;
        this.stream = mediaStream;

        console.log('[LiveCaption] Starting audio capture for subtitles...');

        try {
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(mediaStream);
            
            // Note: Modern implementations use AudioWorklet, but ScriptProcessor is 
            // used here for simplicity in this advanced prototype shim.
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.processor.onaudioprocess = (e) => {
                // Here we would send audio buffers to the server via WebSocket
                // For the purpose of this demonstration, we simulate transcription
                // triggered by significant audio volume.
            };

            // Hook into window events from STT if available
            window.addEventListener('ai:transcription', (e: any) => {
                const { text, words, startTime, endTime } = e.detail;
                this.updateCaption(text, words, startTime, endTime);
            });

        } catch (error) {
            console.error('[LiveCaption] Failed to initialize:', error);
            this.isCapturing = false;
        }
    }

    public static stop() {
        this.isCapturing = false;
        this.processor?.disconnect();
        this.audioContext?.close();
        this.stream = null;
        this.currentCaption.value = null;
        console.log('[LiveCaption] Stopped.');
    }

    public static updateCaption(text: string, words: CaptionWord[], startTime: number, endTime: number) {
        this.currentCaption.value = {
            id: `cap_${Date.now()}`,
            text,
            words,
            startTime,
            endTime
        };

        // Emit for the render worker
        window.dispatchEvent(new CustomEvent('show:caption_update', { 
            detail: this.currentCaption.value 
        }));
    }
}
