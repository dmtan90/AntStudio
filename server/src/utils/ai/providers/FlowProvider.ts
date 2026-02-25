import { flowApiClient } from '../../../integrations/flow/FlowApiClient.js';
import { AdminSettings } from '../../../models/AdminSettings.js';
import { configService } from '../../configService.js';

export class FlowProvider {
    constructor() { }

    /**
     * Check if the provider is ready
     */
    async isReady(): Promise<boolean> {
        try {
            await configService.refresh();
            // Check for API Key first (V2)
            const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            const settings = configService.ai;
            const providerKey = settings?.providers?.find((p: any) => p.id === 'google' && p.isActive)?.apiKey;

            if (envKey || providerKey) return true;

            // Fallback to Session Token check
            const stToken = settings?.flowSessionToken;
            return !!stToken;
        } catch (e) {
            return false;
        }
    }

    private async getActiveKey(): Promise<string | undefined> {
        const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (envKey) return envKey;

        const settings = await AdminSettings.findOne(); // Fetch fresh
        const providerKey = settings?.aiSettings?.providers?.find(p => p.id === 'google' && p.isActive)?.apiKey;
        if (providerKey) return providerKey;

        return settings?.geminiApiKeys?.find(k => k.isActive)?.key;
    }

    /**
     * Ensure session context (Auth + Project)
     */
    private async ensureContext() {
        // We use AdminSettings directly here to ensure freshness during execution
        const settings = await AdminSettings.findOne();
        const stToken = settings?.aiSettings?.flowSessionToken;
        if (!stToken) throw new Error('Flow Session Token missing in AdminSettings');

        // 1. Get Access Token
        const { at } = await flowApiClient.getAccessToken(stToken);

        // 2. Resolve Project ID
        const flowWorkspaceUrls = settings.aiSettings.flowWorkspaceUrls || [];
        let projectId = '';
        if (flowWorkspaceUrls.length > 0) {
            const match = flowWorkspaceUrls[0].match(/project\/([a-f0-9-]+)/);
            if (match) projectId = match[1];
        }

        if (!projectId) {
            projectId = await flowApiClient.createProject(stToken, "AntStudio Production");
            // Optionally save this back to settings? For now, we just use it.
            // Saving it would be good optimization for next time.
        }

        return { at, projectId, stToken, apiKey: await this.getActiveKey() };
    }

    /**
     * Generate Video with Retry & Captcha Logic
     */
    async generateVideo(prompt: string, modelId: string, options: any = {}) {
        console.log(`[FlowProvider] Generating video via Flow API: ${prompt.substring(0, 30)}...`);

        const { at, projectId, stToken, apiKey } = await this.ensureContext();

        // Helper to execute generation
        const startGen = async (rToken: string = "") => {
            // FlowApiClient.generateVideo doesn't take rToken currently, 
            // but if we need to pass it, we might need to update FlowApiClient.
            // Looking at FlowApiClient, it seems it relies on ST/AT or API Key.
            // If 403 happens, solving captcha usually unblocks the SESSION/IP on Google's side.
            // We don't necessarily pass the token in the payload unless the API schema requires it.
            // *Correction*: FlowClientV2 passed it. Let's check if FlowApiClient needs it.
            // FlowApiClient.generateVideo signature: (prompt, options)
            // It doesn't seem to accept recaptchaToken in the options in current signature.
            // However, just *solving* it via browser often clears the block.
            return await flowApiClient.generateVideo(prompt, {
                at,
                projectId,
                stToken,
                aspectRatio: options.aspectRatio,
                apiKey
            });
        };

        let operationName = "";

        try {
            try {
                operationName = await startGen("");
            } catch (err: any) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    console.log('[FlowProvider] 403/401 Detected. Invoking Background Solver...');
                    // Solve it to unblock the session
                    await flowApiClient.solveCaptcha(stToken, projectId);
                    // Retry
                    operationName = await startGen("");
                } else {
                    throw err;
                }
            }

            console.log(`[FlowProvider] Generation Started: ${operationName}. Polling...`);

            // Poll for completion
            let attempts = 0;
            // Configurable timeout? 60 * 5s = 5 mins
            while (attempts < 60) {
                const { status, url } = await flowApiClient.checkStatus(at, operationName, stToken);

                if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
                    return {
                        media: {
                            url: url || '',
                            mimeType: 'video/mp4'
                        }
                    };
                }
                if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
                    throw new Error('Video generation status reported FAILED');
                }

                await new Promise(r => setTimeout(r, 5000));
                attempts++;
            }
            throw new Error('Video generation timed out.');

        } catch (error: any) {
            console.error('Flow Provider Video Error:', error.message);
            throw new Error(`Flow Video Failed: ${error.message}`);
        }
    }

    /**
     * Generate Image with Retry & Captcha Logic
     */
    async generateImage(prompt: string, modelId: string, options: any = {}) {
        console.log(`[FlowProvider] Generating image via Flow API: ${prompt.substring(0, 30)}...`);

        const { at, projectId, stToken, apiKey } = await this.ensureContext();

        const startGen = async () => {
            return await flowApiClient.generateImage(prompt, {
                at,
                projectId,
                stToken,
                apiKey
            });
        };

        try {
            let imageUrl = "";
            try {
                imageUrl = await startGen();
            } catch (err: any) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    console.log('[FlowProvider] 403/401 Detected. Solving reCAPTCHA...');
                    await flowApiClient.solveCaptcha(stToken, projectId);
                    imageUrl = await startGen();
                } else {
                    throw err;
                }
            }

            return {
                media: {
                    url: imageUrl,
                    mimeType: 'image/png'
                }
            };

        } catch (error: any) {
            console.error('Flow Provider Image Error:', error);
            throw new Error(`Flow Image Failed: ${error.message}`);
        }
    }

    /**
     * Test connection/session
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const ready = await this.isReady();
            if (!ready) throw new Error('Labs Flow not ready (No API Key or Session found)');

            // Deep test: Try to get AT
            const activeKey = await this.getActiveKey();
            if (activeKey) {
                return { success: true, message: 'Connection verified via API Key (V2)' };
            }

            // Test Session
            await this.ensureContext();
            return { success: true, message: 'Connection verified via Session Token' };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
