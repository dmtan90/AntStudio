import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { nanoid } from "nanoid";
import { getFileUrl } from "@/utils/api";

export interface Scene {
    start: number;
    end: number;
    label?: string;
    description?: string;
}

export class SceneDetectionService {
    private ffmpeg: FFmpeg | null = null;

    setFFmpeg(ffmpeg: FFmpeg) {
        this.ffmpeg = ffmpeg;
    }

    async analyzeVideo(videoUrl: string, onProgress?: (p: number) => void): Promise<Scene[]> {
        if (!this.ffmpeg) throw new Error("FFmpeg not provided to SceneDetectionService");
        
        const url = await getFileUrl(videoUrl);
        const inputName = nanoid() + ".mp4";
        const outputPattern = "frame_%04d.jpg";
        
        // Step 1: Write file to FFmpeg FS
        await this.ffmpeg.writeFile(inputName, await fetchFile(url));
        
        if (onProgress) onProgress(10);
        
        // Step 2: Extract frames at 2 fps for analysis (reduces computation while keeping precision)
        // Using low resolution for faster comparison
        await this.ffmpeg.exec([
            "-i", inputName,
            "-vf", "fps=2,scale=128:72",
            outputPattern
        ]);
        
        if (onProgress) onProgress(40);
        
        // Step 3: Read extracted frames and compare
        const files = await this.ffmpeg.listDir(".");
        const frameFiles = files
            .filter(f => f.name.startsWith("frame_") && f.name.endsWith(".jpg"))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        const scenes: Scene[] = [];
        let lastFrameData: Uint8Array | null = null;
        const threshold = 30; // Sensitivity threshold for pixel difference
        
        for (let i = 0; i < frameFiles.length; i++) {
            const data = await this.ffmpeg.readFile(frameFiles[i].name) as Uint8Array;
            
            if (lastFrameData) {
                const diff = this.calculateDifference(lastFrameData, data);
                if (diff > threshold) {
                    const time = i * 0.5; // Since we extracted at 2 fps
                    const lastScene = scenes[scenes.length - 1];
                    if (lastScene) {
                        lastScene.end = time;
                    }
                    scenes.push({ start: time, end: time });
                }
            } else {
                scenes.push({ start: 0, end: 0 });
            }
            
            lastFrameData = data;
            
            if (onProgress) {
                const currentProgress = 40 + (i / frameFiles.length) * 50;
                onProgress(currentProgress);
            }
        }
        
        // Close last scene
        if (scenes.length > 0) {
            scenes[scenes.length - 1].end = frameFiles.length * 0.5;
        }
        
        // Cleanup FFmpeg FS
        await this.ffmpeg.deleteFile(inputName);
        for (const f of frameFiles) {
            await this.ffmpeg.deleteFile(f.name);
        }
        
        if (onProgress) onProgress(100);
        
        return scenes.filter(s => (s.end - s.start) > 0.5); // Filter out tiny glitches
    }

    private calculateDifference(buf1: Uint8Array, buf2: Uint8Array): number {
        // Simple pixel-wise difference average
        // Since these are JPGs, this is rough but effective for scene changes
        let totalDiff = 0;
        const len = Math.min(buf1.length, buf2.length);
        const sampleStep = 100; // Sample every 100th byte for speed
        
        let samples = 0;
        for (let i = 0; i < len; i += sampleStep) {
            totalDiff += Math.abs(buf1[i] - buf2[i]);
            samples++;
        }
        
        return totalDiff / samples;
    }
}

export const sceneDetectionService = new SceneDetectionService();
