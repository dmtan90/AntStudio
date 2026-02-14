

export class VoiceActivityDetector {
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private microphone: MediaStreamAudioSourceNode | null = null;
    private dataArray: Uint8Array;
    private isMonitoring = false;
    private animationFrame: number | null = null;
    
    // Config
    private readonly FFT_SIZE = 512;
    private readonly SMOOTHING = 0.8;
    private readonly EMIT_INTERVAL = 200; // ms
    
    private lastEmitTime = 0;

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.FFT_SIZE;
        this.analyser.smoothingTimeConstant = this.SMOOTHING;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    async start(stream: MediaStream) {
        if (this.isMonitoring) return;
        
        await this.audioContext.resume();
        
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.analyser);
        
        this.isMonitoring = true;
        this.monitor();
        
        console.log('[VAD] Voice Activity Detection started');
    }

    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        console.log('[VAD] Stopped');
    }

    private monitor = () => {
        if (!this.isMonitoring) return;

        this.analyser.getByteFrequencyData(this.dataArray as any);
        
        // Calculate average volume level (0-255) -> normalize to 0-1
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const normalizedLevel = average / 255;

        // Emit if interval passed and level is significant or just periodic
        const now = Date.now();
        if (now - this.lastEmitTime > this.EMIT_INTERVAL) {
            this.emitLevel(normalizedLevel);
            this.lastEmitTime = now;
        }

        this.animationFrame = requestAnimationFrame(this.monitor);
    };

    private emitLevel(level: number) {
        // We need to access the main socket instance. 
        // Ideally this class emits an event that the UI consumes and then forwards to socket.
        // But for direct integration, we dispatch a custom event on window or use a callback.
        
        // Dispatch event for UI components (visualizers)
        window.dispatchEvent(new CustomEvent('vad:level', { detail: { level } }));
    }
}

export const vad = new VoiceActivityDetector();
