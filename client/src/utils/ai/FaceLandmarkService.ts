import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

/**
 * FaceLandmarkService
 *
 * Reuses the shared AITracking worker from LiveAIEngine instead of spawning
 * its own worker — avoids loading 3 duplicate MediaPipe models (Face, Hand,
 * Segmenter) a second time, which was the root cause of high idle CPU.
 */
export class FaceLandmarkService {
    private static instance: FaceLandmarkService | null = null;
    
    // Simple cache for detection results (indexed by URL)
    private detectionCache: Map<string, FaceLandmarkerResult> = new Map();
    private pendingRequests: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }> = new Map();

    private constructor() {}

    public static getInstance(): FaceLandmarkService {
        if (!FaceLandmarkService.instance) {
            FaceLandmarkService.instance = new FaceLandmarkService();
        }
        return FaceLandmarkService.instance;
    }

    /**
     * Get the shared worker from LiveAIEngine. The worker is initialized
     * lazily only when detection is actually needed.
     */
    private async getWorker(): Promise<Worker | null> {
        const { liveAIEngine } = await import('@/utils/ai/LiveAIEngine');

        // Initialize the shared worker if not already done
        if (!liveAIEngine.isInitialized) {
            // await liveAIEngine.initialize();
        }

        const worker = liveAIEngine.getWorker();

        if (!worker) return null;

        // Attach our message handler if not already done
        // We check for our flag to avoid double-attaching
        if (!(worker as any).__faceLandmarkServiceAttached) {
            (worker as any).__faceLandmarkServiceAttached = true;

            // Wrap the existing onmessage so we can intercept DETECT_RESULT
            const originalOnMessage = worker.onmessage?.bind(worker);
            worker.onmessage = (event: MessageEvent) => {
                const { type, result, error, id } = event.data;

                if (type === 'DETECT_RESULT') {
                    const pending = this.pendingRequests.get(id);
                    if (pending) {
                        pending.resolve(result);
                        this.pendingRequests.delete(id);
                    }
                } else if (type === 'ERROR' && id && this.pendingRequests.has(id)) {
                    const pending = this.pendingRequests.get(id)!;
                    pending.reject(new Error(error));
                    this.pendingRequests.delete(id);
                } else if (originalOnMessage) {
                    originalOnMessage(event);
                }
            };
        }

        return worker;
    }

    public async detect(image: ImageBitmap | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, cacheKey?: string): Promise<FaceLandmarkerResult | null> {
        // 1. Check in-memory cache
        if (cacheKey && this.detectionCache.has(cacheKey)) {
            console.log('[FaceLandmarkService] Returning cached result for:', cacheKey);
            return this.detectionCache.get(cacheKey)!;
        }

        // 2. Check IndexedDB persistent cache
        if (cacheKey) {
            try {
                const { getCachedLandmarks } = await import('@/utils/ModelCache');
                const persistedResult = await getCachedLandmarks(cacheKey);
                if (persistedResult) {
                    console.log('[FaceLandmarkService] Returning IndexedDB cached result for:', cacheKey);
                    this.detectionCache.set(cacheKey, persistedResult);
                    return persistedResult;
                }
            } catch (e) { /* IndexedDB not available, continue with detection */ }
        }

        const worker = await this.getWorker();
        if (!worker) return null;

        return new Promise(async (resolve, reject) => {
            const id = Math.random().toString(36).substr(2, 9);
            this.pendingRequests.set(id, { 
                resolve: (result: FaceLandmarkerResult | null) => {
                    // Write to both caches after successful detection
                    if (cacheKey && result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                        this.detectionCache.set(cacheKey, result);
                        // Persist to IndexedDB (fire-and-forget)
                        import('@/utils/ModelCache').then(({ cacheLandmarks }) => {
                            cacheLandmarks(cacheKey, result);
                        }).catch(() => {});
                    }
                    resolve(result);
                }, 
                reject 
            });

            try {
                let bitmap: ImageBitmap;
                
                // Downscale to ~360p for much faster detection if GPU delegate is missing/failed 
                // in worker (which seems to be the case on some systems)
                const MAX_SIZE = 360;
                let w = (image as any).videoWidth || (image as any).width || 0;
                let h = (image as any).videoHeight || (image as any).height || 0;

                if (w > MAX_SIZE || h > MAX_SIZE) {
                    const scale = Math.min(1.0, MAX_SIZE / Math.max(w, h));
                    const sw = Math.floor(w * scale);
                    const sh = Math.floor(h * scale);
                    bitmap = await createImageBitmap(image, {
                        resizeWidth: sw,
                        resizeHeight: sh,
                        resizeQuality: 'medium'
                    });
                    console.log(`[FaceLandmarkService] Downscaled to ${sw}x${sh} for detection`);
                } else {
                    bitmap = await createImageBitmap(image);
                }

                worker.postMessage({
                    type: 'DETECT',
                    id,
                    payload: bitmap
                }, [bitmap]);
            } catch (err) {
                this.pendingRequests.delete(id);
                reject(err);
            }
        });
    }

    public clearCache() {
        this.detectionCache.clear();
    }

    /**
     * No-op: The shared worker is managed by LiveAIEngine, not by this service.
     * Call liveAIEngine.close() if you need to shut down the worker.
     */
    public async close() {
        // Worker lifecycle is managed by LiveAIEngine
        console.log('[FaceLandmarkService] close() called — shared worker is managed by LiveAIEngine.');
    }
}

export const faceLandmarkService = FaceLandmarkService.getInstance();
