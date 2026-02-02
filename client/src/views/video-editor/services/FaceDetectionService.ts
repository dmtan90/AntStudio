
import { FaceDetector, FilesetResolver, Detection } from "@mediapipe/tasks-vision";
import { getFileUrl } from "@/utils/api";

export interface DetectedFace {
    score: number;
    box: {
        originX: number;
        originY: number;
        width: number;
        height: number;
    };
    timestamp: number;
}

export class FaceDetectionService {
    private faceDetector: FaceDetector | null = null;
    private runningMode: "IMAGE" | "VIDEO" = "VIDEO";

    async initialize() {
        if (this.faceDetector) return;

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
        );

        this.faceDetector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                delegate: "GPU"
            },
            minDetectionConfidence: 0.5,
            runningMode: this.runningMode
        });
    }

    async analyzeVideo(videoUrl: string, onProgress?: (progress: number) => void): Promise<DetectedFace[]> {
        await this.initialize();
        if (!this.faceDetector) throw new Error("Face Detector not initialized");

        const videoElement = document.createElement("video");
        videoElement.crossOrigin = "anonymous";
        videoElement.src = await getFileUrl(videoUrl);
        videoElement.muted = true;

        await new Promise((resolve, reject) => {
            videoElement.onloadeddata = resolve;
            videoElement.onerror = reject;
        });

        const detections: DetectedFace[] = [];
        const duration = videoElement.duration;

        // Process frame by frame approx every 0.1s for smoother face tracking possibilities
        const interval = 0.2;
        let currentTime = 0;

        while (currentTime < duration) {
            videoElement.currentTime = currentTime;
            await new Promise(r => videoElement.onseeked = r);

            const results = this.faceDetector.detectForVideo(videoElement, currentTime * 1000);

            results.detections.forEach((detection: Detection) => {
                if (detection.boundingBox) {
                    detections.push({
                        score: detection.categories[0].score,
                        box: detection.boundingBox,
                        timestamp: currentTime
                    });
                }
            });

            if (onProgress) onProgress(Math.min(100, (currentTime / duration) * 100));
            currentTime += interval;
        }

        return detections;
    }
}

export const faceDetectionService = new FaceDetectionService();
