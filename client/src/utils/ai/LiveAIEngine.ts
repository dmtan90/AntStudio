// import AITrackingWorker from "./AITracking.worker.ts?worker";

export interface AIProcessingResults {
    faceLandmarks?: any[];
    handLandmarks?: any[][];
    poseLandmarks?: any[];
    poseWorldLandmarks?: any[];
    segmentationMask?: any;
    timestamp?: number;
}

export interface AIProcessingOptions {
    enableFace?: boolean;
    enableHands?: boolean;
    enablePose?: boolean;
    enableSegmentation?: boolean;
}

export class LiveAIEngine {
    private worker: Worker | null = null;
    public isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private lastResults: AIProcessingResults = {};
    private pendingResolver: ((value: AIProcessingResults) => void) | null = null;
    private lastErrorTime = 0;
    private errorThrottleInterval = 5000;
    private backoffUntil = 0;
	private AI_FRAME_SIZE = 240;
    
    private captureCanvas: HTMLCanvasElement | null = null;
    private captureCtx: CanvasRenderingContext2D | null = null;

    async initialize() {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            console.log("[LiveAIEngine] Initializing Worker-based MediaPipe...");
            this.worker = new Worker(new URL('@/workers/AITracking.worker.ts', import.meta.url), {
                type: 'classic'
            });

            this.worker.onmessage = (event) => {
                const { type, results, error } = event.data;

                if (type === 'INIT_COMPLETE') {
                    console.log("[LiveAIEngine] Worker initialized successfully.");
                    this.isInitialized = true;
                    resolve();
                } else if (type === 'RESULT') {
                    if (results) {
                        results.timestamp = event.data.timestamp;
                        this.lastResults = results;
                    }
                    
                    // Resolve the pending promise to unblock the main thread loop
                    if (this.pendingResolver) {
                        this.pendingResolver(this.lastResults);
                        this.pendingResolver = null;
                    }
                } else if (type === 'ERROR') {
                    console.error("[LiveAIEngine] Worker error:", error);
                    // Don't reject initPromise here if it's a runtime error
                    if (this.pendingResolver) {
                        this.pendingResolver(this.lastResults); // Return stale results on error
                        this.pendingResolver = null;
                    }
                }
            };

            this.worker.postMessage({ type: 'INIT' });
        });

        return this.initPromise;
    }

    getWorker() {
        return this.worker;
    }

    /**
     * Process a single video frame asynchronously.
     * NOW THROTTLED: Returns immediately if worker is busy.
     */
    async processFrame(input: HTMLVideoElement | HTMLCanvasElement | MediaStreamTrack, timestamp: number, options: AIProcessingOptions = { enableFace: true, enableHands: false, enablePose: false }): Promise<AIProcessingResults> {
        if (!this.isInitialized || !this.worker) return this.lastResults;

        // 1. Throttling: If worker is busy, skip this frame entirely
        if (this.pendingResolver) {
            // console.log("[LiveAIEngine] Worker busy, skipping frame");
            return this.lastResults;
        }

        const now = Date.now();
        if (now < this.backoffUntil) return this.lastResults;

        return new Promise<AIProcessingResults>(async (resolve) => {
            // Set the resolver so subsequent calls know we are busy
            this.pendingResolver = resolve;
            
            // Safety timeout: If worker hangs, release the lock after 500ms
            setTimeout(() => {
                if (this.pendingResolver === resolve) {
                    // console.warn("[LiveAIEngine] Worker timed out");
                    resolve(this.lastResults);
                    this.pendingResolver = null;
                }
            }, 500);

            try {
                let bitmap: ImageBitmap | null = null;
                const isTrack = input instanceof MediaStreamTrack || (input as any).kind === "video";

                if (isTrack) {
                     if ('ImageCapture' in window) {
                        try {
                            const capture = new (window as any).ImageCapture(input);
                            const fullBitmap = await capture.grabFrame();
                            // Downscale
                            const scale = Math.min(1.0, this.AI_FRAME_SIZE / Math.max(fullBitmap.width, fullBitmap.height)); // Reduced to 360p for speed
                            if (scale < 1.0) {
                                bitmap = await createImageBitmap(fullBitmap, {
                                    resizeWidth: Math.floor(fullBitmap.width * scale),
                                    resizeHeight: Math.floor(fullBitmap.height * scale),
                                    resizeQuality: 'low'
                                });
                                fullBitmap.close();
                            } else {
                                bitmap = fullBitmap;
                            }
                        } catch (e) {
                            // Fallback or ignore
                        }
                    }
                } else {
                    // Canvas fallback (simplified for brevity, assume similar logic to before)
                     if (input instanceof HTMLVideoElement) {
                        if (input.readyState < 2 || input.videoWidth === 0) {
                            this.pendingResolver = null;
                            resolve(this.lastResults);
                            return;
                        }
                        
                        if (!this.captureCanvas) {
                             this.captureCanvas = document.createElement('canvas');
                             this.captureCtx = this.captureCanvas.getContext('2d', { alpha: false, desynchronized: true });
                        }
                        
                        const w = input.videoWidth;
                        const h = input.videoHeight;
                        const scale = Math.min(1.0, this.AI_FRAME_SIZE / Math.max(w, h));
                        const sw = Math.floor(w * scale);
                        const sh = Math.floor(h * scale);
                        
                        if (this.captureCanvas.width !== sw || this.captureCanvas.height !== sh) {
                            this.captureCanvas.width = sw;
                            this.captureCanvas.height = sh;
                        }
                        
                        this.captureCtx?.drawImage(input, 0, 0, sw, sh);
                        bitmap = await createImageBitmap(this.captureCanvas);
                    }
                }
                
                if (bitmap) {
                    this.worker.postMessage({
                        type: 'PROCESS_FRAME',
                        payload: bitmap,
                        timestamp,
                        options
                    }, [bitmap]);
                } else {
                    this.pendingResolver = null;
                    resolve(this.lastResults);
                }
            } catch (err) {
                this.pendingResolver = null;
                resolve(this.lastResults);
            }
        });
    }

    getLatestResults(): AIProcessingResults {
        return this.lastResults;
    }

    close() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isInitialized = false;
        this.initPromise = null;
    }
}

export const liveAIEngine = new LiveAIEngine();

