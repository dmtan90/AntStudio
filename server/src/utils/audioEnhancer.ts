import { generateText } from './AIGenerator.js';
import { uploadToS3 } from './s3.js';
import { Logger } from './Logger.js';
import { promptService } from '../services/ai/PromptService.js';

/**
 * Service for AI-powered audio enhancement (denoising, clarity).
 * Utilizes Gemini 2.0 Flash for audio analysis and enhancement instruction.
 */
export const enhanceAudioFile = async (buffer: Buffer, mimeType: string, userId: string): Promise<{ url: string, key: string }> => {
    try {
        const audioBase64 = buffer.toString('base64');

        const promptTemplate = await promptService.get('ai/audio_enhancement');

        const promptParts = [
            { text: promptTemplate },
            { inlineData: { data: audioBase64, mimeType } }
        ];

        await generateText(promptParts, undefined);

        const s3Key = `projects/${userId}/audio/enhanced_${Date.now()}.mp3`;

        // Simulating enhancement for now
        const upload = await uploadToS3(s3Key, buffer, mimeType);

        return {
            url: upload.url,
            key: upload.key
        };
    } catch (error: any) {
        Logger.error('[AudioEnhancer] Enhancement failed', 'AudioEnhancer', { error });
        throw error;
    }
};
