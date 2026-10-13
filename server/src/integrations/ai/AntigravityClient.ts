import axios from 'axios';
import crypto from 'crypto';
import { IAIAccount } from '../../models/AIAccount.js';
import { aiAccountManager } from '../../utils/ai/AIAccountManager.js';
import { EnvConfig } from '~/utils/ConfigService.js';
import { Logger } from '../../utils/Logger.js';
import { antigravityModelSelector } from './AntigravityModelSelector.js';

/**
 * AntigravityClient: client for the Antigravity agent gateway (Cloud Code PA), using the embedded
 * Antigravity OAuth client. Text generation follows openvideo/apps/shine (AntigravityClient):
 * the model is chosen from the gateway's current model list, JSON requests get a JSON system
 * instruction, and every text part of the answer is returned (thinking models put a thought part
 * first).
 */
export class AntigravityClient {
    private static AGENT_ENDPOINT = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
    /** Project used by the gateway when the account has no Cloud Code companion project */
    private static DEFAULT_PROJECT = 'aicode-consumers';

    // Discovered credentials from research repo
    public static readonly CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
    public static readonly CLIENT_SECRET = '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';

    public static readonly SCOPES = [
        'https://www.googleapis.com/auth/cloud-platform',
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/cclog',
        'https://www.googleapis.com/auth/experimentsandconfigs'
    ];

    private static readonly IDENTITY_PROFILE = 'You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.\nYou are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.';

    private static readonly JSON_SYSTEM_INSTRUCTION =
        'You are an automated high-precision JSON API engine. You MUST respond ONLY with a valid, parseable JSON object or array. ' +
        'Do NOT include any introductory greetings, conversational commentary, code blocks, or markdown explanations. ' +
        'Your entire output must start with "{" or "[" and end with "}" or "].';

    /** Accounts that answered 429, by account id: skipped until the time stored */
    private static cooldownUntil = new Map<string, number>();
    private static RATE_LIMIT_COOLDOWN_MS = 90 * 1000;

    private account: IAIAccount;

    constructor(account: IAIAccount) {
        this.account = account;
    }

    /**
     * Generate 128-bit internal request ID
     */
    private generateRequestId(): string {
        return crypto.randomUUID();
    }

    /**
     * Get headers required for Agentic API requests
     */
    private getHeaders(token: string): Record<string, string> {
        const host = AntigravityClient.AGENT_ENDPOINT.replace('https://', '');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Host': host,
            'User-Agent': 'antigravity/1.13.3 windows/amd64',
            'Accept-Encoding': 'gzip'
        };
    }

    /** Cloud Code companion project of the account, or the gateway's default project. */
    private async resolveProjectId(): Promise<string> {
        try {
            const projectId = await aiAccountManager.discoverProjectId(this.account);
            if (projectId && projectId.trim()) return projectId;
        } catch (err: any) {
            Logger.warn(`[AntigravityClient] Project discovery failed for ${this.account.email}: ${err.message}`, 'AntigravityClient');
        }
        return AntigravityClient.DEFAULT_PROJECT;
    }

    /**
     * Text / JSON generation through the agent gateway.
     *
     * options: systemPrompt / systemInstruction, jsonMode (or generationConfig.responseMimeType =
     * application/json), temperature, maxOutputTokens, generationConfig overrides.
     */
    public async generateContent(prompt: string | any[], modelId: string = EnvConfig.geminiModelTextAnalysis, options: any = {}): Promise<{ text: string }> {
        const coolingUntil = AntigravityClient.cooldownUntil.get(String(this.account._id)) || 0;
        if (coolingUntil > Date.now()) {
            throw new Error(`Antigravity account ${this.account.email} is rate limited for ${Math.ceil((coolingUntil - Date.now()) / 1000)}s more`);
        }

        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const projectId = options._projectId || await this.resolveProjectId();
        // Gateway model ids differ from the Gemini API ones and change over time
        const gatewayModel = await antigravityModelSelector.resolve(token, projectId, modelId, !!options._forceModelRefresh);

        const jsonMode = !!options.jsonMode || options.generationConfig?.responseMimeType === 'application/json';
        let systemPromptText: string = options.systemInstruction || options.systemPrompt || '';
        if (jsonMode) {
            systemPromptText = systemPromptText.trim()
                ? `${AntigravityClient.JSON_SYSTEM_INSTRUCTION}\n\nTask Instructions:\n${systemPromptText.trim()}`
                : AntigravityClient.JSON_SYSTEM_INSTRUCTION;
        } else if (!systemPromptText.includes('You are Antigravity')) {
            systemPromptText = systemPromptText.trim()
                ? `${AntigravityClient.IDENTITY_PROFILE}\n\n${systemPromptText.trim()}`
                : AntigravityClient.IDENTITY_PROFILE;
        }

        const parts = Array.isArray(prompt)
            ? prompt.map((p) => (typeof p === 'string' ? { text: p } : p))
            : [{ text: String(prompt) }];

        const generationConfig: Record<string, any> = {
            temperature: options.temperature !== undefined ? options.temperature : (jsonMode ? 0.2 : 0.7),
            topP: 0.85,
            topK: 50,
            maxOutputTokens: options.maxOutputTokens || 65535, // large, so long JSON is not truncated
            ...(options.generationConfig || {}),
        };
        if (jsonMode) generationConfig.responseMimeType = 'application/json';

        const payload: any = {
            requestId: this.generateRequestId(),
            request: {
                contents: [{ role: 'user', parts }],
                generationConfig,
            },
            model: gatewayModel,
            userAgent: 'antigravity/2.5.5 windows/amd64',
            requestType: 'agent',
            project: projectId,
        };
        if (systemPromptText.trim()) {
            payload.request.systemInstruction = { parts: [{ text: systemPromptText.trim() }] };
        }

        try {
            // Long JSON outputs take 60-120s
            const response = await axios.post(url, payload, { headers, timeout: 180000 });
            const candidates = response.data.response?.candidates || [];
            if (candidates.length === 0) throw new Error('No candidates returned from Antigravity API');

            const content = candidates[0].content;
            if (!content?.parts?.length) {
                throw new Error('Antigravity Generation failed: Malformed content');
            }

            // Skip thought parts; join the answer parts
            const text = content.parts.filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
            return { text };
        } catch (error: any) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.error?.message || error.message || '';
            Logger.error(`[AntigravityClient] generateContent failed (${status ?? 'no status'}, model ${gatewayModel}): ${errMsg}`, 'AntigravityClient');

            // 404: usually the chosen model was renamed/retired; otherwise the project is wrong
            if (status === 404 && !options._isRetry) {
                antigravityModelSelector.invalidate();
                const nextModel = await antigravityModelSelector.resolve(token, projectId, modelId, true);
                const modelChanged = nextModel !== gatewayModel;
                Logger.warn(modelChanged
                    ? `[AntigravityClient] Model "${gatewayModel}" is no longer offered; switched to "${nextModel}".`
                    : `[AntigravityClient] 404 for model ${gatewayModel} (project: ${projectId}). Retrying with the default project...`,
                    'AntigravityClient');
                return this.generateContent(prompt, modelId, {
                    ...options,
                    _isRetry: true,
                    _projectId: modelChanged ? projectId : AntigravityClient.DEFAULT_PROJECT,
                });
            }

            // Rate limited: skip this account for a short cooldown; the caller's chain moves to the next credential
            if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(errMsg)) {
                AntigravityClient.cooldownUntil.set(String(this.account._id), Date.now() + AntigravityClient.RATE_LIMIT_COOLDOWN_MS);
                Logger.warn(`[AntigravityClient] Account ${this.account.email} rate-limited; skipping it for ${AntigravityClient.RATE_LIMIT_COOLDOWN_MS / 1000}s.`, 'AntigravityClient');
            }

            throw error;
        }
    }

    /**
     * Generate Image (via Agent Gateway)
     */
    public async generateImage(prompt: string | any[], modelId: string = EnvConfig.geminiModelImageGeneration): Promise<{ url: string }> {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const parts: any[] = Array.isArray(prompt) ? prompt : [{ text: prompt }];
        const payload: any = {
            requestId: this.generateRequestId(),
            request: {
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    candidateCount: 1,
                    imageConfig: { imageSize: '1K' }
                }
            },
            model: modelId,
            userAgent: 'antigravity/1.13.3 windows/amd64',
            requestType: 'image_gen',
            project: await this.resolveProjectId()
        };

        try {
            const response = await axios.post(url, payload, { headers, timeout: 180000 });
            const candidates = response.data.response?.candidates || [];
            if (candidates.length === 0) throw new Error('No candidates returned from Antigravity Image API');

            // Part 0 is often a thoughtSignature; the image is in the first inlineData part
            const imagePart = (candidates[0]?.content?.parts || []).find((part: any) => part?.inlineData?.data);
            if (!imagePart) {
                throw new Error('No image data found in Antigravity response parts');
            }
            const mimeType = imagePart.inlineData.mimeType || 'image/png';
            return { url: `data:${mimeType};base64,${imagePart.inlineData.data}` };
        } catch (error: any) {
            Logger.error(`[AntigravityClient] Image API Error: ${error.response?.data?.error?.message || error.message}`, 'AntigravityClient');
            throw new Error(`Antigravity Image Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Video (Vertex AI Veo via Agent Gateway)
     */
    public async generateVideo(prompt: string, modelId: string = 'veo-3.0-fast-generate-preview', options: any = {}) {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;
        const projectId = await this.resolveProjectId();
        const sceneId = `scene_${Date.now()}`;

        const payload = {
            clientContext: {
                projectId: projectId,
                tool: 'PINHOLE',
                userPaygateTier: 'PAYGATE_TIER_TWO'
            },
            requests: [{
                aspectRatio: options.aspectRatio || 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                seed: options.seed || Math.floor(Math.random() * 1000000),
                textInput: { prompt },
                videoModelKey: modelId,
                imageStart: options.imageStart || options.image,
                imageEnd: options.imageEnd,
                characterReferences: options.characterReferences || options.characterImages || [],
                metadata: { sceneIdList: [sceneId] }
            }],
            project: projectId
        };

        try {
            Logger.info(`[AntigravityClient] Requesting video generation for project: ${projectId}`);
            const response = await axios.post(url, payload, { headers });
            const operationName = response.data.operations?.[0]?.operation?.name;

            if (!operationName) {
                throw new Error('No operation name returned from Antigravity/Veo API');
            }

            return {
                url: operationName,
                operationName,
                sceneId,
                statusUrl: `${AntigravityClient.AGENT_ENDPOINT}/video:batchCheckAsyncVideoGenerationStatus`
            };
        } catch (error: any) {
            Logger.error(`[AntigravityClient] Video API Error: ${error.response?.data?.error?.message || error.message}`, 'AntigravityClient');
            throw new Error(`Antigravity Video Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Audio (Multimodal TTS via Agent Gateway)
     */
    public async generateAudio(text: string, voiceId: string = 'Puck', modelId: string = EnvConfig.geminiModelTTS, options: any = {}) {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const payload = {
            project: await this.resolveProjectId(),
            requestId: this.generateRequestId(),
            request: {
                contents: [{ role: 'user', parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voiceId,
                                pitch: options.pitch || 0.0,
                                rate: options.rate || 1.0
                            }
                        }
                    }
                }
            },
            model: modelId,
            userAgent: 'antigravity/1.13.3 windows/amd64',
            requestType: 'agent'
        };

        try {
            const response = await axios.post(url, payload, { headers, timeout: 180000 });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
            if (!part) {
                throw new Error('No audio data returned from Antigravity/TTS API');
            }

            return {
                url: `data:${part.inlineData.mimeType || 'audio/wav'};base64,${part.inlineData.data}`,
                mimeType: part.inlineData.mimeType || 'audio/wav'
            };
        } catch (error: any) {
            Logger.error(`[AntigravityClient] Audio API Error: ${error.response?.data?.error?.message || error.message}`, 'AntigravityClient');
            throw new Error(`Antigravity Audio Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Music (Lyria/MusicFX via Agent Gateway)
     */
    public async generateMusic(prompt: string, modelId: string = 'lyria-002', _options: any = {}) {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const payload = {
            project: await this.resolveProjectId(),
            requestId: this.generateRequestId(),
            request: {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            },
            model: modelId,
            userAgent: 'antigravity/1.13.3 windows/amd64',
            requestType: 'music_gen'
        };

        try {
            const response = await axios.post(url, payload, { headers, timeout: 180000 });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);

            if (!part) {
                // Some models return an operation name instead of inline data
                if (response.data.name || response.data.response?.name) {
                    return { url: response.data.name || response.data.response?.name };
                }
                throw new Error('No music data returned from Antigravity/Music API');
            }

            return {
                url: `data:${part.inlineData.mimeType || 'audio/mpeg'};base64,${part.inlineData.data}`,
                mimeType: part.inlineData.mimeType || 'audio/mpeg'
            };
        } catch (error: any) {
            Logger.error(`[AntigravityClient] Music API Error: ${error.response?.data?.error?.message || error.message}`, 'AntigravityClient');
            throw new Error(`Antigravity Music Gen failed: ${error.message}`);
        }
    }

    /**
     * Fetch available models (and remaining quota) offered by the Antigravity gateway
     */
    public async fetchAvailableModels(): Promise<any[]> {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:fetchAvailableModels`;

        try {
            Logger.info(`[AntigravityClient] Fetching available models for ${this.account.email}...`);
            const projectId = await this.resolveProjectId();
            const response = await axios.post(url, { project: projectId }, { headers, timeout: 15000 });

            const result = Object.entries(response.data.models || {}).map(([name, info]: [string, any]) => ({
                id: name,
                displayName: info?.displayName || name,
                remainingFraction: typeof info?.quotaInfo?.remainingFraction === 'number' ? info.quotaInfo.remainingFraction : 1,
                resetTime: info?.quotaInfo?.resetTime
            }));

            Logger.info(`[AntigravityClient] Discovered ${result.length} models for ${this.account.email}`);
            return result;
        } catch (error: any) {
            Logger.error(`[AntigravityClient] Fetch Models API Error: ${error.response?.data?.error?.message || error.message}`, 'AntigravityClient');
            throw new Error(`Antigravity Model Fetch failed: ${error.message}`);
        }
    }
}
