// @ts-nocheck
// @ts-ignore
import type { 
    FaceLandmarker, FilesetResolver as FilesetResolverType, 
    ImageSegmenter, HandLandmarker, 
    ImageSegmenterResult 
} from "@mediapipe/tasks-vision";

importScripts('/models/mediapipe/mediapipe.js');
// import * as $mediapipe from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let faceLandmarkerStatic: FaceLandmarker | null = null;
let handLandmarker: HandLandmarker | null = null;
let imageSegmenter: ImageSegmenter | null = null;
let isInitialized = false;
let visionResolver: any = null;

async function init() {
    try {
        visionResolver = await $mediapipe.FilesetResolver.forVisionTasks("/models/mediapipe");

        // Face Landmarker and others are now lazy-loaded on demand
        // to minimize baseline CPU usage before any tracking is active.

        isInitialized = true;
        self.postMessage({ type: 'INIT_COMPLETE' });
    } catch (err) {
        self.postMessage({ type: 'ERROR', error: (err as Error).message });
    }
}

async function ensureFaceLandmarker() {
    if (faceLandmarker) return true;
    if (!visionResolver) return false;
    try {
        console.log('[AITrackingWorker] Initializing FaceLandmarker (VIDEO)...');
        faceLandmarker = await $mediapipe.FaceLandmarker.createFromOptions(visionResolver, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        return true;
    } catch (err) {
        console.error('[AITrackingWorker] Failed to init face landmarker:', err);
        return false;
    }
}

async function ensureHandLandmarker() {
    if (handLandmarker) return true;
    if (!visionResolver) return false;
    try {
        handLandmarker = await $mediapipe.HandLandmarker.createFromOptions(visionResolver, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });
        return true;
    } catch (err) {
        console.error('[AITrackingWorker] Failed to init hand landmarker:', err);
        return false;
    }
}

async function ensureImageSegmenter() {
    if (imageSegmenter) return true;
    if (!visionResolver) return false;
    try {
        imageSegmenter = await $mediapipe.ImageSegmenter.createFromOptions(visionResolver, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/selfie_segmenter.tflite`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });
        return true;
    } catch (err) {
        console.error('[AITrackingWorker] Failed to init image segmenter:', err);
        return false;
    }
}

async function ensureStaticFaceLandmarker() {
    if (faceLandmarkerStatic) return true;
    if (!visionResolver) {
        visionResolver = await $mediapipe.FilesetResolver.forVisionTasks("/models/mediapipe");
    }
    try {
        faceLandmarkerStatic = await $mediapipe.FaceLandmarker.createFromOptions(visionResolver, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/face_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "IMAGE",
            numFaces: 1
        });
        return true;
    } catch (err) {
        console.error('[AITrackingWorker] Failed to init static face landmarker:', err);
        return false;
    }
}

let renderPort: MessagePort | null = null;

self.onmessage = async (event) => {
    const { type, payload, timestamp, options, id } = event.data;
    const startTime = performance.now();

    // if (type !== 'PROCESS_FRAME') {
        console.log(`[AITrackingWorker] Received message: ${type}`, { timestamp, id });
    // }

    if (type === 'INIT') {
        await init();
    } else if (type === 'SETUP_CHANNEL') {
        console.log('[AITrackingWorker] Setting up MessageChannel for RenderWorker');
        renderPort = event.ports[0];
    } else if (type === 'DETECT') {
        // Static detection (from FaceLandmarkService)
        const success = await ensureStaticFaceLandmarker();
        if (!success) {
            self.postMessage({ type: 'ERROR', id, error: 'Static FaceLandmarker failed to initialize' });
            return;
        }

        try {
            const image = payload as ImageBitmap;
            const result = faceLandmarkerStatic!.detect(image);
            console.log(`[AITrackingWorker] Static detection complete in ${(performance.now() - startTime).toFixed(2)}ms`);
            self.postMessage({ type: 'DETECT_RESULT', id, result });
            image.close();
        } catch (err) {
            self.postMessage({ type: 'ERROR', id, error: (err as Error).message });
        }
    } else if (type === 'PROCESS_FRAME') {
        if (!isInitialized) {
            console.warn('[AITrackingWorker] PROCESS_FRAME received before initialization');
            return;
        }

        const results: any = {};
        const image = payload as ImageBitmap;
        
        try {
            // 1. Face
            if (options?.enableFace) {
                const success = await ensureFaceLandmarker();
                if (success && faceLandmarker) {
                    try {
                        const faceResult = faceLandmarker.detectForVideo(image, timestamp);
                        results.faceLandmarks = faceResult.faceLandmarks;
                        results.faceBlendshapes = faceResult.faceBlendshapes;
                        results.facialTransformationMatrixes = faceResult.facialTransformationMatrixes;

                        if (renderPort && faceResult.faceBlendshapes?.[0]) {
                            renderPort.postMessage({
                                type: 'UPDATE_FACE_FULL',
                                payload: {
                                    blendshapes: faceResult.faceBlendshapes[0].categories,
                                    matrix: faceResult.facialTransformationMatrixes?.[0],
                                    landmarks: faceResult.faceLandmarks?.[0]
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('[AITrackingWorker] Face detection error:', e);
                    }
                }
            }

            // 2. Hands
            if (handLandmarker && options?.enableHands) {
                try {
                    const handResult = handLandmarker.detectForVideo(image, timestamp);
                    results.handLandmarks = handResult.landmarks;
                } catch (e) {
                    // console.warn('[AITrackingWorker] Hand detection error:', e);
                }
            }

            // 3. Segmentation
            if (imageSegmenter && options?.enableSegmentation) {
                try {
                    await new Promise<void>((resolve) => {
                        const timeout = setTimeout(() => {
                            console.warn('[AITrackingWorker] Segmentation timeout');
                            resolve();
                        }, 100); 

                        imageSegmenter!.segmentForVideo(image, timestamp, (result: ImageSegmenterResult) => {
                            clearTimeout(timeout);
                            const mask = result.confidenceMasks?.[0] || result.categoryMask;
                            if (mask) {
                                const floatData = mask.getAsFloat32Array();
                                const uint8Data = new Uint8Array(floatData.length);
                                
                                for (let i = 0; i < floatData.length; i++) {
                                    uint8Data[i] = Math.floor(floatData[i] * 255);
                                }
                                
                                results.segmentationMask = uint8Data;
                                results.maskWidth = mask.width;
                                results.maskHeight = mask.height;
                                
                                if (renderPort) {
                                    const buffer = uint8Data.buffer;
                                    renderPort.postMessage({
                                        type: 'UPDATE_MASK',
                                        payload: {
                                            maskData: uint8Data,
                                            width: mask.width,
                                            height: mask.height,
                                            timestamp
                                        }
                                    }, [buffer]);
                                    delete results.segmentationMask;
                                }
                            }
                            resolve();
                        });
                    });
                } catch (e) {
                    console.warn('[AITrackingWorker] Segmentation error:', e);
                }
            }

            const transfer: any[] = [];
            if (results.segmentationMask) transfer.push(results.segmentationMask.buffer);
            
            self.postMessage({ type: 'RESULT', results, timestamp }, transfer);
            const duration = performance.now() - startTime;
            if (duration > 50) {
                console.log(`[AITrackingWorker] Frame processed in ${duration.toFixed(2)}ms (SLOW)`);
            }
            image.close();
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: (err as Error).message });
            image.close();
        }
    }
};
