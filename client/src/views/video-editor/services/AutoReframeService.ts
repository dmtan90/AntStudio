import { ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export interface ReframeKeyframe {
    time: number;
    x: number;
    y: number;
    scale: number;
}

export class AutoReframeService {
    private detector: ObjectDetector | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        this.detector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            scoreThreshold: 0.3,
        });

        this.isInitialized = true;
        console.log("AutoReframeService initialized");
    }

    async analyzeVideo(videoUrl: string, targetAspectRatio: number = 9 / 16, onProgress?: (p: number) => void): Promise<ReframeKeyframe[]> {
        if (!this.isInitialized) await this.initialize();

        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        await video.play();
        video.pause();

        const duration = video.duration;
        const fps = 5; // Sample 5 frames per second for efficiency
        const interval = 1 / fps;
        const keyframes: ReframeKeyframe[] = [];

        for (let time = 0; time <= duration; time += interval) {
            video.currentTime = time;
            await new Promise(resolve => video.onseeked = resolve);

            const results = this.detector?.detectForVideo(video, time * 1000);

            // Find the most prominent "person" detection
            const person = results?.detections.find(d => d.categories[0].categoryName === 'person');

            if (person && person.boundingBox) {
                const { originX, originY, width, height } = person.boundingBox;
                const centerX = originX + width / 2;
                const centerY = originY + height / 2;

                // Normalize center coordinates (0-1)
                const normX = centerX / video.videoWidth;
                const normY = centerY / video.videoHeight;

                // Calculate required scale to cover the target aspect ratio
                // Assumption: we want to keep the subject centered and fill the screen
                const videoAspect = video.videoWidth / video.videoHeight;
                let scale = 1;

                if (targetAspectRatio < videoAspect) {
                    // Reframing from wide to narrow (e.g., 16:9 -> 9:16)
                    scale = videoAspect / targetAspectRatio;
                }

                keyframes.push({
                    time,
                    x: (normX - 0.5) * -100, // Percentage offset
                    y: (normY - 0.5) * -100,
                    scale
                });
            } else {
                // Default to center if no subject found
                keyframes.push({
                    time,
                    x: 0,
                    y: 0,
                    scale: 1
                });
            }

            if (onProgress) onProgress((time / duration) * 100);
        }

        video.remove();
        return this.smoothKeyframes(keyframes);
    }

    private smoothKeyframes(keyframes: ReframeKeyframe[]): ReframeKeyframe[] {
        // Simple moving average smoothing to avoid jitter
        const windowSize = 3;
        const smoothed: ReframeKeyframe[] = [];

        for (let i = 0; i < keyframes.length; i++) {
            let sumX = 0, sumY = 0, sumScale = 0, count = 0;
            for (let j = Math.max(0, i - windowSize); j <= Math.min(keyframes.length - 1, i + windowSize); j++) {
                sumX += keyframes[j].x;
                sumY += keyframes[j].y;
                sumScale += keyframes[j].scale;
                count++;
            }
            smoothed.push({
                time: keyframes[i].time,
                x: sumX / count,
                y: sumY / count,
                scale: sumScale / count
            });
        }
        return smoothed;
    }

    close() {
        this.detector?.close();
        this.isInitialized = false;
    }
}

export const autoReframeService = new AutoReframeService();
