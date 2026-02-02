
import { getFileUrl } from "@/utils/api";

export interface MotionData {
    timestamp: number;
    score: number; // 0 to 1, where 1 is maximum motion
    isHighMotion: boolean;
}

export class MotionAnalysisService {
    async analyzeVideo(videoUrl: string, onProgress?: (progress: number) => void): Promise<MotionData[]> {
        const videoElement = document.createElement("video");
        videoElement.crossOrigin = "anonymous";
        videoElement.src = await getFileUrl(videoUrl);
        videoElement.muted = true;

        await new Promise((resolve, reject) => {
            videoElement.onloadeddata = resolve;
            videoElement.onerror = reject;
        });

        const width = 320; // Downscale for performance
        const height = 180;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return [];

        canvas.width = width;
        canvas.height = height;

        const results: MotionData[] = [];
        const duration = videoElement.duration;
        const interval = 0.5; // Analyze every 0.5s
        let currentTime = 0;

        let prevData: Uint8ClampedArray | null = null;

        while (currentTime < duration) {
            videoElement.currentTime = currentTime;
            await new Promise(r => videoElement.onseeked = r);

            ctx.drawImage(videoElement, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            if (prevData) {
                let diffSum = 0;
                let pixelCount = data.length / 4;

                for (let i = 0; i < data.length; i += 4) {
                    // Convert to grayscale for simpler motion detection
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                    const pr = prevData[i];
                    const pg = prevData[i + 1];
                    const pb = prevData[i + 2];
                    const pGray = 0.299 * pr + 0.587 * pg + 0.114 * pb;

                    diffSum += Math.abs(gray - pGray);
                }

                const avgDiff = diffSum / pixelCount;
                const score = Math.min(1, avgDiff / 100); // Normalize. 100 avg diff is huge.

                results.push({
                    timestamp: currentTime,
                    score,
                    isHighMotion: score > 0.3
                });
            } else {
                results.push({
                    timestamp: currentTime,
                    score: 0,
                    isHighMotion: false
                });
            }

            prevData = new Uint8ClampedArray(data);

            if (onProgress) onProgress(Math.min(100, (currentTime / duration) * 100));
            currentTime += interval;
        }

        return results;
    }
}

export const motionAnalysisService = new MotionAnalysisService();
