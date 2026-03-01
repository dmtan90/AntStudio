
// import { TextDetector, FilesetResolver, Detection } from "@mediapipe/tasks-vision";
import { getFileUrl } from "@/utils/api";

export interface DetectedText {
    text: string;
    box: {
        originX: number;
        originY: number;
        width: number;
        height: number;
    };
    category?: string;
    score: number;
    timestamp: number;
}

export class TextRecognitionService {
    // private textDetector: TextDetector | null = null;
    private textDetector: any | null = null;
    private runningMode: "IMAGE" | "VIDEO" = "VIDEO";

    async initialize() {
        console.warn("TextRecognitionService is temporarily disabled due to import issues.");
        // if (this.textDetector) return;

        // const vision = await FilesetResolver.forVisionTasks(
        //     "/models/mediapipe"
        // );

        // this.textDetector = await TextDetector.createFromOptions(vision, {
        //     baseOptions: {
        //         modelAssetPath: "https://storage.googleapis.com/mediapipe-models/text_detector/text_detector_rbtg_anchors/float16/1/text_detector_rbtg_anchors.tflite",
        //         delegate: "GPU"
        //     },
        //     runningMode: this.runningMode
        // });
    }

    async analyzeVideo(videoUrl: string, onProgress?: (progress: number) => void): Promise<DetectedText[]> {
        return [];
        /*
        await this.initialize();
        if (!this.textDetector) throw new Error("Text Detector not initialized");

        const videoElement = document.createElement("video");
        videoElement.crossOrigin = "anonymous";
        videoElement.src = await getFileUrl(videoUrl);
        videoElement.muted = true;

        await new Promise((resolve, reject) => {
            videoElement.onloadeddata = resolve;
            videoElement.onerror = reject;
        });

        const detections: DetectedText[] = [];
        const duration = videoElement.duration;

        const interval = 1.0; // Check every second
        let currentTime = 0;

        while (currentTime < duration) {
            videoElement.currentTime = currentTime;
            await new Promise(r => videoElement.onseeked = r);

            const result = this.textDetector.detectForVideo(videoElement, currentTime * 1000);

            result.detections.forEach((detection: Detection) => {
                if (detection.boundingBox) {
                    detections.push({
                        text: "Text Detected", // The detector only gives boxes, recognizer gives text. We'll label it "Text Detected".
                        // If we want actual OCR, we'd need a recognizer model, but let's start with detection.
                        box: detection.boundingBox,
                        score: detection.categories && detection.categories.length > 0 ? detection.categories[0].score : 1.0,
                        timestamp: currentTime
                    });
                }
            });

            if (onProgress) onProgress(Math.min(100, (currentTime / duration) * 100));
            currentTime += interval;
        }

        return detections;
        */
    }
}

export const textRecognitionService = new TextRecognitionService();
