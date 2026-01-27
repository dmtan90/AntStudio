/**
 * Service for autonomously capturing and buffering "Viral Highlights" from the live canvas.
 * Maintains a rolling buffer of the last 15-20 seconds of broadcast.
 */
export class LiveHighlightService {
    private recorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private canvas: HTMLCanvasElement | null = null;
    private isActive = false;
    private maxChunks = 20; // Approximately 20 seconds if using 1s slice
    private onHighlightCaptured: ((url: string, metadata: any) => void) | null = null;

    public init(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.startBuffering();
    }

    private startBuffering() {
        if (!this.canvas) return;

        try {
            const stream = this.canvas.captureStream(30);
            this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.chunks.push(e.data);
                    if (this.chunks.length > this.maxChunks) {
                        this.chunks.shift(); // Keep rolling buffer
                    }
                }
            };

            // Start recording in 1-second slices
            this.recorder.start(1000);
            this.isActive = true;
            console.log("[HighlightService] Rolling buffer active.");
        } catch (e) {
            console.error("[HighlightService] Failed to start recorder", e);
        }
    }

    /**
     * Manually or autonomously trigger a highlight capture from the current buffer.
     */
    public async exportHighlight(metadata: { type: string, score: number, title?: string }): Promise<string | null> {
        if (this.chunks.length === 0) return null;

        console.log(`[HighlightService] Exporting Viral Moment: ${metadata.type} (Score: ${metadata.score})`);

        const blob = new Blob(this.chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        if (this.onHighlightCaptured) {
            this.onHighlightCaptured(url, {
                ...metadata,
                timestamp: Date.now(),
                title: metadata.title || `Viral Highlight ${new Date().toLocaleTimeString()}`
            });
        }

        return url;
    }

    public onHighlight(callback: (url: string, metadata: any) => void) {
        this.onHighlightCaptured = callback;
    }

    public stop() {
        if (this.recorder && this.recorder.state !== 'inactive') {
            this.recorder.stop();
        }
        this.isActive = false;
        this.chunks = [];
    }
}

export const liveHighlightService = new LiveHighlightService();
