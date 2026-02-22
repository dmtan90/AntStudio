import { AIAccount } from '../../models/AIAccount.js'
import { aiAccountManager } from './AIAccountManager.js'
import { CloudCodeClient } from '../../integrations/ai/CloudCodeClient.js'
import { configService } from '../configService.js'
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'
import { CustomAIAdapter } from './CustomAIAdapter.js'
import { privateLLMClient } from './PrivateLLMClient.js'
import { buildCharacterSheetPrompt, buildScenePrompt, buildVeoVideoPrompt } from '../PromptBuilder.js'

// Singleton instance cache
let providerInstances: Record<string, any> = {}
let currentSettings: any = null

export class AIServiceManager {
    private static instance: AIServiceManager
    private accountsInitialized: boolean = false

    private constructor() { }

    public static getInstance(): AIServiceManager {
        if (!AIServiceManager.instance) {
            AIServiceManager.instance = new AIServiceManager()
        }
        return AIServiceManager.instance
    }

    /**
     * Initializes or updates project settings from DB
     */
    public async initialize() {
        try {
            // Ensure config is fresh
            await configService.refresh();
            currentSettings = configService.ai;
        } catch (error) {
            console.error('[AIServiceManager] Failed to load settings:', error);
        }
    }

    /**
     * Get a specific provider instance (Lazily initialized)
     */
    public async getProvider(providerId: string) {
        if (!providerInstances[providerId]) {
            await this.initializeProvider(providerId);
        }
        return providerInstances[providerId];
    }

    /**
     * Internal: Initialize a specific provider instance
     */
    private async initializeProvider(providerId: string) {
        if (providerInstances[providerId]) return;

        try {
            if (!currentSettings) await this.initialize();
            const providers = currentSettings?.providers || [];
            const providerConfig = providers.find((p: any) => p.id === providerId);

            if (providerId === 'google') {
                const apiKey = providerConfig?.isActive ? providerConfig.apiKey : process.env.GEMINI_API_KEY;
                if (apiKey) {
                    const { GeminiClient } = await import('../../integrations/ai/GeminiClient.js');
                    providerInstances['google'] = new GeminiClient({ apiKey });
                    console.log('[AIServiceManager] Google Gemini Client (Unified) initialized.');
                }
            } else if (providerId === 'elevenlabs') {
                const apiKey = providerConfig?.isActive ? providerConfig.apiKey : process.env.ELEVENLABS_API_KEY;
                if (apiKey) {
                    const { ElevenLabsProvider } = await import('./providers/ElevenLabsProvider.js');
                    providerInstances['elevenlabs'] = new ElevenLabsProvider(apiKey);
                    console.log('[AIServiceManager] ElevenLabs Provider initialized.');
                }
            } else if (providerId === 'aistudio') {
                const { AIStudioProvider } = await import('./providers/AIStudioProvider.js');
                providerInstances['aistudio'] = new AIStudioProvider();
                console.log('[AIServiceManager] AI Studio Provider initialized.');
            } else if (providerId === 'flow') {
                const { FlowProvider } = await import('./providers/FlowProvider.js');
                providerInstances['flow'] = new FlowProvider();
                console.log('[AIServiceManager] Flow Provider initialized.');
            } else if (providerId === 'puter') {
                try {
                    const { PuterProvider } = await import('./providers/PuterProvider.js');
                    providerInstances['puter'] = new PuterProvider();
                    console.log('[AIServiceManager] Puter AI (Free Priority) Provider initialized.');
                } catch (puterError: any) {
                    console.warn(`[AIServiceManager] Failed to initialize Puter AI: ${puterError.message}`);
                }
            } else if (providerId === 'private') {
                providerInstances['private'] = privateLLMClient;
            } else if (providerConfig?.baseUrl) {
                // Custom Adapter
                providerInstances[providerId] = new CustomAIAdapter(
                    providerConfig.apiKey,
                    providerConfig.baseUrl,
                    providerConfig.taskConfigs
                );
                console.log(`[AIServiceManager] Custom Provider "${providerId}" initialized.`);
            }
        } catch (error: any) {
            console.error(`[AIServiceManager] Failed to initialize provider "${providerId}":`, error.message);
        }
    }

    /**
     * Resolve Provider and Model based on Defaults
     */
    private async resolveProvider(type: 'text' | 'image' | 'video' | 'audio' | 'music', requestedProviderId?: string, requestedModelId?: string) {
        // Ensure settings are loaded
        if (!currentSettings) await this.initialize()

        let providerId = requestedProviderId;
        let modelId = requestedModelId;

        // 1. If not requested, check DB defaults for this type
        if (!providerId && currentSettings?.defaults?.[type]) {
            providerId = currentSettings.defaults[type].providerId;
            modelId = modelId || currentSettings.defaults[type].modelId;
            console.log(`[AIServiceManager] Resolved default for ${type}: ${providerId}/${modelId}`);
        }

        // 2. PRIORITY: Fallbacks if still no provider specified
        if (!providerId) {
            if (providerInstances['google']) {
                providerId = 'google'
                modelId = modelId || (type === 'image' ? 'imagen-3.0' : type === 'video' ? 'veo-2.0' : 'gemini-2.5-flash')
            } else if (providerInstances['puter']) {
                providerId = 'puter'
                modelId = modelId || (type === 'image' ? 'dall-e-3' : 'gpt-4o-mini')
            } else {
                // Last resort fallback
                providerId = Object.keys(providerInstances).find(k => k !== 'private') || 'puter';
            }
            console.log(`[AIServiceManager] Using hardcoded fallback for ${type}: ${providerId}/${modelId}`);
        }

        // Get Provider Instance
        const provider = await this.getProvider(providerId)
        if (!provider) {
             // Second chance fallback if the specific ID failed but others exist
             const fallback = Object.keys(providerInstances).find(k => k !== 'private');
             if (fallback) {
                 console.warn(`[AIServiceManager] Provider ${providerId} not found. Falling back to ${fallback}.`);
                 return { provider: providerInstances[fallback], providerId: fallback, modelId: modelId || 'gemini-2.5-flash' };
             }
             throw new Error(`Provider ${providerId} not found or not initialized`)
        }

        return { provider, providerId, modelId }
    }

    /**
     * Generate text using a specific model
     */
    public async generateText(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('text', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'gemini-2.5-flash' // Fallback

        // SOVEREIGN HYBRID ROUTING (Phase 9)
        // If it's a "brain/logic" task and local AI is ready, use PrivateLLM
        if (options.usePrivateAI || (currentSettings?.usePrivateAI && providerId === 'google')) {
            if (await privateLLMClient.testConnection()) {
                console.log(`[AIServiceManager] 🛡️ Routing text task to Private AI (Local)`);
                const result = await privateLLMClient.chat(prompt, { model: options.localModel || 'llama3' });
                if (result) return result;
            }
        }

        // SMART MULTI-ACCOUNT SELECTION for Google/AIStudio tasks
        if (providerId === 'google' || providerId === 'aistudio' || providerId === 'gemini-chat') {
            try {
                const { GeminiClient } = await import('../../integrations/ai/GeminiClient.js');
                const client = new GeminiClient({});
                return await client.generateContent(prompt, finalModelName, options).then(r => r.text);
            } catch (apiError: any) {
                console.error(`[AIServiceManager] Gemini direct failed, trying fallback chain...`);
            }
        }

        // PRIORITY FALLBACK TO PUTER (Phase 30.3)
        if (providerId !== 'puter') {
            const puter = providerInstances['puter'];
            if (puter && await puter.isReady()) {
                try {
                    console.log(`[AIServiceManager] Calling Puter as Priority Provider for text...`);
                    const result = await puter.generateText(prompt, finalModelName, options);
                    return result.text;
                } catch (e) {
                    console.warn(`[AIServiceManager] Puter priority failed, falling back to ${providerId}...`);
                }
            }
        }

        try {
            if (providerId === 'google' && provider.generate) {
                // Genkit Native
                const { systemPrompt, ...genConfig } = options;

                const result = await provider.generate({
                    model: googleAI.model(finalModelName),
                    prompt: prompt,
                    systemInstruction: systemPrompt,
                    config: genConfig
                })
                return result.text
            } else {
                // Custom Adapter or AIStudio Native
                const result = await provider.generateText(prompt, finalModelName, options)
                return result.text
            }
        } catch (error: any) {
            console.error(`AI Text Generation failed (${finalModelName}) via ${providerId}:`, error.message)

            // AUTOMATIC FALLBACK TO GEMINI CHAT
            if (providerId !== 'gemini-chat') {
                const geminiChat = providerInstances['gemini-chat'];
                if (geminiChat && await geminiChat.isReady()) {
                    console.log(`[AIServiceManager] Falling back to Gemini Chat for text generation...`);
                    const result = await geminiChat.generateText(prompt, finalModelName, options);
                    return result.text;
                }
            }
            throw error
        }
    }

    /**
     * Generate image using a specific model
     */
    public async generateImage(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('image', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'imagen-3.0' // Fallback

        // SMART MULTI-ACCOUNT SELECTION
        if (providerId === 'google' || providerId === 'aistudio' || providerId === 'gemini-chat') {
            try {
                const { GeminiClient } = await import('../../integrations/ai/GeminiClient.js');
                const client = new GeminiClient({});
                const result = await client.generateImage(prompt, finalModelName, options);
                
                // Reformat for Service Manager response
                const base64Data = result.url.replace(/^data:image\/\w+;base64,/, "");
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: result.mimeType || 'image/png' };
            } catch (apiError: any) {
                console.error(`[AIServiceManager] Gemini Image direct failed, trying fallback chain...`);
            }
        }

        // PRIORITY FALLBACK TO PUTER (Phase 30.3)
        // if (providerId !== 'puter') {
        //     const puter = providerInstances['puter'];
        //     if (puter && await puter.isReady()) {
        //         try {
        //             console.log(`[AIServiceManager] Calling Puter as Priority Provider for image...`);
        //             const result = await puter.generateImage(prompt, finalModelName, options);
        //             const media = result.media;
        //             if (media && media.url) {
        //                  const { getFileBuffer } = await import('../AIGenerator.js');
        //                  const buffer = await getFileBuffer(media.url);
        //                  return { buffer, mimeType: media.mimeType || 'image/png' };
        //             }
        //         } catch (e) {
        //             console.warn(`[AIServiceManager] Puter priority failed for image, falling back to ${providerId}...`);
        //         }
        //     }
        // }

        console.debug(`generateImage [Provider: ${providerId}, Model: ${finalModelName}]`)

        const executeImageGen = async (p: any, pId: string) => {
            let media: any;
            if (pId === 'google' && typeof p.generate === 'function') {
                // Genkit Native
                const result = await p.generate({
                    model: googleAI.model(finalModelName),
                    prompt: prompt,
                    config: { responseModalities: ['IMAGE'] }
                })
                media = result.media
            } else {
                // Custom Adapter or Multi-Account Provider
                const result = await p.generateImage(prompt, finalModelName, options)
                media = result.media || result
            }

            if (!media || !media.url) throw new Error('No image generated')

            // Case 1: External URL (HTTP)
            if (typeof media.url === 'string' && media.url.startsWith('http')) {
                const { getFileBuffer } = await import('../AIGenerator.js');
                const buffer = await getFileBuffer(media.url);
                return { buffer, mimeType: media.mimeType || 'image/png' };
            }

            // Case 2: Data URL (Base64)
            if (typeof media.url === 'string' && media.url.startsWith('data:')) {
                const base64Data = media.url.replace(/^data:image\/\w+;base64,/, "");
                if (!base64Data) throw new Error('Invalid image data format');
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'image/png' }
            }

            // Fallback for raw objects
            const base64Data = typeof media.url === 'string' ? media.url : '';
            return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'image/png' }
        };

        try {
            return await executeImageGen(provider, providerId);
        } catch (error: any) {
            console.error(`AI Image Generation failed (${finalModelName}) via ${providerId}:`, error.message)

            // PRIORITY FALLBACK TO 11LABS
            // if (providerId !== '11labs') {
            //     const labsProvider = providerInstances['11labs'];
            //     if (labsProvider && await labsProvider.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to 11Labs for image generation...`);
            //         try {
            //             return await executeImageGen(labsProvider, '11labs');
            //         } catch (labsError) {
            //             console.error(`[AIServiceManager] 11Labs fallback failed for image:`, (labsError as any).message);
            //         }
            //     }
            // }

            // AUTOMATIC FALLBACK TO GEMINI CHAT
            // if (providerId !== 'gemini-chat') {
            //     const geminiChat = providerInstances['gemini-chat'];
            //     if (geminiChat && await geminiChat.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to Gemini Chat for image generation...`);
            //         return await executeImageGen(geminiChat, 'gemini-chat');
            //     }
            // }

            // AUTOMATIC FALLBACK TO AISTUDIO
            // if (providerId !== 'aistudio') {
            //     const aiStudio = providerInstances['aistudio'];
            //     if (aiStudio && await aiStudio.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to AIStudio for image generation...`);
            //         return await executeImageGen(aiStudio, 'aistudio');
            //     }
            // }
            throw error
        }
    }

    /**
     * Generate video using a specific model
     */
    public async generateVideo(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('video', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'veo-2.0' // Fallback

        // SMART MULTI-ACCOUNT SELECTION (Prefer GeminiVeoProvider for 'google' or pooled tasks)
        if (providerId === 'google' || providerId === 'gemini-veo' || providerId === 'aistudio') {
            try {
                const { GeminiClient } = await import('../../integrations/ai/GeminiClient.js');
                const client = new GeminiClient({});
                console.log(`[AIServiceManager] Calling GeminiClient.generateVideo for ${finalModelName}. Options:`, JSON.stringify(options, null, 2));
                const result = await client.generateVideo(prompt, finalModelName, options);
                
                if (result.url && result.url.startsWith('data:')) {
                    const base64Data = result.url.replace(/^data:video\/\w+;base64,/, "");
                    return { buffer: Buffer.from(base64Data, 'base64'), mimeType: 'video/mp4' };
                } else if (result.url && result.url.startsWith('http')) {
                    console.log(`[AIServiceManager] Downloading video from: ${result.url}`);
                    const { getFileBuffer } = await import('../AIGenerator.js');
                    const buffer = await getFileBuffer(result.url);
                    return { buffer, mimeType: result.mimeType || 'video/mp4', url: result.url };
                }
                return { buffer: Buffer.from(''), mimeType: 'video/mp4', url: result.url };
            } catch (err: any) {
                console.error(`[AIServiceManager] Gemini Veo direct failed, trying fallbacks:`, err.message);
            }
        }

        console.debug(`generateVideo [Provider: ${providerId}, Model: ${finalModelName}]`)

        const executeVideoGen = async (p: any, pId: string) => {
            if (typeof p.generateVideo !== 'function') {
                throw new Error(`Provider ${pId} does not support video generation`)
            }
            const result = await p.generateVideo(prompt, finalModelName, options)

            // Multi-account providers return { media: { url } }, older ones might return { buffer }
            const media = result.media || result;
            if (!media || (!media.url && !media.buffer)) throw new Error('No video generated');

            // Case 1: Buffer
            if (media.buffer) return { buffer: media.buffer, mimeType: media.mimeType || 'video/mp4' };

            // Case 2: External URL (HTTP)
            if (typeof media.url === 'string' && media.url.startsWith('http')) {
                const { getFileBuffer } = await import('../AIGenerator.js');
                const buffer = await getFileBuffer(media.url);
                return { buffer, mimeType: media.mimeType || 'video/mp4' };
            }

            // Case 3: Data URL (Base64)
            if (typeof media.url === 'string' && media.url.startsWith('data:')) {
                const base64Data = media.url.replace(/^data:video\/\w+;base64,/, "");
                if (!base64Data) throw new Error('Invalid video data format');
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'video/mp4' }
            }

            // Fallback
            const base64Data = typeof media.url === 'string' ? media.url : '';
            return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'video/mp4' }
        };

        try {
            if (providerId === 'google') {
                // Fallback to 11labs/flow/aistudio for now if ready
                const labsProvider = providerInstances['11labs'];
                if (labsProvider && await labsProvider.isReady()) {
                    console.log(`[AIServiceManager] Proactively falling back to 11Labs for Google Video task...`);
                    return await executeVideoGen(labsProvider, '11labs');
                }

                const fallbackProvider = providerInstances['aistudio'] || providerInstances['gemini-chat'];
                if (fallbackProvider && await fallbackProvider.isReady()) {
                    return await executeVideoGen(fallbackProvider, 'fallback');
                }
                throw new Error('Native Google Veo via Manager not fully implemented yet');
            }

            return await executeVideoGen(provider, providerId);
        } catch (error: any) {
            console.error(`AI Video Generation failed (${finalModelName}) via ${providerId}:`, error.message)

            // PRIORITY FALLBACK TO 11LABS
            // if (providerId !== '11labs') {
            //     const labsProvider = providerInstances['11labs'];
            //     if (labsProvider && await labsProvider.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to 11Labs for video generation...`);
            //         try {
            //             return await executeVideoGen(labsProvider, '11labs');
            //         } catch (labsError) {
            //             console.error(`[AIServiceManager] 11Labs fallback failed for video:`, (labsError as any).message);
            //         }
            //     }
            // }

            // AUTOMATIC FALLBACK TO GEMINI CHAT
            // if (providerId !== 'gemini-chat') {
            //     const geminiChat = providerInstances['gemini-chat'];
            //     if (geminiChat && await geminiChat.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to Gemini Chat for video generation...`);
            //         return await executeVideoGen(geminiChat, 'gemini-chat');
            //     }
            // }

            // AUTOMATIC FALLBACK TO AISTUDIO
            // if (providerId !== 'aistudio') {
            //     const aiStudio = providerInstances['aistudio'];
            //     if (aiStudio && await aiStudio.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to AIStudio for video generation...`);
            //         return await executeVideoGen(aiStudio, 'aistudio');
            //     }
            // }
            throw error
        }
    }

    /**
     * Generate Audio (TTS) using a specific model
     */
    public async generateAudio(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('audio', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'tts-1' // Fallback

        // Proactive switch to AIStudio if ready
        // if (providerId === 'google' || providerId === 'google-tts') {
        //     const aiStudio = providerInstances['aistudio'];
        //     if (aiStudio && await aiStudio.isReady()) {
        //         console.log(`[AIServiceManager] AIStudio is Ready. Proactively using it for audio generation.`);
        //         provider = aiStudio;
        //         providerId = 'aistudio';
        //     }
        // }

        // SMART MULTI-ACCOUNT SELECTION for Audio
        if (providerId === 'google' || providerId === 'google-tts') {
            try {
                const voiceProvider = options.providerId || 'gemini';
                if(voiceProvider === 'gemini'){
                    const { GeminiClient } = await import('../../integrations/ai/GeminiClient.js');
                    const client = new GeminiClient({});
                    const result = await client.generateAudio(prompt, options.voiceId || 'Puck', finalModelName, options);
                    return { media: result };    
                }
                else{ // google-tts
                    // const { GoogleTTSService } = await import('../../integrations/ai/GeminiClient.js');
                    // const client = new GoogleTTSService({});
                    // const result = await client.generateAudio(prompt, options.voiceId || 'Puck', finalModelName, options);
                    // return { media: result };
                }
            } catch (err: any) {
                console.error(`[AIServiceManager] Gemini direct audio failed, trying fallback chain...`);
            }
        }

        // if ((providerId === 'elevenlabs' || providerId === '11labs') && options.usePool) {
        //     // Only use pool if explicitly requested or for general background tasks
        //     // For "ElevenLabs provider" (static key), we skip this and use the direct instance below
        //     const account = await aiAccountManager.getOptimalAccount('audio');
        //     if (account && account.accountType === '11labs-direct') {
        //         console.log(`[AIServiceManager] Using 11Labs Direct pooled account for audio: ${account.email}`);
        //         const { ElevenLabsDirectClient } = await import('../../integrations/ai/ElevenLabsDirectClient.js');
        //         const client = new ElevenLabsDirectClient({
        //             email: account.email,
        //             token: account.accessToken || 'invalid',
        //             licenseKey: account.licenseKey,
        //             serviceKeys: account.serviceKeys
        //         });
        //         const buffer = await client.generateAudio(prompt, finalModelName, options);
        //         return { media: { url: `data:audio/mpeg;base64,${buffer.toString('base64')}`, mimeType: 'audio/mpeg' } };
        //     }
        // }

        // PRIORITY FALLBACK TO PUTER (Phase 30.3)
        // if (providerId !== 'puter') {
        //     const puter = providerInstances['puter'];
        //     if (puter && await puter.isReady()) {
        //         try {
        //             console.log(`[AIServiceManager] Calling Puter as Priority Provider for audio...`);
        //             const result = await puter.generateAudio(prompt, finalModelName, options);
        //             return result;
        //         } catch (e) {
        //             console.warn(`[AIServiceManager] Puter priority failed for audio, falling back to ${providerId}...`);
        //         }
        //     }
        // }

        console.debug(`generateAudio [Provider: ${providerId}, Model: ${finalModelName}]`)

        try {
            if (providerId === 'google') {
                // For now, treat Google TTS as a manual implementation or via CustomAdapter if configured
                throw new Error('Native Google TTS via Genkit not fully implemented yet')
            } else if (providerId === 'elevenlabs') {
                // ElevenLabs Provider
                const result = await provider.generateAudio(prompt, finalModelName, options)
                return result
            } else if (providerId === 'aistudio') {
                // AIStudio Provider
                const result = await provider.generateAudio(prompt, finalModelName, options)
                return result
            } else {
                // Custom Adapter
                if (typeof provider.generateAudio !== 'function') {
                    throw new Error(`Provider ${providerId} does not support audio generation`)
                }
                const result = await provider.generateAudio(prompt, finalModelName, options)
                return result
            }
        } catch (error: any) {
            console.error(`AI Audio Generation failed (${finalModelName}) via ${providerId}:`, error.message)

            // PRIORITY FALLBACK TO 11LABS
            // if (providerId !== 'elevenlabs' && providerId !== '11labs') {
            //     const labsProvider = providerInstances['11labs'] || providerInstances['elevenlabs'];
            //     if (labsProvider && typeof labsProvider.generateAudio === 'function') {
            //         console.log(`[AIServiceManager] Falling back to 11Labs for audio generation...`);
            //         try {
            //             const result = await labsProvider.generateAudio(prompt, finalModelName, options);
            //             return result;
            //         } catch (labsError) {
            //             console.error(`[AIServiceManager] 11Labs fallback failed for audio:`, (labsError as any).message);
            //         }
            //     }
            // }

            // AUTOMATIC FALLBACK TO AISTUDIO
            // if (providerId !== 'aistudio') {
            //     const aiStudio = providerInstances['aistudio'];
            //     if (aiStudio && await aiStudio.isReady()) {
            //         console.log(`[AIServiceManager] Falling back to AIStudio for audio generation...`);
            //         return await aiStudio.generateAudio(prompt, finalModelName, options);
            //     }
            // }
            throw error
        }
    }

    /**
     * Generate Music using a specific model
     */
    public async generateMusic(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('audio', inputProviderId, inputModelName); // Reuse audio resolution for music
        const finalModelName = modelId || inputModelName || 'music-fx-default';

        // SMART MULTI-ACCOUNT SELECTION (Prefer GeminiMusicProvider for 'google' or pooled tasks)
        if (providerId === 'google' || providerId === 'gemini-music' || providerId === 'aistudio') {
            try {
                const { GeminiClient } = await import('../../integrations/ai/GeminiClient.js');
                const client = new GeminiClient({});
                const result = await client.generateMusic(prompt, finalModelName, options);
                const media = result as any;
                if (media.url && media.url.startsWith('data:')) {
                    const base64Data = media.url.replace(/^data:audio\/\w+;base64,/, "");
                    return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'audio/mpeg' };
                }
                return { buffer: Buffer.from(''), mimeType: media.mimeType || 'audio/mpeg', url: media.url };
            } catch (err: any) {
                console.error(`[AIServiceManager] Gemini direct music failed, trying fallbacks:`, err.message);
            }
        }

        // Direct handling for ElevenLabs music
        // if (providerId === '11labs' || providerId === 'elevenlabs') {
        //     const account = await aiAccountManager.getOptimalAccount('audio'); // Reuse audio pool
        //     if (account && account.accountType === '11labs-direct') {
        //         console.log(`[AIServiceManager] Using 11Labs Direct account for music: ${account.email}`);
        //         const { ElevenLabsDirectClient } = await import('../../integrations/ai/ElevenLabsDirectClient.js');
        //         const client = new ElevenLabsDirectClient({
        //             email: account.email,
        //             token: account.accessToken || 'invalid',
        //             licenseKey: account.licenseKey
        //         });

        //         try {
        //             const result = await client.generateMusic(prompt, { ...options, modelId: finalModelName });
        //             await aiAccountManager.recordUsage(account, finalModelName);

        //             const sound = result.sounds?.[0];
        //             return { buffer: Buffer.from(sound.data, 'base64'), mimeType: `audio/${sound.audioContainer.toLowerCase()}` };
        //         } catch (e: any) {
        //             console.error(`[AIServiceManager] 11Labs music direct failed for ${account.email}:`, e.message);
        //         }
        //     }
        // }

        console.debug(`generateMusic [Provider: ${providerId}, Model: ${finalModelName}]`);

        try {
            if (typeof provider.generateMusic === 'function') {
                return await provider.generateMusic(prompt, finalModelName, options);
            }
            throw new Error(`Provider ${providerId} does not support music generation`);
        } catch (error: any) {
            console.error(`AI Music Generation failed (${finalModelName}) via ${providerId}:`, error.message);
            throw error;
        }
    }

    /**
     * Generate optimized English prompts for AI generation
     */
    public async generatePrompt(payload: any, type: string, options: any = {}) {
        const translator = async (prompt: string) => {
            return await this.generateText(prompt, 'gemini-2.5-flash', undefined, { ...options, usePrivateAI: false });
        };

        if (type === 'segment' || type === 'video' || type === 'image') {
            // Resolve style from payload or project analysis
            const videoStyle = payload.videoStyle || payload.projectAnalysis?.creativeBrief?.visualStyle || payload.projectAnalysis?.visuals?.visualStyle?.label || 'Cinematic';

            // 1. Build Scene Prompt (for Images) - Now async with internal translation
            const imagePrompt = await buildScenePrompt(payload.description, payload.characters_context || [], videoStyle, payload.projectAnalysis, 'vi', translator);

            
            // 2. Build Veo Video Prompt (for Video)
            const videoPrompt = await buildVeoVideoPrompt(payload, payload.all_characters || [], payload.projectAnalysis || payload, 'vi', translator);

            return {
                imagePrompt: imagePrompt,
                videoPrompt: videoPrompt
            };
        } else if (type === 'character') {
            const videoStyle = payload.videoStyle || payload.projectAnalysis?.creativeBrief?.visualStyle || payload.projectAnalysis?.visuals?.visualStyle?.label || 'Cinematic';
            const characterPrompt = await buildCharacterSheetPrompt(payload, videoStyle, payload.projectAnalysis, 'vi', translator);
            
            return { characterPrompt };

        } else if (type === 'audio') {
            const { buildVoiceoverPrompt } = await import('../PromptBuilder.js');
            const audioPrompt = await buildVoiceoverPrompt(payload.text, payload.characterName, payload.all_characters || [], 'vi', translator);
            return { audioPrompt };
        } else if (type === 'music') {
            const { buildMusicPrompt } = await import('../PromptBuilder.js');
            const musicPrompt = await buildMusicPrompt(payload.mood, payload.projectAnalysis, 'vi', translator);
            return { musicPrompt };
        }

        throw new Error(`Unsupported prompt generation type: ${type}`);
    }

    /**
     * Test connection for a specific provider
     */
    public async testConnection(providerId: string): Promise<{ success: boolean; message: string }> {
        const provider = await this.getProvider(providerId);
        if (!provider) {
            return { success: false, message: `Provider ${providerId} not found or not initialized` };
        }

        if (typeof provider.testConnection !== 'function') {
            return { success: false, message: `Provider ${providerId} does not support connection testing` };
        }

        return await provider.testConnection();
    }
}

export const aiManager = AIServiceManager.getInstance()
