import { aiAccountManager } from '../AIAccountManager.js';
import { CloudCodeClient } from '../../../integrations/ai/CloudCodeClient.js';
import { AntigravityClient } from '../../../integrations/ai/AntigravityClient.js';

export class GeminiChatProvider {
    constructor() { }

    async isReady() {
        const account = await aiAccountManager.getOptimalAccount('text');
        return !!account;
    }

    async generateText(prompt: string | any[], modelId: string = 'gemini-2.5-flash', options: any = {}) {
        try {
            const account = await aiAccountManager.getOptimalAccount('text');
            if (!account) throw new Error('No active AI accounts available');

            console.log(`[GeminiChatProvider] Generating text via multi-account pool (${account.email})`);

            let client: any;
            if (account.accountType === 'antigravity') {
                client = new AntigravityClient(account);
            } else {
                client = new CloudCodeClient(account);
            }

            // console.log("[GeminiChatProvider] generate text", prompt, modelId, options);
            const result = await client.generateContent(prompt, modelId, options);

            // Record usage
            await aiAccountManager.recordUsage(account, modelId);

            return result;
        } catch (error: any) {
            console.error('GeminiChat Provider Text Error:', error.message);
            throw new Error(`GeminiChat API Failed: ${error.message}`);
        }
    }

    async generateJson(prompt: string | any[], modelId: string, options: any = {}) {
        // console.log("generateJson", prompt, modelId, options);
        let fullPrompt: any[] = [];
        if (Array.isArray(prompt)) {
            fullPrompt = [...prompt, { text: "\n\nRespond ONLY with valid JSON. No markdown." }];
        } else {
            fullPrompt = [{ text: `${prompt}\n\nRespond ONLY with valid JSON. No markdown.` }];
        }
        const result = await this.generateText(fullPrompt, modelId, options);
        let text = result.text.trim();
        if (text.startsWith('```json')) text = text.replace(/```json\n?/, '').replace(/\n?```/, '');
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Failed to parse JSON response from Gemini Chat');
        }
    }

    /**
     * Generate Video via Vertex AI Veo
     */
    async generateVideo(prompt: string, modelId: string = 'veo-2.0-generate-001', options: any = {}) {
        try {
            const account = await aiAccountManager.getOptimalAccount('video');
            if (!account) throw new Error('No active AI accounts available');

            let client: any;
            if (account.accountType === 'antigravity') {
                client = new AntigravityClient(account);
            } else {
                client = new CloudCodeClient(account);
            }

            const result = await client.generateVideo(prompt, modelId);

            // Record usage
            await aiAccountManager.recordUsage(account, modelId);

            return { media: result };
        } catch (error: any) {
            console.error('GeminiChat Provider Video Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate Image via Vertex AI Imagen
     */
    async generateImage(prompt: string | any[], modelId: string = 'imagen-3.0-generate-001', options: any = {}) {
        try {
            const account = await aiAccountManager.getOptimalAccount('image');
            if (!account) throw new Error('No active AI accounts available');

            let client: any;
            if (account.accountType === 'antigravity') {
                client = new AntigravityClient(account);
            } else {
                client = new CloudCodeClient(account);
            }

            const result = await client.generateImage(prompt, modelId);

            // Record usage
            await aiAccountManager.recordUsage(account, modelId);

            return { media: result };
        } catch (error: any) {
            console.error('GeminiChat Provider Image Error:', error.message);
            throw error;
        }
    }

    /**
     * Test connection/pool status
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const ready = await this.isReady();
            return {
                success: ready,
                message: ready ? 'Gemini multi-account pool is ready' : 'No active AI accounts found.'
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
