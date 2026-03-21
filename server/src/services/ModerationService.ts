import { generateJSON } from '../utils/AIGenerator.js';
import { Logger } from '../utils/Logger.js';
import { promptService } from './PromptService.js';

/**
 * ModerationService: Uses AI to vet prompts and media for safety.
 */
export class ModerationService {
    constructor() {}

    /**
     * Vets a text prompt for safety.
     */
    public async vetPrompt(input: string) {
        try {
            const prompt = await promptService.get('ai/moderation', {
                input
            });
            return await generateJSON(prompt);
        } catch (error: any) {
            Logger.error('[Moderation] Prompt vetting failed:', error.message);
            return { flagged: false, categories: [], explanation: 'Moderation error' };
        }
    }

    /**
     * Vets an image for safety (multimodal).
     */
    public async vetMedia(imageBuffer: Buffer, mimeType: string) {
        try {
            const prompt = await promptService.get('ai/moderation', {
                input: '[Attached Image]'
            });
            
            return await generateJSON([
                { text: prompt },
                { inlineData: { data: imageBuffer.toString('base64'), mimeType } }
            ]);
        } catch (error: any) {
            Logger.error('[Moderation] Media vetting failed:', error.message);
            return { flagged: false, categories: [], explanation: 'Moderation error' };
        }
    }
}

export const moderationService = new ModerationService();
