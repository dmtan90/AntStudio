import { FaceLandmarker, FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

export interface AIProcessingResults {
    faceLandmarks?: any[];
    segmentationMask?: any;
}

export class LiveAIEngine {
    private faceLandmarker: FaceLandmarker | null = null;
    private imageSegmenter: ImageSegmenter | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // Initialize Face Landmarker
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });

        // Initialize Image Segmenter (Selfie)
        this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });

        this.isInitialized = true;
        console.log("Live AI Engine initialized with MediaPipe");
    }

    /**
     * Process a single video frame
     */
    processFrame(videoElement: HTMLVideoElement, timestamp: number): AIProcessingResults {
        if (!this.isInitialized) return {};

        const results: AIProcessingResults = {};

        // 1. Face Landmarks
        if (this.faceLandmarker) {
            const faceResult = this.faceLandmarker.detectForVideo(videoElement, timestamp);
            if (faceResult.faceLandmarks) {
                results.faceLandmarks = faceResult.faceLandmarks;
            }
        }

        // 2. Segmentation
        if (this.imageSegmenter) {
            this.imageSegmenter.segmentForVideo(videoElement, timestamp, (result) => {
                results.segmentationMask = result.confidenceMasks?.[0] || result.categoryMask;
            });
        }

        return results;
    }

    close() {
        this.faceLandmarker?.close();
        this.imageSegmenter?.close();
        this.isInitialized = false;
    }
}

export const liveAIEngine = new LiveAIEngine();
