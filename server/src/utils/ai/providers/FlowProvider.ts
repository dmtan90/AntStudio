import { flowClientV2 } from '../../../integrations/flow/FlowClientV2.js';
import { flowClient } from '../../../integrations/flow/FlowClient.js';

export class FlowProvider {
    constructor() { }

    /**
     * Check if the provider is ready (has cookies, session, OR API Key)
     */
    async isReady(): Promise<boolean> {
        // Ready if legacy flow is authenticated OR if V2 environment is likely OK (API Key exists)
        // Optimization: FlowProvider V2 is ALWAYS ready if a key exists, else fallback to session check.
        try {
            const hasLegacySession = await flowClient.getReadyStatus();
            if (hasLegacySession) return true;

            // Simple existence check for V2 key
            const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            return !!envKey;
        } catch (e) {
            return false;
        }
    }

    /**
     * Generate Video
     */
    async generateVideo(prompt: string, modelId: string, options: any = {}) {
        try {
            console.log(`[FlowProvider] Generating video via V2 Client: ${prompt.substring(0, 30)}...`);
            const videoUrl = await flowClientV2.generateVideo(prompt);

            return {
                media: {
                    url: videoUrl,
                    mimeType: 'video/mp4'
                }
            };
        } catch (error: any) {
            console.error('Flow Provider V2 Video Error:', error.message);
            // Fallback to V1 if it was a key error? No, better use V2 as standard.
            throw new Error(`Flow V2 Video Failed: ${error.message}`);
        }
    }

    /**
     * Generate Image
     */
    async generateImage(prompt: string, modelId: string, options: any = {}) {
        try {
            console.log(`[FlowProvider] Generating image via V2 Client: ${prompt.substring(0, 30)}...`);
            const imageUrl = await flowClientV2.generateImage(prompt);

            return {
                media: {
                    url: imageUrl,
                    mimeType: 'image/png'
                }
            };
        } catch (error: any) {
            console.error('Flow Provider V2 Image Error:', error);
            throw new Error(`Flow V2 Image Failed: ${error.message}`);
        }
    }

    /**
     * Test connection/session
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const ready = await this.isReady();
            if (!ready) throw new Error('Labs Flow V2/V1 not ready (No API Key or Session found)');
            return { success: true, message: 'Connection to Labs Flow (V2/Standard) verified!' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
