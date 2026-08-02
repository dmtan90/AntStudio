import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from './PromptService.js';

/**
 * SceneDetectionService: Detects scene boundaries in video content.
 * Uses Gemini 2.0 Flash for semantic segmentation.
 */
export class SceneDetectionService {
    constructor() {}

    /**
     * Identifies scene cuts and content from a video buffer.
     */
    public async detectScenes(videoBuffer: Buffer, mimeType: string) {
        try {
            const prompt = await promptService.get('ai/scene_detection');

            const promptParts = [
                { text: prompt },
                {
                    inlineData: {
                        data: videoBuffer.toString('base64'),
                        mimeType: mimeType
                    }
                }
            ];

            return await generateJSON(promptParts);
        } catch (error: any) {
            Logger.error('[SceneDetection] Detection failed:', error.message);
            return [];
        }
    }
}

export const sceneDetectionService = new SceneDetectionService();
