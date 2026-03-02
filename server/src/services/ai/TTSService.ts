import { aiManager } from '../../utils/ai/AIServiceManager.js';

export class TTSService {
    constructor() {}

    /**
     * Generate speech from text using specified provider
     */
    async generateSpeech(options: {
        text: string;
        provider: string;
        voiceId: string;
        language?: string;
    }): Promise<{ media: { url: string; mimeType: string } }> {
        const { text, provider, voiceId, language } = options;

        switch (provider) {
            case 'google': {
                return await aiManager.generateAudio(text, undefined, 'google', { voiceId, languageCode: language, providerId: "google" });
            }

            case 'gemini': {
                return await aiManager.generateAudio(text, undefined, 'google', { voiceId, language, providerId: "gemini" });
            }

            default:
                throw new Error(`Unsupported TTS provider: ${provider}`);
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    async synthesizeSpeech(text: string, voiceId?: string): Promise<{ url: string }> {
        const result = await this.generateSpeech({
            text,
            provider: 'google',
            voiceId: voiceId || 'en-US-Standard-A',
            language: 'en-US'
        });

        return {
            url: result.media.url
        };
    }
}

export const ttsService = new TTSService();
