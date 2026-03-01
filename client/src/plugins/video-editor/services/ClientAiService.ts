import { silenceDetectionService } from './SilenceDetectionService';
import { beatDetectionService } from './BeatDetectionService';
import { objectDetectionService } from './ObjectDetectionService';
import { faceDetectionService } from './FaceDetectionService';
import { autoReframeService } from './AutoReframeService';
import { ocrService } from './OcrService';
import { sceneDetectionService } from './SceneDetectionService';

export type ClientAiTool = 'object-detection' | 'face-detection' | 'auto-reframe' | 'silence-detection' | 'beat-sync' | 'ocr' | 'scene-detection';

export class ClientAiService {
    async runTool<T = any>(tool: ClientAiTool, payload: any, onProgress?: (p: number) => void): Promise<T> {
        switch (tool) {
            case 'object-detection':
                return await objectDetectionService.analyzeVideo(payload.videoUrl, onProgress) as unknown as T;
            case 'face-detection':
                return await faceDetectionService.analyzeVideo(payload.videoUrl, onProgress) as unknown as T;
            case 'auto-reframe':
                return await autoReframeService.analyzeVideo(payload.videoUrl, payload.aspectRatio, onProgress) as unknown as T;
            case 'silence-detection':
                return await silenceDetectionService.analyze(payload.videoUrl, { 
                    threshold: payload.threshold,
                    minSilenceDuration: payload.minSilenceDuration,
                    onProgress 
                }) as unknown as T;
            case 'beat-sync':
                return await beatDetectionService.analyze(payload.videoUrl, onProgress) as unknown as T;
            case 'ocr':
                return await ocrService.recognize(payload.mediaUrl, { onProgress }) as unknown as T;
            case 'scene-detection':
                if (payload.ffmpeg) sceneDetectionService.setFFmpeg(payload.ffmpeg);
                return await sceneDetectionService.analyzeVideo(payload.videoUrl, onProgress) as unknown as T;
            default:
                throw new Error(`Unknown client-side tool: ${tool}`);
        }
    }
}

export const clientAiService = new ClientAiService();
