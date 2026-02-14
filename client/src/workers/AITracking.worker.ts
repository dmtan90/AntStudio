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
let handLandmarker: HandLandmarker | null = null;
let imageSegmenter: ImageSegmenter | null = null;
let isInitialized = false;
let lastLogTime = 0; // Throttle logs to once every 2 seconds

async function init() {
    try {
        const vision = await $mediapipe.FilesetResolver.forVisionTasks("/models/mediapipe");

        // 1. Face Landmarker
        faceLandmarker = await $mediapipe.FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        // console.log('[AITrackingWorker] Face Landmarker initialized');

        // 2. Hand Landmarker
        handLandmarker = await $mediapipe.HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });
        // console.log('[AITrackingWorker] Hand Landmarker initialized');

        // 3. Image Segmenter
        imageSegmenter = await $mediapipe.ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/selfie_segmenter.tflite`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });
        // console.log('[AITrackingWorker] Image Segmenter initialized');

        isInitialized = true;
        self.postMessage({ type: 'INIT_COMPLETE' });
    } catch (err) {
        self.postMessage({ type: 'ERROR', error: (err as Error).message });
    }
}

let renderPort: MessagePort | null = null;

self.onmessage = async (event) => {
    const { type, payload, timestamp, options } = event.data;

    if (type === 'INIT') {
        await init();
    } else if (type === 'SETUP_CHANNEL') {
        renderPort = event.ports[0];
        // console.log('[AITrackingWorker] Render port established');
    } else if (type === 'PROCESS_FRAME') {
        if (!isInitialized) return;

        const results: any = {};
        const image = payload as ImageBitmap;
        
        const now = Date.now();
        if (now - lastLogTime > 2000) {
            // console.log(`[AITrackingWorker] Processing frame at ${timestamp}, options:`, options);
        }

        try {
            // 1. Face
            if (faceLandmarker && options?.enableFace) {
                try {
                    const faceResult = faceLandmarker.detectForVideo(image, timestamp);
                    results.faceLandmarks = faceResult.faceLandmarks;
                    results.faceBlendshapes = faceResult.faceBlendshapes;
                    results.facialTransformationMatrixes = faceResult.facialTransformationMatrixes;

                    if (now - lastLogTime > 2000) {
                        const nose = faceResult.faceLandmarks?.[0]?.[1];
                        // console.log(`[AITrackingWorker] Detected faces: ${faceResult.faceLandmarks?.length || 0}, Nose: ${nose ? `x=${nose.x.toFixed(2)}, y=${nose.y.toFixed(2)}` : 'N/A'}`);
                    }
                } catch (e) {
                    console.warn('[AITrackingWorker] Face detection error:', e);
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
                        }, 100); // 100ms safety timeout

                        imageSegmenter!.segmentForVideo(image, timestamp, (result: ImageSegmenterResult) => {
                            clearTimeout(timeout);
                            const mask = result.confidenceMasks?.[0] || result.categoryMask;
                            if (mask) {
                                // Force Float32 conversion for stability across vendors
                                const floatData = mask.getAsFloat32Array();
                                const uint8Data = new Uint8Array(floatData.length);
                                
                                let min = 1.0, max = 0.0, sum = 0;
                                for (let i = 0; i < floatData.length; i++) {
                                    const val = floatData[i];
                                    if (val < min) min = val;
                                    if (val > max) max = val;
                                    sum += val;
                                    uint8Data[i] = Math.floor(val * 255);
                                }
                                
                                results.segmentationMask = uint8Data;
                                results.maskWidth = mask.width;
                                results.maskHeight = mask.height;
                                
                                // FAST PATH: Send directly to render worker if channel exists
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
                                    
                                    // Clear from main results to save transfer
                                    delete results.segmentationMask;
                                }

                                // Diagnostic: Log occasionally with detailed stats
                                const now = Date.now();
                                if (now - lastLogTime > 2000) {
                                    const avg = sum / floatData.length;
                                    // console.log(`[AITrackingWorker] Mask: ${mask.width}x${mask.height}, Range: [${min.toFixed(2)}-${max.toFixed(2)}], Avg: ${avg.toFixed(2)}`);
                                    lastLogTime = now;
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

            // Important: close the ImageBitmap to prevent memory leaks
            image.close();
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: (err as Error).message });
            image.close();
        }
    }
};
