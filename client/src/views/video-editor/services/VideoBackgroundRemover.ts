import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

export interface ProcessingOptions {
    onProgress?: (progress: number) => void;
    onFrame?: (canvas: HTMLCanvasElement | OffscreenCanvas) => void;
}

export class VideoBackgroundRemover {
    private segmenter: ImageSegmenter | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        const vision = await FilesetResolver.forVisionTasks(
            "/models/mediapipe"
        );

        this.segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "/models/mediapipe/selfie_segmenter.tflite",
                delegate: "GPU"
            },
            runningMode: "IMAGE",
            outputCategoryMask: true,
            outputConfidenceMasks: false
        });

        this.isInitialized = true;
        console.log("[VideoBackgroundRemover] Initialized MediaPipe Segmenter");
    }

    async processVideo(videoUrl: string, options: ProcessingOptions = {}): Promise<Blob> {
        if (!this.isInitialized) await this.initialize();
        if (!this.segmenter) throw new Error("Segmenter not initialized");

        const video = document.createElement("video");
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.playsInline = true;
        video.muted = true;

        await new Promise((resolve, reject) => {
            video.onloadeddata = resolve;
            video.onerror = reject;
        });

        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not get 2D context");

        const recorderCanvas = document.createElement("canvas");
        recorderCanvas.width = width;
        recorderCanvas.height = height;
        const recorderCtx = recorderCanvas.getContext("2d");
        if (!recorderCtx) throw new Error("Could not get recorder canvas context");

        // MediaRecorder for WebM with Alpha
        const stream = recorderCanvas.captureStream(30);
        const mimeType = "video/webm;codecs=vp9";

        if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error(`MediaRecorder does not support ${mimeType} for alpha transparency`);
        }

        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => chunks.push(e.data);

        return new Promise(async (resolve, reject) => {
            recorder.onstop = () => {
                resolve(new Blob(chunks, { type: mimeType }));
            };
            recorder.onerror = reject;

            recorder.start();

            let currentTime = 0;
            const step = 1 / 30; // 30 FPS processing

            while (currentTime < duration) {
                video.currentTime = currentTime;
                await new Promise(r => video.onseeked = r);

                // Draw original frame
                ctx.drawImage(video, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);

                // Run segmentation
                const result = this.segmenter!.segment(video);
                const mask = result.categoryMask?.getAsUint8Array();

                if (mask) {
                    // Apply mask to alpha channel
                    for (let i = 0; i < mask.length; i++) {
                        // selfie_segmenter: 1 is person, 0 is background
                        // We use the mask value to set alpha (255 if person, 0 if background)
                        imageData.data[i * 4 + 3] = mask[i] > 0 ? 255 : 0;
                    }
                    recorderCtx.putImageData(imageData, 0, 0);
                }

                if (options.onFrame) options.onFrame(recorderCanvas);
                if (options.onProgress) options.onProgress((currentTime / duration) * 100);

                currentTime += step;
            }

            recorder.stop();
            video.remove();
        });
    }

    close() {
        this.segmenter?.close();
        this.isInitialized = false;
    }
}

export const videoBackgroundRemover = new VideoBackgroundRemover();
