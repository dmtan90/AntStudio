import { aiStudioClient } from '../../../integrations/aistudio/AIStudioClient.js';

export class AIStudioProvider {
    constructor() { }

    /**
     * Check if the provider is ready (has session)
     */
    async isReady(): Promise<boolean> {
        return aiStudioClient.getReadyStatus();
    }

    /**
     * Generate Text via automated browser
     */
    async generateText(prompt: string, modelId: string = 'gemini-1.5-pro', options: any = {}) {
        try {
            console.log(`[AIStudioProvider] Generating text via Browser Client...`);
            const text = await aiStudioClient.generateText(prompt);
            return { text };
        } catch (error: any) {
            console.error('AIStudio Provider Text Error:', error.message);
            throw new Error(`AIStudio Browser Failed: ${error.message}`);
        }
    }

    async generateJson(prompt: string, modelId: string, options: any = {}) {
        const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no explanations.`;
        const result = await this.generateText(jsonPrompt, modelId, options);

        let text = result.text.trim();
        if (text.startsWith('```json')) text = text.replace(/```json\n?/, '').replace(/\n?```/, '');
        else if (text.startsWith('```')) text = text.replace(/```\n?/, '').replace(/\n?```/, '');

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('[AIStudioProvider] JSON Parse Failed:', text);
            throw new Error('Failed to parse JSON response from AI Studio');
        }
    }

    /**
     * Generate Image via automated browser
     */
    async generateImage(prompt: string, modelId: string = 'imagen-3.0', options: any = {}) {
        try {
            console.log(`[AIStudioProvider] Generating image via Browser Client...`);
            const imageUrl = await aiStudioClient.generateImage(prompt);
            return {
                media: {
                    url: imageUrl,
                    mimeType: 'image/png'
                }
            };
        } catch (error: any) {
            console.error('AIStudio Provider Image Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate Video via automated browser
     */
    async generateVideo(prompt: string, modelId: string = 'veo-2.0', options: any = {}) {
        try {
            console.log(`[AIStudioProvider] Generating video via Browser Client...`);
            const videoUrl = await aiStudioClient.generateVideo(prompt);
            return {
                jobId: `aistudio-browser-${Date.now()}`,
                videoUrl: videoUrl,
                status: 'completed'
            };
        } catch (error: any) {
            console.error('AIStudio Provider Video Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate Audio via automated browser
     */
    async generateAudio(prompt: string, modelId: string, options: any = {}) {
        try {
            console.log(`[AIStudioProvider] Generating audio via Browser Client...`);
            const audioUrl = await aiStudioClient.generateAudio(prompt);
            return {
                media: {
                    url: audioUrl,
                    mimeType: 'audio/mpeg'
                }
            };
        } catch (error: any) {
            console.error('AIStudio Provider Audio Error:', error.message);
            throw error;
        }
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const ready = await aiStudioClient.getReadyStatus();
            return {
                success: ready,
                message: ready ? 'AI Studio browser session is active' : 'Session not ready. Add cookies in Admin cabinet.'
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
