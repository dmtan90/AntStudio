import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../../services/PromptService.js';

/**
 * AutoCaptionService: Generates subtitles for video content.
 * Uses Gemini 2.0 Flash for transcription and segment timing.
 */
export class AutoCaptionService {
    constructor() {}

    /**
     * Generates timed captions for a video buffer.
     */
    public async generateCaptions(videoBuffer: Buffer, mimeType: string) {
        try {
            const prompt = await promptService.get('ai/captions');

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
            Logger.error('[AutoCaption] Generation failed:', error.message);
            return [];
        }
    }
}

export const autoCaptionService = new AutoCaptionService();
