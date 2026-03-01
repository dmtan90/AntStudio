
import { getFileUrl } from "@/utils/api";

export class ColorAnalysisService {
    async extractPalette(imageSource: string | HTMLImageElement | HTMLVideoElement, colorCount: number = 5): Promise<string[]> {
        let element: HTMLImageElement | HTMLVideoElement;

        if (typeof imageSource === 'string') {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = await getFileUrl(imageSource);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            element = img;
        } else {
            element = imageSource;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return [];

        const width = element instanceof HTMLVideoElement ? element.videoWidth : element.width;
        const height = element instanceof HTMLVideoElement ? element.videoHeight : element.height;

        // Downscale for performance
        const scale = Math.min(1, 100 / Math.max(width, height));
        canvas.width = width * scale;
        canvas.height = height * scale;

        ctx.drawImage(element, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const pixelCount = data.length / 4;

        const colors: { r: number, g: number, b: number }[] = [];

        // Sample pixels
        for (let i = 0; i < pixelCount; i += 10) { // Skip pixels for speed
            const offset = i * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const a = data[offset + 3];

            if (a >= 125) { // Ignore transparent
                colors.push({ r, g, b });
            }
        }

        // Simple quantization (Median Cut adaptation or just simple binning)
        // For simplicity, we'll use a very basic binning approach or just return average if n=1
        // Let's implement a simplified k-means or median-cut-like sort.
        // Actually, let's use a simple quantization:
        // Round colors to nearest 10, count frequency.

        const colorMap: Record<string, number> = {};

        colors.forEach(c => {
            const r = Math.round(c.r / 24) * 24;
            const g = Math.round(c.g / 24) * 24;
            const b = Math.round(c.b / 24) * 24;
            const key = `${r},${g},${b}`;
            colorMap[key] = (colorMap[key] || 0) + 1;
        });

        const sortedColors = Object.entries(colorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, colorCount)
            .map(([key]) => {
                const [r, g, b] = key.split(',').map(Number);
                return `rgb(${r},${g},${b})`;
            });

        return sortedColors;
    }

    async analyzeVideo(videoUrl: string, onProgress?: (progress: number) => void): Promise<{ timestamp: number, palette: string[] }[]> {
        const videoElement = document.createElement("video");
        videoElement.crossOrigin = "anonymous";
        videoElement.src = await getFileUrl(videoUrl);
        videoElement.muted = true;

        await new Promise((resolve, reject) => {
            videoElement.onloadeddata = resolve;
            videoElement.onerror = reject;
        });

        const results: { timestamp: number, palette: string[] }[] = [];
        const duration = videoElement.duration;
        const interval = 2.0;
        let currentTime = 0;

        while (currentTime < duration) {
            videoElement.currentTime = currentTime;
            await new Promise(r => videoElement.onseeked = r);

            const palette = await this.extractPalette(videoElement);
            results.push({ timestamp: currentTime, palette });

            if (onProgress) onProgress(Math.min(100, (currentTime / duration) * 100));
            currentTime += interval;
        }

        return results;
    }
}

export const colorAnalysisService = new ColorAnalysisService();
