export class AIAudioAnalyzer {
    private ctx: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private animationId: number | null = null;

    constructor() { }

    private init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    public analyze(audioUrl: string, onLevel: (level: number) => void) {
        this.init();
        if (!this.ctx || !this.analyser) return;

        const audio = new Audio(audioUrl);
        audio.crossOrigin = 'anonymous';

        const source = this.ctx.createMediaElementSource(audio);
        source.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        audio.play();

        const loop = () => {
            if (!this.analyser || !this.dataArray) return;
            this.analyser.getByteFrequencyData(this.dataArray);

            // Calculate RMS or peak level
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const average = sum / this.dataArray.length;
            const level = Math.min(1.0, average / 128); // Normalize to 0-1

            onLevel(level);

            if (!audio.paused && !audio.ended) {
                this.animationId = requestAnimationFrame(loop);
            } else {
                onLevel(0);
                this.animationId = null;
            }
        };

        requestAnimationFrame(loop);

        return {
            stop: () => {
                audio.pause();
                if (this.animationId) cancelAnimationFrame(this.animationId);
                onLevel(0);
            }
        };
    }
}

export const aiAudioAnalyzer = new AIAudioAnalyzer();
