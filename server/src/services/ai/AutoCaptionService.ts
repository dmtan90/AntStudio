import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from './PromptService.js';

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

    /**
     * Fallback helper to estimate timed captions from text content.
     */
    public generateTextBasedCaptions(text: string) {
        if (!text || !text.trim()) return [];
        
        // Split text by sentence or clause boundaries
        const sentences = text
            .split(/(?<=[.!?])\s+|(?<=[,;])\s+/)
            .map(s => s.trim())
            .filter(Boolean);

        const captions: Array<{ start: number; end: number; text: string }> = [];
        let currentStart = 0.0;

        for (const sentence of sentences) {
            const words = sentence.split(/\s+/).filter(Boolean);
            if (words.length === 0) continue;

            // Roughly 0.35s per word, minimum 1.8s per caption phrase
            const duration = Math.max(1.8, Math.round(words.length * 0.35 * 10) / 10);
            const currentEnd = Math.round((currentStart + duration) * 10) / 10;

            captions.push({
                start: currentStart,
                end: currentEnd,
                text: sentence
            });

            currentStart = currentEnd;
        }

        return captions;
    }
}

export const autoCaptionService = new AutoCaptionService();
