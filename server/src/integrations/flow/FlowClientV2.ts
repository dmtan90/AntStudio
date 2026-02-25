import { flowApiClientV2 } from './FlowApiClientV2.js';
import { flowApiClient } from './FlowApiClient.js';
import { AdminSettings } from '../../models/AdminSettings.js';

/**
 * FlowClientV2: Orchestrated client for Google Labs / Antigravity
 * Adopts the Unified Payload logic from antigravity2api-nodejs.
 * @deprecated Use FlowProvider (via FlowApiClient) instead.
 */
export class FlowClientV2 {

    /**
     * Get the active Gemini API Key
     */
    private async getActiveKey(): Promise<string | undefined> {
        const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (envKey) return envKey;

        const settings = await AdminSettings.findOne();
        const providerKey = settings?.aiSettings?.providers?.find(p => p.id === 'google' && p.isActive)?.apiKey;
        if (providerKey) return providerKey;

        return settings?.geminiApiKeys?.find(k => k.isActive)?.key;
    }

    /**
     * Ensure session context (Technique from V1)
     */
    private async ensureContext() {
        const settings = await AdminSettings.findOne();
        const stToken = settings?.aiSettings?.flowSessionToken;
        if (!stToken) throw new Error('Flow Session Token missing in AdminSettings');

        const { at } = await flowApiClient.getAccessToken(stToken);

        const flowWorkspaceUrls = settings.aiSettings.flowWorkspaceUrls || [];
        let projectId = '';
        if (flowWorkspaceUrls.length > 0) {
            const match = flowWorkspaceUrls[0].match(/project\/([a-f0-9-]+)/);
            if (match) projectId = match[1];
        }

        if (!projectId) {
            projectId = await flowApiClient.createProject(stToken, "AntStudio Production");
        }

        return { at, projectId, stToken, apiKey: await this.getActiveKey() };
    }

    /**
     * Generate Video (V2 Antigravity Path)
     */
    async generateVideo(prompt: string): Promise<string> {
        console.log('[FlowV2] Triggering Video Generation (Unified Path)...');
        const { at, projectId, stToken, apiKey } = await this.ensureContext();

        const startGen = async (rToken: string = "") => {
            return await flowApiClientV2.generateVideo(prompt, at, projectId, {
                apiKey,
                recaptchaToken: rToken
            });
        };

        try {
            let operationName = "";
            let sceneId = "";

            try {
                const result = await startGen("");
                operationName = result.operationName;
                sceneId = result.sceneId;
            } catch (err: any) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    console.log('[FlowV2] 403/401 Detected. Invoking Background Solver...');
                    const rToken = await flowApiClient.solveCaptcha(stToken, projectId);
                    const result = await startGen(rToken);
                    operationName = result.operationName;
                    sceneId = result.sceneId;
                } else {
                    throw err;
                }
            }

            console.log(`[FlowV2] Generation Started: ${operationName}. Polling...`);
            let attempts = 0;
            while (attempts < 60) {
                const { status, url } = await flowApiClientV2.checkVideoStatus(operationName, sceneId, at, apiKey);
                if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') return url || '';
                await new Promise(r => setTimeout(r, 8000));
                attempts++;
            }
            throw new Error('Video generation timed out.');
        } catch (err: any) {
            console.error('[FlowV2] Video Path Failed:', err.message);
            throw err;
        }
    }

    /**
     * Generate Image (V2 Antigravity Path)
     */
    async generateImage(prompt: string): Promise<string> {
        console.log('[FlowV2] Triggering Image Generation (Unified Path)...');
        const { at, projectId, stToken, apiKey } = await this.ensureContext();

        const startGen = async (rToken: string = "") => {
            return await flowApiClientV2.generateImage(prompt, at, projectId, {
                apiKey,
                recaptchaToken: rToken
            });
        };

        try {
            try {
                return await startGen("");
            } catch (err: any) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    console.log('[FlowV2] 403/401 Detected. Solving reCAPTCHA...');
                    const rToken = await flowApiClient.solveCaptcha(stToken, projectId);
                    return await startGen(rToken);
                } else {
                    throw err;
                }
            }
        } catch (err: any) {
            console.error('[FlowV2] Image Path Failed:', err.message);
            throw err;
        }
    }
}

export const flowClientV2 = new FlowClientV2();
