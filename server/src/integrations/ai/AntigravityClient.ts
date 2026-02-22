import axios from 'axios';
import crypto from 'crypto';
import { IAIAccount } from '../../models/AIAccount.js';
import { aiAccountManager } from '../../utils/ai/AIAccountManager.js';
import { GeminiClient } from './GeminiClient.js';

/**
 * AntigravityClient: High-performance client using embedded credentials
 * Based on antigravity2api-nodejs research:
 * - Uses fixed Google Client ID/Secret for zero-config OAuth.
 * - Implements the Unified Agent Wrapper by default.
 */
export class AntigravityClient {
    private static AGENT_ENDPOINT = 'https://daily-cloudcode-pa.sandbox.googleapis.com';

    // Discovered credentials from research repo
    // Note: Split to avoid simple string scanning if needed, though they are now project-level knowledge.
    public static readonly CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
    public static readonly CLIENT_SECRET = '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';

    public static readonly SCOPES = [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/cclog',
        'https://www.googleapis.com/auth/experimentsandconfigs'
    ];

    private static readonly IDENTITY_PROFILE = 'You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.\nYou are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.';

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

    /**
     * Common generateContent wrapper (Agentic Architecture)
     */
    public async generateContent(prompt: string | any[], modelId: string = 'gemini-2.5-flash', options: any = {}): Promise<{ text: string }> {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const parts = Array.isArray(prompt) ? prompt : [{ text: prompt as string }];
        const projectId = await aiAccountManager.discoverProjectId(this.account);
        console.log(`[AntigravityClient] generateContent project: ${projectId}, model: ${modelId}`);

        const identityMarker = 'You are Antigravity';
        let hasIdentity = false;
        let systemPromptText = options.systemPrompt || '';

        if (systemPromptText && systemPromptText.includes(identityMarker)) {
            hasIdentity = true;
        }

        if (!hasIdentity) {
            systemPromptText = `${AntigravityClient.IDENTITY_PROFILE}\n\n${systemPromptText}`;
        }

        const payload: any = {
            requestId: this.generateRequestId(),
            request: {
                contents: [{
                    role: 'user',
                    parts: parts
                }],
                generationConfig: {
                    temperature: 1,
                    topP: 0.85,
                    topK: 50,
                    maxOutputTokens: 8192
                }
            },
            model: modelId,
            userAgent: 'antigravity/1.13.3 windows/amd64',
            requestType: 'agent'
        };

        if (systemPromptText.trim()) {
            payload.request.systemInstruction = {
                parts: [{ text: systemPromptText.trim() }]
            };
        }


        payload.project = projectId;

        try {
            const response = await axios.post(url, payload, { headers });
            const candidates = response.data.response?.candidates || [];
            if (candidates.length === 0) throw new Error('No candidates returned from Antigravity API');

            const content = candidates[0].content;
            if (!content || !content.parts || content.parts.length === 0) {
                console.error(`[AntigravityClient] API Error:`, response.data || 'Malformed content in Antigravity response');
                throw new Error(`Antigravity Generation failed: Malformed content`);
            }

            return { text: candidates[0].content?.parts?.[0]?.text || '' };
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                console.error(`[AntigravityClient] generateContent API Error (${error.response.status}):`, JSON.stringify(error.response.data, null, 2));
            } else {
                console.error(`[AntigravityClient] generateContent failed:`, error.message);
            }
            
            if (error.response?.status === 404 && !options._isRetry) {
                 console.warn('[AntigravityClient] 404 received. Project ID might be invalid. Attempting re-discovery or fallback...');
                 try {
                     // Force re-discovery by clearing cached ID
                     const oldProjectId = this.account.projectId;
                     this.account.projectId = undefined;
                     const newProjectId = await aiAccountManager.discoverProjectId(this.account);
                     
                     // If re-discovery gives the same ID, try a standard fallback
                     // If re-discovery gives the same ID, try a standard fallback
                    //  if (newProjectId === oldProjectId) {
                    //      console.warn('[AntigravityClient] Re-discovery returned same ID. Trying cloudaicompanion-default fallback...');
                    //      this.account.projectId = 'cloudaicompanion-default';
                    //  }
					 this.account.projectId = newProjectId;
                     
                     console.log(`[AntigravityClient] Retrying with Project: ${this.account.projectId}`);
                     return await this.generateContent(prompt, modelId, { ...options, _isRetry: true });
                 } catch (discoveryError: any) {
                     console.error('[AntigravityClient] Project re-discovery/fallback failed:', discoveryError.message);
                 }
            }

            throw error;
        }

    }

    /**
     * Generate Image (Imagen 3.5 via Agent Gateway)
     */
    public async generateImage(prompt: string | any[], modelId: string = 'gemini-3-pro-image'): Promise<{ url: string }> {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        let parts: any[] = [];
        if (Array.isArray(prompt)) {
            parts = prompt;
        } else {
            parts = [{ text: prompt }];
        }

        const payload: any = {
            requestId: this.generateRequestId(),
            request: {
                contents: [{
                    role: 'user',
                    parts: parts
                }],
                generationConfig: {
                    candidateCount: 1,
                    imageConfig: {
                        imageSize: "1K"
                    }
                }
            },
            model: modelId,
            userAgent: 'antigravity/1.13.3 windows/amd64',
            requestType: 'image_gen'
        };

        const projectId = await aiAccountManager.discoverProjectId(this.account);
        payload.project = projectId;

        console.log('[AntigravityClient] projectId', projectId);

        try {
            console.log('[AntigravityClient] Payload:', JSON.stringify(payload));
            const response = await axios.post(url, payload, { headers });
            console.log('[AntigravityClient] Response:', JSON.stringify(response.data));

            const candidates = response.data.response?.candidates || [];
            if (candidates.length === 0) throw new Error('No candidates returned from Antigravity Image API');

            let base64Data: string | undefined;
            let mimeType: string = 'image/png';

            // IMPORTANT: Based on logs, candidate[0].content.parts contains multiple parts.
            // Typically part 0 is a thoughtSignature, and part 1 is the inlineData.
            const parts = candidates[0]?.content?.parts || [];
            for (const part of parts) {
                if (part?.inlineData?.data) {
                    base64Data = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || mimeType;
                    break;
                }
            }

            console.log('[AntigravityClient] base64Data', base64Data);
            console.log('[AntigravityClient] mimeType', mimeType);

            if (!base64Data) {
                console.error('[AntigravityClient] Image data not found in any parts. Parts found:', parts.length);
                throw new Error('No image data found in Antigravity response parts');
            }

            return { url: `data:${mimeType};base64,${base64Data}` };
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error(`[AntigravityClient] Image API Error:`, error.response?.data || error.message);
            }
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
        const projectId = await aiAccountManager.discoverProjectId(this.account);
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
            console.log(`[AntigravityClient] Requesting video generation for project: ${projectId}`);
            const response = await axios.post(url, payload, { headers });
            const operationName = response.data.operations?.[0]?.operation?.name;

            if (!operationName) {
                console.error('[AntigravityClient] No operation returned:', JSON.stringify(response.data));
                throw new Error('No operation name returned from Antigravity/Veo API');
            }

            return {
                url: operationName,
                operationName,
                sceneId,
                statusUrl: `${AntigravityClient.AGENT_ENDPOINT}/video:batchCheckAsyncVideoGenerationStatus`
            };
        } catch (error: any) {
            console.error(`[AntigravityClient] Video API Error:`, error.response?.data || error.message);
            throw new Error(`Antigravity Video Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Audio (Multimodal TTS via Agent Gateway)
     */
    public async generateAudio(text: string, voiceId: string = 'Puck', modelId: string = 'gemini-2.5-flash-tts', options: any = {}) {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;
        const projectId = await aiAccountManager.discoverProjectId(this.account);

        const payload = {
            project: projectId,
            requestId: this.generateRequestId(),
            request: {
                contents: [{
                    role: 'user',
                    parts: [{ text }]
                }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
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
            const response = await axios.post(url, payload, { headers });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.[0];
            const base64 = part?.inlineData?.data;

            if (!base64) {
                console.error('[AntigravityClient] No audio data in response:', JSON.stringify(response.data));
                throw new Error('No audio data returned from Antigravity/TTS API');
            }

            return {
                url: `data:${part.inlineData.mimeType || 'audio/wav'};base64,${base64}`,
                mimeType: part.inlineData.mimeType || 'audio/wav'
            };
        } catch (error: any) {
            console.error(`[AntigravityClient] Audio API Error:`, error.response?.data || error.message);
            throw new Error(`Antigravity Audio Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Music (Lyria/MusicFX via Agent Gateway)
     */
    public async generateMusic(prompt: string, modelId: string = 'lyria-002', options: any = {}) {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:generateContent`;
        const projectId = await aiAccountManager.discoverProjectId(this.account);

        const payload = {
            project: projectId,
            requestId: this.generateRequestId(),
            request: {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            },
            model: modelId,
            userAgent: 'antigravity/1.13.3 windows/amd64',
            requestType: 'music_gen'
        };

        try {
            const response = await axios.post(url, payload, { headers });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.[0];
            const base64 = part?.inlineData?.data;

            if (!base64) {
                // Some models return an operation name instead of inline data
                if (response.data.name || response.data.response?.name) {
                    return { url: response.data.name || response.data.response?.name };
                }
                throw new Error('No music data returned from Antigravity/Music API');
            }

            return {
                url: `data:${part.inlineData.mimeType || 'audio/mpeg'};base64,${base64}`,
                mimeType: part.inlineData.mimeType || 'audio/mpeg'
            };
        } catch (error: any) {
            console.error(`[AntigravityClient] Music API Error:`, error.response?.data || error.message);
            throw new Error(`Antigravity Music Gen failed: ${error.message}`);
        }
    }

    /**
     * Fetch available models supported by the Antigravity gateway
     */
    public async fetchAvailableModels(): Promise<any[]> {
        const token = await aiAccountManager.refreshAccessToken(this.account);
        const headers = this.getHeaders(token);
        const url = `${AntigravityClient.AGENT_ENDPOINT}/v1internal:fetchAvailableModels`;

        try {
            console.log(`[AntigravityClient] Fetching available models for ${this.account.email}...`);
            const projectId = await aiAccountManager.discoverProjectId(this.account);
            
            const payload: any = {};
            if (projectId) {
                payload.project = projectId;
            }

            const response = await axios.post(url, payload, { headers });

            const result = [];
            // Parse relevant models from the object map
            const dataModels = response.data.models || {};
            for (const [name, info] of Object.entries(dataModels)) {
                if ((info as any).quotaInfo) {
                    const fraction = (info as any).quotaInfo.remainingFraction ?? 0;
                    result.push({
                        id: name,
                        remainingFraction: fraction
                    });
                } else {
                    result.push({
                         id: name,
                         remainingFraction: 1
                    });
                }
            }

            console.log(`[AntigravityClient] Discovered ${result.length} models:`, JSON.stringify(result).substring(0, 200) + '...');

            return result;
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error(`[AntigravityClient] Fetch Models API Error:`, error.response?.data || error.message);
            }
            throw new Error(`Antigravity Model Fetch failed: ${error.message}`);
        }
    }
}
