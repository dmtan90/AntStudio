import { FaceLandmarker, FilesetResolver, ImageSegmenter, HandLandmarker } from "@mediapipe/tasks-vision";

export interface AIProcessingResults {
    faceLandmarks?: any[];
    handLandmarks?: any[][];
    segmentationMask?: any;
}

export interface AIProcessingOptions {
    enableFace?: boolean;
    enableHands?: boolean;
    enableSegmentation?: boolean;
}


export class LiveAIEngine {
    private faceLandmarker: FaceLandmarker | null = null;
    private handLandmarker: HandLandmarker | null = null;
    private imageSegmenter: ImageSegmenter | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        // Use local WASM files
        const vision = await FilesetResolver.forVisionTasks(
            "/models/mediapipe"
        );

        // Initialize Face Landmarker (Local)
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });

        // Initialize Hand Landmarker (Local)
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        // Initialize Image Segmenter (Selfie) (Local)
        this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/selfie_segmenter.tflite`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });

        this.isInitialized = true;
        console.log("Live AI Engine initialized with MediaPipe (Face + Hands + Selfie)");
    }

    private lastResults: AIProcessingResults = {};

    /**
     * Process a single video frame
     */
    processFrame(input: HTMLVideoElement | HTMLCanvasElement, timestamp: number, options: AIProcessingOptions = { enableFace: true }): AIProcessingResults {
        if (!this.isInitialized) return {};

        const results: AIProcessingResults = {};

        // 1. Face Landmarks
        if (this.faceLandmarker && options.enableFace) {
            const faceResult = this.faceLandmarker.detectForVideo(input, timestamp);
            if (faceResult.faceLandmarks) {
                results.faceLandmarks = faceResult.faceLandmarks;
            }
        }

        // 2. Hand Landmarks
        if (this.handLandmarker && options.enableHands) {
            const handResult = this.handLandmarker.detectForVideo(input, timestamp);
            if (handResult.landmarks) {
                results.handLandmarks = handResult.landmarks;
            }
        }

        // 3. Segmentation
        if (this.imageSegmenter && options.enableSegmentation) {
            this.imageSegmenter.segmentForVideo(input, timestamp, (result) => {
                results.segmentationMask = result.confidenceMasks?.[0] || result.categoryMask;
            });
        }

        this.lastResults = results;
        return results;
    }


    getLatestResults(): AIProcessingResults {
        return this.lastResults;
    }

    close() {
        this.faceLandmarker?.close();
        this.handLandmarker?.close();
        this.imageSegmenter?.close();
        this.isInitialized = false;
    }
}

export const liveAIEngine = new LiveAIEngine();
