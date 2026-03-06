import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
//import FaceLandmarkWorker from '../../workers/AITrackingStatic.worker.ts?worker';

export class FaceLandmarkService {
    private static instance: FaceLandmarkService | null = null;
    private worker: Worker | null = null;
    private isInitializing = false;
    private initPromise: Promise<void> | null = null;
    
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

    public async initialize(): Promise<void> {
        if (this.isInitializing || this.worker) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            console.log('[FaceLandmarkService] Initializing FaceLandmarker Static Worker...');
            // this.worker = new FaceLandmarkWorker();
			// this.worker = new AITrackingWorker();
            // In your main file
            this.worker = new Worker(new URL('@/workers/AITrackingStatic.worker.ts', import.meta.url), {
                type: 'classic' // Specify type as classic
            });

            this.worker.onmessage = (event) => {
                const { type, result, error, id } = event.data;

                if (type === 'INIT_COMPLETE') {
                    console.log('[FaceLandmarkService] Static Worker initialized.');
                    this.isInitializing = false;
                    resolve();
                } else if (type === 'DETECT_RESULT') {
                    const pending = this.pendingRequests.get(id);
                    if (pending) {
                        pending.resolve(result);
                        this.pendingRequests.delete(id);
                    }
                } else if (type === 'ERROR') {
                    console.error('[FaceLandmarkService] Worker error:', error);
                    const pending = id ? this.pendingRequests.get(id) : null;
                    if (pending) {
                        pending.reject(new Error(error));
                        this.pendingRequests.delete(id);
                    } else {
                        reject(new Error(error));
                    }
                }
            };

            this.worker.postMessage({ type: 'INIT' });
        });

        return this.initPromise;
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

        await this.initialize();
        if (!this.worker) return null;

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
                if (image instanceof ImageBitmap) {
                    bitmap = image;
                } else {
                    bitmap = await createImageBitmap(image);
                }

                this.worker!.postMessage({
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

    public async close() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.initPromise = null;
            this.isInitializing = false;
        }
    }
}

export const faceLandmarkService = FaceLandmarkService.getInstance();

