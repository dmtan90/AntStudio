
import { ObjectDetector, FilesetResolver, Detection } from "@mediapipe/tasks-vision";
import { getFileUrl } from "@/utils/api";

export interface DetectedObject {
    label: string;
    score: number;
    box: {
        originX: number;
        originY: number;
        width: number;
        height: number;
    };
    timestamp: number;
}

export class ObjectDetectionService {
    private objectDetector: ObjectDetector | null = null;
    private runningMode: "IMAGE" | "VIDEO" = "VIDEO";

    async initialize() {
        if (this.objectDetector) return;

        const vision = await FilesetResolver.forVisionTasks(
            "/models/mediapipe"
        );

        this.objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "/models/mediapipe/efficientdet_lite0.tflite",
                delegate: "GPU"
            },
            scoreThreshold: 0.5,
            runningMode: this.runningMode
        });
    }

    async analyzeVideo(videoUrl: string, onProgress?: (progress: number) => void): Promise<DetectedObject[]> {
        await this.initialize();
        if (!this.objectDetector) throw new Error("Object Detector not initialized");

        const videoElement = document.createElement("video");
        videoElement.crossOrigin = "anonymous";
        videoElement.src = await getFileUrl(videoUrl);
        videoElement.muted = true;

        await new Promise((resolve, reject) => {
            videoElement.onloadeddata = resolve;
            videoElement.onerror = reject;
        });

        const detections: DetectedObject[] = [];
        const duration = videoElement.duration;

        // Process frame by frame approx every 0.5s
        const interval = 0.5;
        let currentTime = 0;

        while (currentTime < duration) {
            videoElement.currentTime = currentTime;
            await new Promise(r => videoElement.onseeked = r);

            const results = this.objectDetector.detectForVideo(videoElement, currentTime * 1000); // timestamp in ms

            results.detections.forEach((detection: Detection) => {
                if (detection.categories && detection.categories.length > 0 && detection.boundingBox) {
                    detections.push({
                        label: detection.categories[0].categoryName,
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

export const objectDetectionService = new ObjectDetectionService();
