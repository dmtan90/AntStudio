import { GoogleGenAI, Modality, FileState } from '@google/genai';
import axios from 'axios';
import crypto from 'crypto';
import { IAIAccount } from '~/models/AIAccount.js';
import { geminiPool } from '~/utils/gemini.js';
import { aiAccountManager } from '~/utils/ai/AIAccountManager.js';
import { CloudCodeClient } from './CloudCodeClient.js';
import { AntigravityClient } from './AntigravityClient.js';
import { Logger } from '~/utils/Logger.js';
import { getFromS3 } from '~/utils/s3.js';
import { Readable } from 'stream';

/**
 * GeminiClient: Unified client for all Google Gemini tasks.
 * Abstracts away the difference between API Key Pool and AI Accounts.
 */
export class GeminiClient {
    private apiKey?: string;
    private account?: IAIAccount;
    private googleGenAI?: GoogleGenAI;

    /**
     * @param options Provide either apiKey or account
     */
    constructor(options: { apiKey?: string; account?: IAIAccount }) {
        this.apiKey = options.apiKey;
        this.account = options.account;
        if (this.apiKey) {
            this.googleGenAI = new GoogleGenAI({ apiKey: this.apiKey });
        }
    }


    /**
     * Build an ordered chain of credential sources to try:
     * 1. Antigravity accounts (quota-aware)
     * 2. Standard Google OAuth accounts (quota-aware)
     * 3. API Key pool
     * 
     * If the caller provided an explicit account or apiKey, only that is used.
     */
    private async resolveCredentialsChain(modality: 'text' | 'image' | 'video' | 'audio' | 'music' | 'live'): Promise<Array<{ type: 'antigravity' | 'standard' | 'apikey'; account?: IAIAccount; apiKey?: string; googleGenAI?: GoogleGenAI }>> {
        const chain: Array<{ type: 'antigravity' | 'standard' | 'apikey'; account?: IAIAccount; apiKey?: string; googleGenAI?: GoogleGenAI }> = [];

        // If caller provided explicit credentials, use only those
        if (this.account) {
            const t = this.account.accountType === 'antigravity' ? 'antigravity' as const : 'standard' as const;
            chain.push({ type: t, account: this.account });
            return chain;
        }
        if (this.apiKey) {
            chain.push({ type: 'apikey', apiKey: this.apiKey, googleGenAI: this.googleGenAI });
            return chain;
        }

        // Auto-resolve: build full chain from account pool
        // Step 1: Antigravity accounts
        const antigravityAccount = await aiAccountManager.getOptimalAccount(modality, 'antigravity');
        if (antigravityAccount) {
            chain.push({ type: 'antigravity', account: antigravityAccount });
        }

        // Step 2: Standard Google OAuth accounts
        const standardAccount = await aiAccountManager.getOptimalAccount(modality, 'standard');
        if (standardAccount) {
            chain.push({ type: 'standard', account: standardAccount });
        }

        // Step 3: API Key pool
        try {
            const { key } = await geminiPool.getOptimalClient();
            if (key) {
                chain.push({ type: 'apikey', apiKey: key, googleGenAI: new GoogleGenAI({ apiKey: key }) });
            }
        } catch (e) {
            // No API keys available
        }

        return chain;
    }

    /**
     * Generate Text / Multimodal Content
     * Fallback chain: Antigravity → Standard Google → API Key
     */
    public async generateContent(prompt: string | any[], modelId: string = 'gemini-2.5-flash', options: any = {}) {
        const chain = await this.resolveCredentialsChain('text');
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if (cred.type === 'antigravity' && cred.account) {
                    const client = new AntigravityClient(cred.account);
                    return await client.generateContent(prompt, modelId, options);
                }

                if (cred.type === 'standard' && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.generateContent(prompt, modelId, options);
                }

                if (cred.type === 'apikey' && cred.googleGenAI) {
                    const parts = Array.isArray(prompt) ? prompt : [{ text: String(prompt) }];
                    
                    const response = await (cred.googleGenAI as any).models.generateContent({
                        model: modelId,
                        contents: [{ role: 'user', parts }],
                        config: {
                            systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
                            tools: options.grounding ? [{ googleSearch: {} }] : options.tools,
                            ...options.generationConfig,
                            thinkingConfig: options.thinkingConfig,
                        }
                    });

                    if (cred.apiKey) await geminiPool.recordUsage(cred.apiKey, modelId);
                    
                    return {
                        text: response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        usage: response.usageMetadata
                    };
                }
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] generateContent failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for generateContent: ${errors.join(' | ')}`);
    }

    /**
     * Generate Image
     * Fallback chain: Antigravity → Standard Google → API Key
     * API Key path supports:
     * - Gemini native image models (gemini-*-image) → generateContent() with responseModalities: ['IMAGE']
     * - Imagen dedicated models (imagen-*) → generateImages() dedicated API
     */
    public async generateImage(prompt: string, modelId: string = 'gemini-2.5-flash-image', options: any = {}): Promise<{ url: string; mimeType: string }> {
        const chain = await this.resolveCredentialsChain('image');
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if (cred.type === 'antigravity' && cred.account) {
                    const client = new AntigravityClient(cred.account);
                    const result = await client.generateImage(prompt, modelId);
                    return { url: result.url, mimeType: 'image/png' };
                }

                if (cred.type === 'standard' && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    const result = await client.generateImage(prompt, modelId) as any;
                    return {
                        url: result.media?.url || result.url,
                        mimeType: result.media?.mimeType || result.mimeType || 'image/png'
                    };
                }

                if (cred.type === 'apikey' && cred.googleGenAI) {
                    const isImagenModel = modelId.startsWith('imagen-');

                    if (isImagenModel) {
                        Logger.info(`[GeminiClient] Using generateImages() for Imagen model: ${modelId}`, 'GeminiClient');
                        const response = await (cred.googleGenAI as any).models.generateImages({
                            model: modelId,
                            prompt: prompt,
                            config: {
                                numberOfImages: 1,
                                outputMimeType: 'image/png',
                                aspectRatio: options.aspectRatio || '1:1'
                            }
                        });
                        if (response.generatedImages?.length > 0) {
                            const img = response.generatedImages[0];
                            return { url: `data:image/png;base64,${img.image.imageBytes}`, mimeType: 'image/png' };
                        }
                        throw new Error('No images returned from Imagen API');
                    } else {
                        Logger.info(`[GeminiClient] Using generateContent() for Gemini image model: ${modelId}`, 'GeminiClient');
                        const parts = Array.isArray(prompt) ? prompt : [{ text: String(prompt) }];
                        const response = await (cred.googleGenAI as any).models.generateContent({
                            model: modelId,
                            contents: [{ role: 'user', parts }],
                            config: { responseModalities: ['IMAGE'] }
                        });
                        const responseParts = response?.candidates?.[0]?.content?.parts || [];
                        for (const part of responseParts) {
                            if (part?.inlineData?.data) {
                                const mimeType = part.inlineData.mimeType || 'image/png';
                                return { url: `data:${mimeType};base64,${part.inlineData.data}`, mimeType };
                            }
                        }
                        throw new Error('No image data in Gemini response');
                    }
                }
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] generateImage failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for generateImage: ${errors.join(' | ')}`);
    }

    /**
     * Generate Video (Veo)
     * Fallback chain: Antigravity → Standard Google → API Key
     * API Key path uses generateVideos() + async polling
     */
    public async generateVideo(prompt: string, modelId: string = 'veo-2.0-generate-001', options: any = {}): Promise<{ url: string; mimeType?: string; sceneId?: string; statusUrl?: string }> {
        const chain = await this.resolveCredentialsChain('video');
        const errors: string[] = [];

        // Helper to resolve images for Veo API structure
        const resolveToVeoImage = async (input: any) => {
            if (!input) return undefined;
            if (typeof input !== 'string') return input; // Already resolved or object

            try {
                let buffer: Buffer;
                let mimeType = 'image/png';

                if (input.startsWith('https://') || input.startsWith('http://')) {
                    const response = await axios.get(input, { responseType: 'arraybuffer' });
                    buffer = Buffer.from(response.data);
                    mimeType = response.headers['content-type'] || 'image/png';
                } else {
                    // Assume S3 Key
                    const s3Stream = await getFromS3(input) as Readable;
                    const chunks = [];
                    for await (const chunk of s3Stream) {
                        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                    }
                    buffer = Buffer.concat(chunks);
                    
                    if (input.endsWith('.jpg') || input.endsWith('.jpeg')) mimeType = 'image/jpeg';
                    else if (input.endsWith('.webp')) mimeType = 'image/webp';
                }

                Logger.info(`[GeminiClient] Resolved image reference ${input} to ${buffer.length} bytes, mime: ${mimeType}`, 'GeminiClient');

                return {
                    imageBytes: buffer.toString('base64'),
                    mimeType
                };
            } catch (err: any) {
                Logger.warn(`[GeminiClient] Failed to resolve reference image ${input}: ${err.message}`, 'GeminiClient');
                return undefined;
            }
        };

        // RESOLVE ALL IMAGES UPFRONT
        const resolvedOptions = { ...options };
        Logger.info(`[GeminiClient] Starting image resolution for video generation...`, 'GeminiClient');
        
        if (options.imageStart || options.image) {
            Logger.info(`[GeminiClient] Resolving imageStart/image: ${options.imageStart || options.image}`, 'GeminiClient');
            resolvedOptions.imageStart = await resolveToVeoImage(options.imageStart || options.image);
            resolvedOptions.image = resolvedOptions.imageStart;
        }

        if (options.imageEnd) {
            Logger.info(`[GeminiClient] Resolving imageEnd: ${options.imageEnd}`, 'GeminiClient');
            resolvedOptions.imageEnd = await resolveToVeoImage(options.imageEnd);
        }

        const charRefs = options.characterImages || options.characterReferences || [];
        Logger.info(`[GeminiClient] Found ${charRefs.length} character references to resolve.`, 'GeminiClient');
        if (Array.isArray(charRefs) && charRefs.length > 0) {
            const resolvedChars = await Promise.all(charRefs.map(async (img, idx) => {
                Logger.info(`[GeminiClient] Resolving character image [${idx}]: ${img}`, 'GeminiClient');
                return await resolveToVeoImage(img);
            }));
            resolvedOptions.characterImages = resolvedChars.filter(img => !!img);
            resolvedOptions.characterReferences = resolvedOptions.characterImages;
            Logger.info(`[GeminiClient] Successfully resolved ${resolvedOptions.characterImages.length} character images.`, 'GeminiClient');
        }

        for (const cred of chain) {
            try {
                if (cred.type === 'antigravity' && cred.account) {
                    // const client = new AntigravityClient(cred.account);
                    // if (typeof client.generateVideo === 'function') {
                    //     return await client.generateVideo(prompt, modelId, resolvedOptions);
                    // }
                    // // If AntigravityClient has no generateVideo, fall through to next
                    // throw new Error('AntigravityClient does not support generateVideo');
                } else if (cred.type === 'standard' && cred.account) {
                    // const client = new CloudCodeClient(cred.account);
                    // return await client.generateVideo(prompt, modelId, resolvedOptions);
                } else if (cred.type === 'apikey' && cred.googleGenAI) {
                    const genConfig: any = {};
                    if (options.aspectRatio) genConfig.aspectRatio = options.aspectRatio;
                    if (options.resolution) genConfig.resolution = options.resolution;
                    if (options.durationSeconds) genConfig.durationSeconds = String(options.durationSeconds);
                    if (options.personGeneration) genConfig.personGeneration = options.personGeneration;
                    if (options.negativePrompt) genConfig.negativePrompt = options.negativePrompt;

                    // Interpolation (lastFrame)
                    if (resolvedOptions.imageEnd) {
                        genConfig.lastFrame = resolvedOptions.imageEnd;
                    }

                    // Reference Images
                    // if (resolvedOptions.characterImages && Array.isArray(resolvedOptions.characterImages) && resolvedOptions.characterImages.length > 0) {
                    //     genConfig.referenceImages = resolvedOptions.characterImages.map((img: any) => ({
                    //         image: img,
                    //         referenceType: 'asset'
                    //     }));
                    // }

                    const generateParams: any = { 
                        model: modelId, 
                        prompt,
                        image: resolvedOptions.imageStart || resolvedOptions.image
                    };

                    // Logger.info("generateParams: ", generateParams);

                    // Logger.info("genConfig", JSON.stringify(genConfig));
                    // Logger.info(modelId, prompt);
                    
                    if (Object.keys(genConfig).length > 0) generateParams.config = genConfig;

                    Logger.info(`[GeminiClient] Final API Key Payload structure: hasImage=${!!generateParams.image}, hasLastFrame=${!!generateParams.config?.lastFrame}, referenceImageCount=${generateParams.config?.referenceImages?.length || 0}`, 'GeminiClient');

                    const ai = new GoogleGenAI({ apiKey: cred.apiKey, apiVersion: "v1alpha" } as any);

                    let operation = await ai.models.generateVideos(generateParams);

                    const maxPolls = 60;
                    let pollCount = 0;
                    while (!operation.done && pollCount < maxPolls) {
                        Logger.debug(`[GeminiClient] Waiting for video generation... (poll ${pollCount + 1}/${maxPolls})`, 'GeminiClient');
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        operation = await (cred.googleGenAI as any).operations.getVideosOperation({ operation });
                        pollCount++;
                    }

                    if (!operation.done) throw new Error('Video generation timed out after 10 minutes');

                    const generatedVideos = operation.response?.generatedVideos || [];
                    if (generatedVideos.length === 0) throw new Error('No videos returned from Veo API');

                    const videoFile = generatedVideos[0].video;
                    if (videoFile?.uri) {
                        let videoUrl = videoFile.uri;
                        if (videoUrl.includes('generativelanguage.googleapis.com') && cred.apiKey) {
                            videoUrl += (videoUrl.includes('?') ? '&' : '?') + `key=${cred.apiKey}`;
                        }
                        Logger.info(`[GeminiClient] Video generated successfully: ${videoUrl}`, 'GeminiClient');
                        return { url: videoUrl, mimeType: videoFile.mimeType || 'video/mp4', sceneId: options.sceneId };
                    }
                    throw new Error('No video URI in Veo response');
                }
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                
                // Detailed logging for Google API Errors (like 403 Service Disabled)
                let detail = error.message;
                if (error.response?.data?.error) {
                    const apiError = error.response.data.error;
                    detail = `[${apiError.code} ${apiError.status}] ${apiError.message}`;
                    if (apiError.details) {
                        Logger.error(`[GeminiClient] Full API Error Details: ${JSON.stringify(apiError.details, null, 2)}`, 'GeminiClient');
                    }
                } else if (error.details) {
                    detail = `${error.message} - ${JSON.stringify(error.details)}`;
                }

                Logger.warn(`[GeminiClient] generateVideo failed via ${label}: ${detail}`, 'GeminiClient');
                errors.push(`${label}: ${detail}`);
            }
        }

        throw new Error(`All credential sources failed for generateVideo: ${errors.join(' | ')}`);
    }

    /**
     * List available voices (Gemini 2.0 Flash supports 30 distinct voices)
     * Language is auto-detected from input text
     * Reference: https://ai.google.dev/gemini-api/docs/speech-generation
     */
    async listVoices() {
        return [
            { id: 'Zephyr', name: 'Zephyr', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Bright, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Zephyr.wav" },
            { id: 'Puck', name: 'Puck', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Upbeat, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Puck.wav" },
            { id: 'Charon', name: 'Charon', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Informative, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Charon.wav" },
            { id: 'Kore', name: 'Kore', language: 'auto', gender: 'female', provider: 'gemini', description: 'Firm, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Kore.wav" },
            { id: 'Fenrir', name: 'Fenrir', language: 'auto', gender: 'male', provider: 'gemini', description: 'Excitable, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Fenrir.wav" },
            { id: 'Leda', name: 'Leda', language: 'auto', gender: 'female', provider: 'gemini', description: 'Youthful, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Leda.wav" },
            { id: 'Orus', name: 'Orus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Firm, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Orus.wav" },
            { id: 'Aoede', name: 'Aoede', language: 'auto', gender: 'female', provider: 'gemini', description: 'Breezy, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Aoede.wav" },
            { id: 'Callirrhoe', name: 'Callirrhoe', language: 'auto', gender: 'female', provider: 'gemini', description: 'Easy-going, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Callirrhoe.wav" },
            { id: 'Autonoe', name: 'Autonoe', language: 'auto', gender: 'female', provider: 'gemini', description: 'Bright, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Autonoe.wav" },
            { id: 'Enceladus', name: 'Enceladus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Breathy, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Enceladus.wav" },
            { id: 'Iapetus', name: 'Iapetus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Clear, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Iapetus.wav" },
            { id: 'Umbriel', name: 'Umbriel', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Easy-going, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Umbriel.wav" },
            { id: 'Algieba', name: 'Algieba', language: 'auto', gender: 'female', provider: 'gemini', description: 'Smooth, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Algieba.wav" },
            { id: 'Despina', name: 'Despina', language: 'auto', gender: 'female', provider: 'gemini', description: 'Smooth, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Despina.wav" },
            { id: 'Erinome', name: 'Erinome', language: 'auto', gender: 'female', provider: 'gemini', description: 'Clear, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Erinome.wav" },
            { id: 'Algenib', name: 'Algenib', language: 'auto', gender: 'male', provider: 'gemini', description: 'Gravelly, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Algenib.wav" },
            { id: 'Rasalgethi', name: 'Rasalgethi', language: 'auto', gender: 'male', provider: 'gemini', description: 'Informative, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Rasalgethi.wav" },
            { id: 'Laomedeia', name: 'Laomedeia', language: 'auto', gender: 'female', provider: 'gemini', description: 'Upbeat, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Laomedeia.wav" },
            { id: 'Achernar', name: 'Achernar', language: 'auto', gender: 'male', provider: 'gemini', description: 'Soft, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Achernar.wav" },
            { id: 'Alnilam', name: 'Alnilam', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Firm, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Alnilam.wav" },
            { id: 'Schedar', name: 'Schedar', language: 'auto', gender: 'female', provider: 'gemini', description: 'Even, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Schedar.wav" },
            { id: 'Gacrux', name: 'Gacrux', language: 'auto', gender: 'male', provider: 'gemini', description: 'Mature, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Gacrux.wav" },
            { id: 'Pulcherrima', name: 'Pulcherrima', language: 'auto', gender: 'female', provider: 'gemini', description: 'Forward, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Pulcherrima.wav" },
            { id: 'Achird', name: 'Achird', language: 'auto', gender: 'female', provider: 'gemini', description: 'Friendly, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Achird.wav" },
            { id: 'Zubenelgenubi', name: 'Zubenelgenubi', language: 'auto', gender: 'male', provider: 'gemini', description: 'Casual, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Zubenelgenubi.wav" },
            { id: 'Vindemiatrix', name: 'Vindemiatrix', language: 'auto', gender: 'female', provider: 'gemini', description: 'Gentle, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Vindemiatrix.wav" },
            { id: 'Sadachbia', name: 'Sadachbia', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Lively, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sadachbia.wav" },
            { id: 'Sadaltager', name: 'Sadaltager', language: 'auto', gender: 'male', provider: 'gemini', description: 'Knowledgeable, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sadaltager.wav" },
            { id: 'Sulafat', name: 'Sulafat', language: 'auto', gender: 'male', provider: 'gemini', description: 'Warm, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sulafat.wav" }
        ];
    }

    /**
     * Generate Audio (TTS via Gemini)
     * Fallback chain: Antigravity → Standard Google → API Key
     * Output: raw PCM16 24kHz mono → auto-wrapped in WAV header
     */
    public async generateAudio(text: string, voiceId: string = 'Puck', modelId: string = 'gemini-2.5-flash-preview-tts', options: any = {}): Promise<{ url: string; mimeType: string }> {
        const chain = await this.resolveCredentialsChain('audio');
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                let base64: string;
                let mimeType: string;

                // if (cred.type === 'antigravity' && cred.account) {
                //     const client = new AntigravityClient(cred.account);
                //     const result = await client.generateAudio(text, voiceId, modelId, options);
                //     base64 = result.url.split(',')[1];
                //     mimeType = result.mimeType || 'audio/wav';
                // }
                if (cred.type === 'standard' && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    const result = await client.generateAudio(text, voiceId, modelId, options);
                    base64 = result.url.split(',')[1];
                    mimeType = result.mimeType || 'audio/wav';
                } else if (cred.type === 'apikey' && cred.googleGenAI) {
                    let speechConfig: any;
                    let finalText = text;
                    
                    if (options.multiSpeaker && options.multiSpeaker.enabled && Array.isArray(options.multiSpeaker.speakers) && options.multiSpeaker.speakers.length > 0) {
                        const speakers = options.multiSpeaker.speakers;
                        
                        const speakerNames = speakers.map((_: any, i: number) => `Speaker ${i + 1}`);
                        const intro = `TTS the following conversation between ${speakerNames.join(' and ')}:`;
                        
                        const lines = text.split('\n').filter(l => l.trim().length > 0);
                        const mappedLines = lines.map((line, idx) => {
                           const sName = speakerNames[idx % speakerNames.length];
                           return `${sName}: ${line.trim()}`;
                        });
                        
                        finalText = [intro, ...mappedLines].join('\n');
                        
                        speechConfig = {
                            multiSpeakerVoiceConfig: {
                                speakerVoiceConfigs: speakers.map((s: any, idx: number) => ({
                                    speaker: `Speaker ${idx + 1}`,
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: s.voiceId || voiceId }
                                    }
                                }))
                            }
                        };
                    } else {
                        speechConfig = { 
                            voiceConfig: { 
                                prebuiltVoiceConfig: { 
                                    voiceName: voiceId
                                } 
                            } 
                        };
                    }

                    const response = await (cred.googleGenAI as any).models.generateContent({
                        model: modelId,
                        contents: [{ parts: [{ text: finalText }] }],
                        config: { responseModalities: ['AUDIO'], speechConfig }
                    });

                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    base64 = part?.inlineData?.data;
                    mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';
                    if (!base64) throw new Error('No audio data returned from Gemini TTS API');
                    if (cred.apiKey) await geminiPool.recordUsage(cred.apiKey, modelId);
                } else {
                    continue;
                }

                // PCM → WAV conversion
                if (mimeType.toLowerCase().includes('l16') || mimeType.toLowerCase().includes('pcm')) {
                    try {
                        const audioBuffer = Buffer.from(base64, 'base64');
                        const sampleRate = 24000;
                        const numChannels = 1;
                        const wavBuffer = Buffer.allocUnsafe(44 + audioBuffer.length);
                        wavBuffer.write('RIFF', 0);
                        wavBuffer.writeUInt32LE(36 + audioBuffer.length, 4);
                        wavBuffer.write('WAVE', 8);
                        wavBuffer.write('fmt ', 12);
                        wavBuffer.writeUInt32LE(16, 16);
                        wavBuffer.writeUInt16LE(1, 20);
                        wavBuffer.writeUInt16LE(numChannels, 22);
                        wavBuffer.writeUInt32LE(sampleRate, 24);
                        wavBuffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
                        wavBuffer.writeUInt16LE(numChannels * 2, 32);
                        wavBuffer.writeUInt16LE(16, 34);
                        wavBuffer.write('data', 36);
                        wavBuffer.writeUInt32LE(audioBuffer.length, 40);
                        audioBuffer.copy(wavBuffer, 44);
                        base64 = wavBuffer.toString('base64');
                        mimeType = 'audio/wav';
                    } catch (e: any) {
                        Logger.warn(`[GeminiClient] Failed to add WAV header: ${e.message}`, 'GeminiClient');
                    }
                }

                return { url: `data:${mimeType};base64,${base64}`, mimeType };
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] generateAudio failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for generateAudio: ${errors.join(' | ')}`);
    }

    /**
     * Generate Music (Lyria RealTime)
     * Uses WebSocket streaming via live.music.connect() to generate music.
     * Collects PCM16 audio chunks for a configurable duration, then encodes as WAV.
     * 
     * Lyria RealTime specs: 16-bit PCM, 48kHz, stereo (2 channels)
     */
    public async generateMusic(prompt: string, modelId: string = 'lyria-realtime-exp', options: any = {}): Promise<{ url: string; mimeType: string }> {
        const chain = await this.resolveCredentialsChain('music');

        const errors: string[] = [];

        // Try account-based credentials first
        for (const cred of chain) {
            if (cred.type !== 'apikey' && cred.account) {
                try {
                    const client = new CloudCodeClient(cred.account);
                    const result = await client.generateMusic(prompt, modelId, options) as any;
                    return {
                        url: result.url || result.media?.url,
                        mimeType: result.mimeType || result.media?.mimeType || 'audio/mpeg'
                    };
                } catch (error: any) {
                    const label = `${cred.type} (${cred.account?.email})`;
                    Logger.warn(`[GeminiClient] generateMusic failed via ${label}: ${error.message}`, 'GeminiClient');
                    errors.push(`${label}: ${error.message}`);
                }
            }
        }

        // API Key path (Lyria RealTime via WebSocket)
        const apiKeyCred = chain.find(c => c.type === 'apikey');
        if (!apiKeyCred?.apiKey) {
            throw new Error(`All credential sources failed for generateMusic: ${errors.join(' | ')}`);
        }

        const durationSeconds = options.durationSeconds || 30;
        const bpm = options.bpm || 120;
        const temperature = options.temperature || 1.0;
        const sampleRate = 48000;
        const channels = 2;

        Logger.info(`[GeminiClient] Using Lyria RealTime for music generation. Duration: ${durationSeconds}s, BPM: ${bpm}`, 'GeminiClient');

        const ai = new GoogleGenAI({ apiKey: apiKeyCred.apiKey, apiVersion: "v1alpha" } as any);

        return new Promise<{ url: string; mimeType: string }>((resolve, reject) => {
            const audioChunks: Buffer[] = [];
            let sessionRef: any = null;

            const timeout = setTimeout(() => {
                // Stop after duration
                if (sessionRef) {
                    try { sessionRef.stop(); } catch (e) { /* ignore */ }
                }
            }, durationSeconds * 1000);

            (ai as any).live.music.connect({
                model: `models/${modelId}`,
                callbacks: {
                    onmessage: (message: any) => {
                        if (message.serverContent?.audioChunks) {
                            for (const chunk of message.serverContent.audioChunks) {
                                const audioBuffer = Buffer.from(chunk.data, 'base64');
                                audioChunks.push(audioBuffer);
                            }
                        } else {
                            Logger.debug(`[GeminiClient] Lyria non-audio message: ${JSON.stringify(message)}`, 'GeminiClient');
                        }
                    },
                    onerror: (error: any) => {
                        clearTimeout(timeout);
                        Logger.error(`[GeminiClient] Lyria session error: ${error}`, 'GeminiClient');
                        reject(new Error(`Lyria Music Generation Failed: ${error.message || error}`));
                    },
                    onclose: () => {
                        clearTimeout(timeout);
                        Logger.info(`[GeminiClient] Lyria stream closed. Collected ${audioChunks.length} chunks.`, 'GeminiClient');

                        if (audioChunks.length === 0) {
                            reject(new Error('No audio data received from Lyria'));
                            return;
                        }

                        // Combine PCM chunks and wrap in WAV header
                        const pcmData = Buffer.concat(audioChunks);
                        const wavBuffer = Buffer.allocUnsafe(44 + pcmData.length);
                        wavBuffer.write('RIFF', 0);
                        wavBuffer.writeUInt32LE(36 + pcmData.length, 4);
                        wavBuffer.write('WAVE', 8);
                        wavBuffer.write('fmt ', 12);
                        wavBuffer.writeUInt32LE(16, 16);        // chunk size
                        wavBuffer.writeUInt16LE(1, 20);         // PCM format
                        wavBuffer.writeUInt16LE(channels, 22);  // stereo
                        wavBuffer.writeUInt32LE(sampleRate, 24);
                        wavBuffer.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate
                        wavBuffer.writeUInt16LE(channels * 2, 32);  // block align
                        wavBuffer.writeUInt16LE(16, 34);        // bits per sample
                        wavBuffer.write('data', 36);
                        wavBuffer.writeUInt32LE(pcmData.length, 40);
                        pcmData.copy(wavBuffer, 44);

                        const base64 = wavBuffer.toString('base64');
                        resolve({
                            url: `data:audio/wav;base64,${base64}`,
                            mimeType: 'audio/wav'
                        });
                    }
                }
            }).then(async (session: any) => {
                sessionRef = session;

                await session.setWeightedPrompts({
                    weightedPrompts: [
                        { text: prompt, weight: 1.0 }
                    ]
                });

                await session.setMusicGenerationConfig({
                    musicGenerationConfig: {
                        bpm: bpm,
                        temperature: temperature,
                        audioFormat: 'pcm16',
                        sampleRateHz: sampleRate,
                    }
                });

                Logger.info('[GeminiClient] Lyria session started. Playing...', 'GeminiClient');
                await session.play();
            }).catch((err: any) => {
                clearTimeout(timeout);
                reject(new Error(`Lyria connection failed: ${err.message}`));
            });
        });
    }

    /**
     * Connect to Multimodal Live API
     */
    public async connectLive(config: { 
        model?: string;
        systemInstruction?: string;
        generationConfig?: any;
        tools?: any[];
        callbacks: {
            onopen?: () => void;
            onmessage?: (msg: any) => void;
            onerror?: (err: any) => void;
            onclose?: (event: any) => void;
        }
    }) {
        const chain = await this.resolveCredentialsChain('live');
        const model = config.model || 'gemini-2.5-flash-native-audio-preview-12-2025';

        // For Live API, find the first usable credential
        for (const cred of chain) {
            let token: string | undefined;
            let isApiKey = false;

            if (cred.type === 'apikey' && cred.apiKey) {
                token = cred.apiKey;
                isApiKey = true;
            } else if (cred.account) {
                try {
                    token = await aiAccountManager.refreshAccessToken(cred.account);
                } catch (e) { continue; }
            }
            if (!token) continue;

            const ai = new GoogleGenAI({ apiKey: isApiKey ? token : undefined }); 

            try {
                const session = await (ai as any).live.connect({
                    model: model,
                    config: {
                        systemInstruction: config.systemInstruction,
                        generationConfig: config.generationConfig,
                        tools: config.tools
                    },
                    callbacks: config.callbacks
                });

                return {
                    session,
                    apiKey: isApiKey ? token : undefined,
                    account: !isApiKey ? cred.account : undefined
                };
            } catch (error: any) {
                Logger.warn(`[GeminiClient] Live connection failed via ${cred.type}: ${error.message}`, 'GeminiClient');
            }
        }

        throw new Error('All credential sources failed for connectLive');
    }

    /**
     * Upload a file to Gemini File API
     */
    public async uploadFile(filePath: string, mimeType: string, displayName?: string) {
        const chain = await this.resolveCredentialsChain('video');
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if ((cred.type === 'antigravity' || cred.type === 'standard') && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.uploadFile(filePath, mimeType, displayName);
                }
                if (cred.type === 'apikey' && cred.googleGenAI) {
                    return await cred.googleGenAI.files.upload({
                        file: filePath,
                        config: { mimeType, displayName: displayName || filePath.split('/').pop() }
                    });
                }
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] uploadFile failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for uploadFile: ${errors.join(' | ')}`);
    }

    public async waitForFileActive(fileIdOrUri: string) {
        const chain = await this.resolveCredentialsChain('video');
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if ((cred.type === 'antigravity' || cred.type === 'standard') && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.waitForFileActive(fileIdOrUri);
                }
                if (cred.type === 'apikey' && cred.googleGenAI) {
                    const fileName = fileIdOrUri.includes('/')
                        ? (fileIdOrUri.startsWith('http') ? `files/${fileIdOrUri.split('/').pop()}` : fileIdOrUri)
                        : `files/${fileIdOrUri}`;
                    let file = await cred.googleGenAI.files.get({ name: fileName });
                    while (file.state === FileState.PROCESSING) {
                        await new Promise((resolve) => setTimeout(resolve, 3000));
                        file = await cred.googleGenAI.files.get({ name: fileName });
                    }
                    if (file.state === FileState.FAILED) throw new Error('Gemini File API processing failed');
                    return file;
                }
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] waitForFileActive failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for waitForFileActive: ${errors.join(' | ')}`);
    }

    public async deleteFile(fileIdOrUri: string) {
        const chain = await this.resolveCredentialsChain('video');

        for (const cred of chain) {
            try {
                if ((cred.type === 'antigravity' || cred.type === 'standard') && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.deleteFile(fileIdOrUri);
                }
                if (cred.type === 'apikey' && cred.googleGenAI) {
                    const fileName = fileIdOrUri.includes('/')
                        ? (fileIdOrUri.startsWith('http') ? `files/${fileIdOrUri.split('/').pop()}` : fileIdOrUri)
                        : `files/${fileIdOrUri}`;
                    await cred.googleGenAI.files.delete({ name: fileName });
                    return true;
                }
            } catch (error: any) {
                Logger.warn(`[GeminiClient] deleteFile failed via ${cred.type}: ${error.message}`, 'GeminiClient');
            }
        }

        return false;
    }
}
