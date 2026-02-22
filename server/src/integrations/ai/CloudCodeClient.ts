import axios from 'axios';
import crypto from 'crypto';
import { IAIAccount } from '../../models/AIAccount.js';
import { aiAccountManager } from '../../utils/ai/AIAccountManager.js';

/**
 * Client for interacting with Google Cloud Code Assist API.
 * This is a more stable alternative to browser-based scraping.
 * Supports direct media generation (Video, Audio, Music) via standard sandbox endpoint.
 */
export class CloudCodeClient {
    private static AGENT_ENDPOINT = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
    private static CLOUDCODE_ENDPOINT = 'https://daily-cloudcode-pa.googleapis.com'; // Fallback for legacy

    private account: IAIAccount;

    constructor(account: IAIAccount) {
        this.account = account;
    }

    /**
     * Get 128-bit internal request ID (Technique from antigravity2api-nodejs)
     */
    private generateRequestId(): string {
        return crypto.randomUUID();
    }

    /**
     * Get headers required for Agentic API requests
     */
    private async getHeaders() {
        const token = await aiAccountManager.refreshAccessToken(this.account);

        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/',
            'User-Agent': 'antigravity' // Identifying as antigravity agent to match research repo
        };
    }

    /**
     * Generate content (Text generation via Agent Gateway)
     */
    public async generateContent(prompt: string | any[], modelId: string = 'gemini-2.5-flash', options: any = {}) {
        const projectId = await aiAccountManager.discoverProjectId(this.account);
        const headers = await this.getHeaders();

        const url = `${CloudCodeClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const parts = Array.isArray(prompt) ? prompt : [{ text: prompt }];

        const payload = {
            project: projectId,
            requestId: this.generateRequestId(),
            request: {
                contents: [
                    {
                        role: 'user',
                        parts: parts
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            },
            model: modelId,
            systemInstruction: options.systemPrompt ? {
                parts: [{ text: options.systemPrompt }]
            } : undefined,
            userAgent: 'antigravity',
            requestType: 'agent'
        };

        try {
            const response = await axios.post(url, payload, { headers });

            const candidates = response.data.response?.candidates || [];
            if (candidates.length === 0) throw new Error('No candidates returned from Agent API');

            const content = candidates[0].content;
            if (!content || !content.parts || content.parts.length === 0) {
                throw new Error('Malformed content in Agent API response');
            }

            return {
                text: content.parts[0].text,
                usage: response.data.response?.usageMetadata
            };
        } catch (error: any) {
            console.error(`[CloudCodeClient] Agent API Error:`, error.response?.data || error.message);
            throw new Error(`Cloud Code Agent failed: ${error.message}`);
        }
    }

    /**
     * Generate image via Agent Gateway (Imagen 3.5)
     */
    public async generateImage(prompt: string, modelId: string = 'gemini-3-pro-image') {
        const projectId = await aiAccountManager.discoverProjectId(this.account);
        const headers = await this.getHeaders();

        // const url = `${CloudCodeClient.AGENT_ENDPOINT}/projects/${projectId}/agent:generateContent`;
        const url = `${CloudCodeClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const payload = {
            project: projectId,
            requestId: this.generateRequestId(),
            request: {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    candidateCount: 1,
                    imageConfig: { imageSize: "1K" }
                },
                sessionId: `;${Date.now()}`
            },
            model: modelId,
            userAgent: 'antigravity',
            requestType: 'image_gen'
        };

        try {
            const response = await axios.post(url, payload, { headers });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.[0];
            const base64 = part?.inlineData?.data;

            if (!base64) throw new Error('No image data returned from Agent/Imagen API');

            return {
                media: {
                    url: `data:image/png;base64,${base64}`,
                    mimeType: 'image/png'
                }
            };
        } catch (error: any) {
            console.error(`[CloudCodeClient] Agent Image API Error:`, error.response?.data || error.message);
            throw new Error(`Agent Image Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate video via Agent Gateway (Veo 3.1)
     */
    /**
     * Generate Video (Vertex AI Veo)
     */
    public async generateVideo(prompt: string, modelId: string = 'veo-3.0-fast-generate-preview', options: any = {}) {
        const projectId = await aiAccountManager.discoverProjectId(this.account);
        const headers = await this.getHeaders();

        const url = `${CloudCodeClient.AGENT_ENDPOINT}/v1internal:generateContent`;
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
            }]
        };

        try {
            const response = await axios.post(url, payload, { headers });
            const operationName = response.data.operations?.[0]?.operation?.name;

            if (!operationName) throw new Error('No operation name returned from Agent/Veo API');

            return {
                url: operationName,
                operationName,
                sceneId,
                statusUrl: `${CloudCodeClient.AGENT_ENDPOINT}/video:batchCheckAsyncVideoGenerationStatus`
            };
        } catch (error: any) {
            console.error(`[CloudCodeClient] Agent Video API Error:`, error.response?.data || error.message);
            throw new Error(`Agent Video Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Audio (Multimodal TTS via Agent Gateway)
     */
    /**
     * Generate Audio (Multimodal TTS)
     */
    public async generateAudio(text: string, voiceId: string = 'Puck', modelId: string = 'gemini-2.5-flash-tts', options: any = {}) {
        const projectId = await aiAccountManager.discoverProjectId(this.account);
        const headers = await this.getHeaders();
        const url = `${CloudCodeClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const payload = {
            project: projectId,
            requestId: crypto.randomUUID(),
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
            userAgent: 'antigravity',
            requestType: 'agent'
        };

        try {
            const response = await axios.post(url, payload, { headers });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.[0];
            const base64 = part?.inlineData?.data;

            if (!base64) throw new Error('No audio data returned from Agent/TTS API');

            return {
                url: `data:${part.inlineData.mimeType || 'audio/wav'};base64,${base64}`,
                mimeType: part.inlineData.mimeType || 'audio/wav'
            };
        } catch (error: any) {
            console.error(`[CloudCodeClient] Agent Audio API Error:`, error.response?.data || error.message);
            throw new Error(`Agent Audio Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Music (Lyria/MusicFX via Agent Gateway)
     */
    /**
     * Generate Music (Lyria/MusicFX)
     */
    public async generateMusic(prompt: string, modelId: string = 'lyria-002', options: any = {}) {
        const projectId = await aiAccountManager.discoverProjectId(this.account);
        const headers = await this.getHeaders();
        const url = `${CloudCodeClient.AGENT_ENDPOINT}/v1internal:generateContent`;

        const payload = {
            project: projectId,
            requestId: crypto.randomUUID(),
            request: {
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            },
            model: modelId,
            userAgent: 'antigravity',
            requestType: 'music_gen'
        };

        try {
            const response = await axios.post(url, payload, { headers });
            const part = response.data.response?.candidates?.[0]?.content?.parts?.[0];
            const base64 = part?.inlineData?.data;

            if (!base64) {
                if (response.data.name || response.data.response?.name) {
                    return { url: response.data.name || response.data.response?.name };
                }
                throw new Error('No music data returned from Agent/Music API');
            }

            return {
                url: `data:${part.inlineData.mimeType || 'audio/mpeg'};base64,${base64}`,
                mimeType: part.inlineData.mimeType || 'audio/mpeg'
            };
        } catch (error: any) {
            console.error(`[CloudCodeClient] Agent Music API Error:`, error.response?.data || error.message);
        }
    }

    /**
     * Upload File (Internal Agentic API)
     */
    public async uploadFile(filePath: string, mimeType: string, displayName?: string) {
        // Internal Agentic API usually handles files via inlineData or a specific blob store.
        // For now, we return a local reference or throw if too large.
        // systemLogger.warn(`[CloudCodeClient] uploadFile not fully implemented for internal API, using fallback.`, 'CloudCodeClient');
        throw new Error('File API not yet natively supported in CloudCodeClient. Fallback to API Key recommended.');
    }

    /**
     * Wait for File (Internal Agentic API)
     */
    public async waitForFileActive(fileUri: string) {
        return { state: 'ACTIVE', uri: fileUri };
    }

    /**
     * Delete File (Internal Agentic API)
     */
    public async deleteFile(fileUri: string) {
        return true;
    }
}
