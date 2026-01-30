import { AIAccount } from '../../models/AIAccount.js'
import { aiAccountManager } from './AIAccountManager.js'
import { CloudCodeClient } from '../../integrations/ai/CloudCodeClient.js'
import { configService } from '../configService.js'
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'
import { CustomAIAdapter } from './CustomAIAdapter.js'
import { privateLLMClient } from './PrivateLLMClient.js'

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
     * Initializes or updates provider instances based on DB settings
     */
    public async initialize() {
        try {
            // Ensure config is fresh
            await configService.refresh();
            const settings = configService.ai;
            currentSettings = settings // Cache settings for defaults

            const providers = settings?.providers || []

            // Clear old instances if needed
            // providerInstances = {} 

            for (const provider of providers) {
                if (!provider.isActive) continue

                if (provider.id === 'google' && provider.apiKey) {
                    // Google GenAI (Native Genkit)
                    providerInstances['google'] = genkit({
                        plugins: [googleAI({ apiKey: provider.apiKey })]
                    })
                }
                else if (provider.id === '11labs') {
                    // ElevenLabs Direct Provider (from researched tools - Video & Audio)
                    const { ElevenLabsDirectProvider } = await import('./providers/ElevenLabsDirectProvider.js');
                    providerInstances['11labs'] = new ElevenLabsDirectProvider(provider.apiKey);
                    console.log('[AIServiceManager] ElevenLabs Direct (Video & Audio) Provider initialized.');
                }
                else if (provider.id === 'aistudio') {
                    // AIStudio (Browser Automation - Free Quota)
                    const { AIStudioProvider } = await import('./providers/AIStudioProvider.js');
                    providerInstances['aistudio'] = new AIStudioProvider();
                    console.log('[AIServiceManager] AIStudio Browser-based Provider initialized.');
                }
                else if (provider.id === 'gemini-chat') {
                    // Gemini Chat (Multi-Account API Pool - Professional)
                    const { GeminiChatProvider } = await import('./providers/GeminiChatProvider.js');
                    providerInstances['gemini-chat'] = new GeminiChatProvider();
                    console.log('[AIServiceManager] Gemini Chat Multi-Account API Pool initialized.');
                }
                else if (provider.id === 'flow') {
                    // Labs Flow (API-First Strategy - Experimental)
                    const { FlowProvider } = await import('./providers/FlowProvider.js');
                    providerInstances['flow'] = new FlowProvider();
                    console.log('[AIServiceManager] Labs Flow API-First Provider initialized.');
                }
                else if (provider.apiKey && provider.baseUrl) {
                    // Pass taskConfigs if available
                    providerInstances[provider.id] = new CustomAIAdapter(
                        provider.apiKey,
                        provider.baseUrl,
                        provider.taskConfigs // Pass the map directly
                    )
                }
            }

            // Always init Private Provider (Ollama) as a baseline for sovereignty
            providerInstances['private'] = privateLLMClient;

            // Fallback for Env Vars (Legacy) - ConfigService handles defaults too but good to double check
            // If not in DB, check if we have a fallback key from ConfigService (which reads env)
            const fallbackKey = process.env.GEMINI_API_KEY
            if (fallbackKey && !providerInstances['google']) {
                providerInstances['google'] = genkit({
                    plugins: [googleAI({ apiKey: fallbackKey })]
                })
            }

            // Init ElevenLabs if Key exists (Env or DB)
            const elevenKey = settings?.providers?.find((p: any) => p.id === 'elevenlabs')?.apiKey || process.env.ELEVENLABS_API_KEY;
            if (elevenKey && !providerInstances['elevenlabs']) {
                const { ElevenLabsProvider } = await import('./providers/ElevenLabsProvider.js');
                providerInstances['elevenlabs'] = new ElevenLabsProvider(elevenKey);
            }

            // Global Init native providers if not already initialized (to ensure they're always available as fallback/test)
            if (!providerInstances['aistudio']) {
                const { AIStudioProvider } = await import('./providers/AIStudioProvider.js');
                providerInstances['aistudio'] = new AIStudioProvider();
            }
            if (!providerInstances['gemini-chat']) {
                const { GeminiChatProvider } = await import('./providers/GeminiChatProvider.js');
                providerInstances['gemini-chat'] = new GeminiChatProvider();
            }
            if (!providerInstances['google-tts']) {
                const { GoogleTTSProvider } = await import('./providers/GoogleTTSProvider.js');
                const staticKey = settings?.providers?.find((p: any) => p.id === 'google')?.apiKey || process.env.GOOGLE_API_KEY;
                providerInstances['google-tts'] = new GoogleTTSProvider(staticKey ? { apiKey: staticKey } : {});
            }

            if (!providerInstances['flow']) {
                const { FlowProvider } = await import('./providers/FlowProvider.js');
                providerInstances['flow'] = new FlowProvider();
            }

        } catch (error) {
            console.error('Failed to initialize AI Service Manager:', error)
        }
    }

    /**
     * Get a specific provider instance
     */
    public async getProvider(providerId: string) {
        if (!providerInstances[providerId]) {
            await this.initialize()
        }
        return providerInstances[providerId]
    }

    /**
     * Resolve Provider and Model based on Defaults
     */
    private async resolveProvider(type: 'text' | 'image' | 'video' | 'audio', requestedProviderId?: string, requestedModelId?: string) {
        // Ensure settings are loaded
        if (!currentSettings) await this.initialize()

        let providerId = requestedProviderId
        let modelId = requestedModelId

        // If no provider specified, check defaults
        if (!providerId && currentSettings?.defaults?.[type]) {
            providerId = currentSettings.defaults[type].providerId
            modelId = modelId || currentSettings.defaults[type].modelId
        }

        // Fallback to google if still nothing (shouldn't happen if defaults exist)
        providerId = providerId || 'google'

        // Get Provider Instance
        const provider = await this.getProvider(providerId)
        if (!provider) throw new Error(`Provider ${providerId} not found or not initialized`)

        return { provider, providerId, modelId }
    }

    /**
     * Generate text using a specific model
     */
    public async generateText(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('text', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'gemini-1.5-flash' // Fallback

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
        if (providerId === 'google' || providerId === 'aistudio') {
            const account = await aiAccountManager.getOptimalAccount('text');
            if (account) {
                console.log(`[AIServiceManager] Using ${account.accountType === 'antigravity' ? 'Antigravity' : 'CloudCode'} API with account: ${account.email}`);

                let client: any;
                if (account.accountType === 'antigravity') {
                    const { AntigravityClient } = await import('../../integrations/ai/AntigravityClient.js');
                    client = new AntigravityClient(account);
                } else {
                    client = new CloudCodeClient(account);
                }

                try {
                    const result = await client.generateContent(prompt, finalModelName);

                    // Track usage via centralized manager
                    await aiAccountManager.recordUsage(account, finalModelName);

                    return result.text;
                } catch (apiError: any) {
                    console.error(`[AIServiceManager] Direct API failed for ${account.email}, trying fallback chain...`);
                    // If one account fails, we could loop here to try others
                }
            }
        }

        console.debug(`generateText [Provider: ${providerId}, Model: ${finalModelName}]`)

        try {
            if (providerId === 'google' && provider.generate) {
                // Genkit Native
                const result = await provider.generate({
                    model: googleAI.model(finalModelName),
                    prompt: prompt,
                    config: options
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
        if (providerId === 'google' || providerId === 'aistudio' || providerId === '11labs') {
            const account = await aiAccountManager.getOptimalAccount('image');
            if (account) {
                console.log(`[AIServiceManager] Using ${account.accountType} API for image generation: ${account.email}`);

                let client: any;
                if (account.accountType === 'antigravity') {
                    const { AntigravityClient } = await import('../../integrations/ai/AntigravityClient.js');
                    client = new AntigravityClient(account);
                } else if (account.accountType === '11labs-direct') {
                    const { ElevenLabsDirectClient } = await import('../../integrations/ai/ElevenLabsDirectClient.js');
                    client = new ElevenLabsDirectClient({
                        email: account.email,
                        token: account.accessToken || 'invalid',
                        licenseKey: account.licenseKey,
                        serviceKeys: account.serviceKeys
                    });
                } else {
                    client = new CloudCodeClient(account);
                }

                try {
                    const result = await client.generateImage(prompt, finalModelName);
                    // Central manager record usage
                    await aiAccountManager.recordUsage(account, finalModelName);

                    // Reformat for Service Manager response
                    const base64Data = result.url.replace(/^data:image\/\w+;base64,/, "");
                    return { buffer: Buffer.from(base64Data, 'base64'), mimeType: 'image/png' };
                } catch (apiError: any) {
                    console.error(`[AIServiceManager] Direct Image API failed, trying fallback chain...`);
                }
            }
        }

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
            if (providerId !== '11labs') {
                const labsProvider = providerInstances['11labs'];
                if (labsProvider && await labsProvider.isReady()) {
                    console.log(`[AIServiceManager] Falling back to 11Labs for image generation...`);
                    try {
                        return await executeImageGen(labsProvider, '11labs');
                    } catch (labsError) {
                        console.error(`[AIServiceManager] 11Labs fallback failed for image:`, (labsError as any).message);
                    }
                }
            }

            // AUTOMATIC FALLBACK TO GEMINI CHAT
            if (providerId !== 'gemini-chat') {
                const geminiChat = providerInstances['gemini-chat'];
                if (geminiChat && await geminiChat.isReady()) {
                    console.log(`[AIServiceManager] Falling back to Gemini Chat for image generation...`);
                    return await executeImageGen(geminiChat, 'gemini-chat');
                }
            }

            // AUTOMATIC FALLBACK TO AISTUDIO
            if (providerId !== 'aistudio') {
                const aiStudio = providerInstances['aistudio'];
                if (aiStudio && await aiStudio.isReady()) {
                    console.log(`[AIServiceManager] Falling back to AIStudio for image generation...`);
                    return await executeImageGen(aiStudio, 'aistudio');
                }
            }
            throw error
        }
    }

    /**
     * Generate video using a specific model
     */
    public async generateVideo(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('video', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'veo-2.0' // Fallback

        // SMART MULTI-ACCOUNT SELECTION
        if (providerId === 'google' || providerId === 'aistudio' || providerId === '11labs') {
            const account = await aiAccountManager.getOptimalAccount('video');
            if (account) {
                console.log(`[AIServiceManager] Using ${account.accountType} API for video generation: ${account.email}`);

                let client: any;
                if (account.accountType === 'antigravity') {
                    const { AntigravityClient } = await import('../../integrations/ai/AntigravityClient.js');
                    client = new AntigravityClient(account);
                } else if (account.accountType === '11labs-direct') {
                    const { ElevenLabsDirectClient } = await import('../../integrations/ai/ElevenLabsDirectClient.js');
                    const token = account.accessToken || 'invalid';
                    client = new ElevenLabsDirectClient({ email: account.email, token, licenseKey: account.licenseKey });
                } else {
                    client = new CloudCodeClient(account);
                }

                try {
                    // Correctly map options to VeoRequest
                    const result = await client.generateVideo({
                        prompt: prompt,
                        aspectRatio: options.aspectRatio,
                        duration: options.duration,
                        seed: options.seed,
                        upscale_1080p: options.upscale_1080p,
                        image_url: options.characterImages?.[0] || options.imageStart || options.imageUrl
                    });

                    // Record usage
                    await aiAccountManager.recordUsage(account, finalModelName);

                    // Reformat for Service Manager response
                    if (result.url && result.url.startsWith('data:')) {
                        const base64Data = result.url.replace(/^data:video\/\w+;base64,/, "");
                        return { buffer: Buffer.from(base64Data, 'base64'), mimeType: 'video/mp4' };
                    }
                    // If it's an operation name or external URL
                    return { buffer: Buffer.from(''), mimeType: 'video/mp4', url: result.url };
                } catch (apiError: any) {
                    console.error(`[AIServiceManager] Direct Video API failed, trying fallback chain...`);
                }
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
            if (providerId !== '11labs') {
                const labsProvider = providerInstances['11labs'];
                if (labsProvider && await labsProvider.isReady()) {
                    console.log(`[AIServiceManager] Falling back to 11Labs for video generation...`);
                    try {
                        return await executeVideoGen(labsProvider, '11labs');
                    } catch (labsError) {
                        console.error(`[AIServiceManager] 11Labs fallback failed for video:`, (labsError as any).message);
                    }
                }
            }

            // AUTOMATIC FALLBACK TO GEMINI CHAT
            if (providerId !== 'gemini-chat') {
                const geminiChat = providerInstances['gemini-chat'];
                if (geminiChat && await geminiChat.isReady()) {
                    console.log(`[AIServiceManager] Falling back to Gemini Chat for video generation...`);
                    return await executeVideoGen(geminiChat, 'gemini-chat');
                }
            }

            // AUTOMATIC FALLBACK TO AISTUDIO
            if (providerId !== 'aistudio') {
                const aiStudio = providerInstances['aistudio'];
                if (aiStudio && await aiStudio.isReady()) {
                    console.log(`[AIServiceManager] Falling back to AIStudio for video generation...`);
                    return await executeVideoGen(aiStudio, 'aistudio');
                }
            }
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
        if (providerId === 'google' || providerId === 'google-tts') {
            const aiStudio = providerInstances['aistudio'];
            if (aiStudio && await aiStudio.isReady()) {
                console.log(`[AIServiceManager] AIStudio is Ready. Proactively using it for audio generation.`);
                provider = aiStudio;
                providerId = 'aistudio';
            }
        }

        // SMART MULTI-ACCOUNT SELECTION for Audio
        if (providerId === 'google' || providerId === 'google-tts') {
            // Sourcing from AI Account standard as requested
            const account = await aiAccountManager.getOptimalAccount('audio');
            // Check if it's a standard google account
            if (account && account.providerId === 'google' && account.accountType === 'standard') {
                console.log(`[AIServiceManager] Using Standard OAuth account for Google TTS: ${account.email}`);
                const token = await aiAccountManager.refreshAccessToken(account);

                // Get the instance and update its token
                const googleTTS = providerInstances['google-tts'];
                if (googleTTS && typeof googleTTS.updateClient === 'function') {
                    googleTTS.updateClient({ accessToken: token });
                    return await googleTTS.generateAudio(prompt, finalModelName, options);
                }
            }
        }

        if ((providerId === 'elevenlabs' || providerId === '11labs') && options.usePool) {
            // Only use pool if explicitly requested or for general background tasks
            // For "ElevenLabs provider" (static key), we skip this and use the direct instance below
            const account = await aiAccountManager.getOptimalAccount('audio');
            if (account && account.accountType === '11labs-direct') {
                console.log(`[AIServiceManager] Using 11Labs Direct pooled account for audio: ${account.email}`);
                const { ElevenLabsDirectClient } = await import('../../integrations/ai/ElevenLabsDirectClient.js');
                const client = new ElevenLabsDirectClient({
                    email: account.email,
                    token: account.accessToken || 'invalid',
                    licenseKey: account.licenseKey,
                    serviceKeys: account.serviceKeys
                });
                const buffer = await client.generateAudio(prompt, finalModelName, options);
                return { media: { url: `data:audio/mpeg;base64,${buffer.toString('base64')}`, mimeType: 'audio/mpeg' } };
            }
        }

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
            if (providerId !== 'elevenlabs' && providerId !== '11labs') {
                const labsProvider = providerInstances['11labs'] || providerInstances['elevenlabs'];
                if (labsProvider && typeof labsProvider.generateAudio === 'function') {
                    console.log(`[AIServiceManager] Falling back to 11Labs for audio generation...`);
                    try {
                        const result = await labsProvider.generateAudio(prompt, finalModelName, options);
                        return result;
                    } catch (labsError) {
                        console.error(`[AIServiceManager] 11Labs fallback failed for audio:`, (labsError as any).message);
                    }
                }
            }

            // AUTOMATIC FALLBACK TO AISTUDIO
            if (providerId !== 'aistudio') {
                const aiStudio = providerInstances['aistudio'];
                if (aiStudio && await aiStudio.isReady()) {
                    console.log(`[AIServiceManager] Falling back to AIStudio for audio generation...`);
                    return await aiStudio.generateAudio(prompt, finalModelName, options);
                }
            }
            throw error
        }
    }

    /**
     * Generate Music using a specific model
     */
    public async generateMusic(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('audio', inputProviderId, inputModelName); // Reuse audio resolution for music
        const finalModelName = modelId || inputModelName || 'music-fx-default';

        // SMART MULTI-ACCOUNT SELECTION for Music
        if (providerId === '11labs' || providerId === 'elevenlabs') {
            const account = await aiAccountManager.getOptimalAccount('audio'); // Reuse audio pool
            if (account && account.accountType === '11labs-direct') {
                console.log(`[AIServiceManager] Using 11Labs Direct account for music: ${account.email}`);
                const { ElevenLabsDirectClient } = await import('../../integrations/ai/ElevenLabsDirectClient.js');
                const client = new ElevenLabsDirectClient({
                    email: account.email,
                    token: account.accessToken || 'invalid',
                    licenseKey: account.licenseKey
                });

                try {
                    const result = await client.generateMusic(prompt, { ...options, modelId: finalModelName });
                    await aiAccountManager.recordUsage(account, finalModelName);

                    const sound = result.sounds?.[0];
                    return { buffer: Buffer.from(sound.data, 'base64'), mimeType: `audio/${sound.audioContainer.toLowerCase()}` };
                } catch (e: any) {
                    console.error(`[AIServiceManager] 11Labs music direct failed for ${account.email}:`, e.message);
                }
            }
        }

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
