export class StreamAnalyzer {
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private dataArray: Uint8Array;
    private chatVelocity: number = 0;
    private chatHistory: number[] = [];
    private lastTriggerTime: number = 0;

    // Callback for when a highlight is detected
    public onHighlightDetected: (reason: string) => void = () => { };

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    public connect(stream: MediaStream) {
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        this.startMonitoring();
    }

    public logChatMessage() {
        const now = Date.now();
        this.chatHistory.push(now);
        // Remove messages older than 10 seconds
        this.chatHistory = this.chatHistory.filter(t => now - t < 10000);
        this.chatVelocity = this.chatHistory.length;
    }

    private startMonitoring() {
        const checkFrame = () => {
            this.analyser.getByteFrequencyData(this.dataArray as any);

            // 1. Calculate Average Volume
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const averageVolume = sum / this.dataArray.length;

            // 2. Detect High Energy (Audio > 180/255 OR Chat Velocity > 15 msg/10s)
            const now = Date.now();
            const cooldown = 30000; // 30s cooldown between highlights

            if (now - this.lastTriggerTime > cooldown) {
                if (averageVolume > 150) {
                    this.triggerHighlight('High Volume (Crowd/Reaction)');
                } else if (this.chatVelocity > 10) { // Lowered for demo
                    this.triggerHighlight('Chat Spike (Viral Moment)');
                }
            }

            requestAnimationFrame(checkFrame);
        };
        checkFrame();
    }

    private triggerHighlight(reason: string) {
        this.lastTriggerTime = Date.now();
        console.log(`[StreamAnalyzer] Highlight Triggered: ${reason}`);
        this.onHighlightDetected(reason);
    }
}

export const streamAnalyzer = new StreamAnalyzer();
