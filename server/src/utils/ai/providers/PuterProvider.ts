import { puterService } from '../../../services/ai/PuterService.js';

export class PuterProvider {
    constructor() { }

    /**
     * Check if the provider is ready
     */
    async isReady(): Promise<boolean> {
        return true; // Puter is always ready as long as the library is installed
    }

    /**
     * Generate Text via Puter
     */
    async generateText(prompt: string, modelId: string = 'gpt-4o-mini', options: any = {}) {
        try {
            const response: any = await puterService.chat(prompt, modelId, options);
            const text = response?.message?.content || response?.toString() || '';
            return { text };
        } catch (error: any) {
            console.error('[PuterProvider] Text Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate Image via Puter
     */
    async generateImage(prompt: string, modelId: string = 'flux', options: any = {}) {
        try {
            const response: any = await puterService.generateImage(prompt);
            return {
                media: {
                    url: response?.src || response?.url || '',
                    mimeType: 'image/png'
                }
            };
        } catch (error: any) {
            console.error('[PuterProvider] Image Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate Audio (TTS) via Puter
     */
    async generateAudio(text: string, modelId: string = 'elevenlabs', options: any = {}) {
        try {
            const response: any = await puterService.tts(text);
            return {
                media: {
                    url: response?.src || response?.url || '',
                    mimeType: 'audio/mpeg'
                }
            };
        } catch (error: any) {
            console.error('[PuterProvider] Audio Error:', error.message);
            throw error;
        }
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            // Simple ping check
            await puterService.chat('ping', 'gpt-4o-mini');
            return { success: true, message: 'Puter AI Service is reachable' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
