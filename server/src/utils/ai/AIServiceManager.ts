import { AIAccountProvider } from '~/models/AIAccount.js';
import { aiAccountManager } from './AIAccountManager.js'
import { CloudCodeClient } from '../../integrations/ai/CloudCodeClient.js'
import { configService, EnvConfig } from '../ConfigService.js'
import { CustomAIAdapter } from './CustomAIAdapter.js'
import { privateLLMClient } from './PrivateLLMClient.js'
import { buildCharacterSheetPrompt, buildScenePrompt, buildVeoVideoPrompt, buildVoiceoverPrompt, buildMusicPrompt } from '../PromptBuilder.js'

import { Logger } from '../Logger.js';
import { config } from '../config.js';
import { AIModelType } from '~/models/AdminSettings.js';
import { GeminiClient } from '~/integrations/ai/GeminiClient.js';
import { GoogleTTSProvider } from './providers/GoogleTTSProvider.js';
import { getFileBuffer } from '../AIGenerator.js';
import { flowAdapter } from './providers/FlowAdapter.js';

// Singleton instance cache
let providerInstances: Record<string, any> = {}
// let currentSettings: any = null

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
            // currentSettings = configService.aiSettings;
        } catch (error) {
            Logger.error('Failed to load settings:', 'AIServiceManager', error);
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
            // if (!currentSettings) await this.initialize();
            const providers = configService.aiProviders || []; //currentSettings?.providers || [];
            const providerConfig = providers.find((p: any) => p.id === providerId);
            Logger.info(`Initializing provider: ${providerId} with config: ${providerConfig ? JSON.stringify(providerConfig) : '{}'}`, 'AIServiceManager');
            if (providerId === AIAccountProvider.GOOGLE || providerId === AIAccountProvider.GOOGLE_VERTEX) {
                const apiKey = providerConfig?.isActive ? providerConfig.apiKey : process.env.GEMINI_API_KEY;
                const serviceAccount = EnvConfig.googleApplicationCredentials;
                let client = null;
                if(apiKey || serviceAccount){
                    client = new GeminiClient({ apiKey, serviceAccount });
                    Logger.info(`Google Gemini/Vertex Client (Unified) initialized by ${apiKey ? 'api key' : 'service account'}.`, 'AIServiceManager');
                }
                else{
                    Logger.error('Google Gemini/Vertex Client (Unified) not initialized. No API key or ADC found.', 'AIServiceManager');
                }

                if(client){
                    if(providerId === AIAccountProvider.GOOGLE){
                        providerInstances[AIAccountProvider.GOOGLE] = client;
                    }
                    else{
                        providerInstances[AIAccountProvider.GOOGLE_VERTEX] = client;
                    }
                }
            }
            else if (providerId === AIAccountProvider.PRIVATE) {
                providerInstances[AIAccountProvider.PRIVATE] = privateLLMClient;
            } else if (providerConfig?.baseUrl) {
                // Custom Adapter
                providerInstances[providerId] = new CustomAIAdapter(
                    providerConfig.apiKey,
                    providerConfig.baseUrl,
                    providerConfig.taskConfigs
                );
                Logger.info(`Custom Provider "${providerId}" initialized.`,'AIServiceManager');
            } else if (providerId === AIAccountProvider.GOOGLE_FLOW) {
                providerInstances[AIAccountProvider.GOOGLE_FLOW] = flowAdapter;
                Logger.info('Google Flow Adapter initialized.', 'AIServiceManager');
            }
        } catch (error: any) {
            Logger.error(`Failed to initialize provider "${providerId}":`, error.message, 'AIServiceManager');
        }
    }

    /**
     * Resolve Provider and Model based on Defaults
     */
    private async resolveProvider(type: AIModelType, requestedProviderId?: string, requestedModelId?: string) {
        // Ensure settings are loaded
        // if (!currentSettings) await this.initialize()
        
        let providerId = requestedProviderId || AIAccountProvider.GOOGLE;//vertex
        let modelId = requestedModelId;
        const defaultConfig = configService.aiDefaultModels?.[type];
        // Logger.debug("resolveProvider", 'AIServiceManager', {type, requestedProviderId, requestedModelId, defaultConfig: JSON.stringify(defaultConfig)});
        // 1. If not requested, check DB defaults for this type
        if (defaultConfig) {
            providerId = providerId || defaultConfig.providerId;
            modelId = modelId || defaultConfig.modelId;
            Logger.info(`Resolved default for ${type}: ${providerId}/${modelId}`, 'AIServiceManager');
        }

        // 2. Mapping legacy IDs to the unified Google provider
        const legacyGeminiIds = ['aistudio', 'gemini-chat', 'gemini-veo', 'gemini-music', 'gemini-content', 'google-tts'];
        if (providerId && legacyGeminiIds.includes(providerId)) {
            providerId = AIAccountProvider.GOOGLE;//'vertex';
        }

        // 3. PRIORITY: Fallbacks if still no provider specified
        // if (!providerId) {
        //     if (providerInstances['google']) {
        //         providerId = 'google'
        //         modelId = modelId || (type === 'image' ? 'imagen-3.0' : type === 'video' ? 'veo-2.0' : 'gemini-2.5-flash')
        //     } else {
        //         // Last resort fallback
        //         providerId = Object.keys(providerInstances).find(k => k !== 'private') || 'google';
        //     }
        //     Logger.info(`Using resolved fallback for ${type}: ${providerId}/${modelId}`, 'AIServiceManager');
        // }

        // Get Provider Instance
        const provider = await this.getProvider(providerId)
        if (!provider) {
             // Second chance fallback if the specific ID failed but others exist
             const fallback = Object.keys(providerInstances).find(k => k !== 'private');
             if (fallback) {
                 Logger.warn(`Provider ${providerId} not found. Falling back to ${fallback}.`, 'AIServiceManager');
                 return { provider: providerInstances[fallback], providerId: fallback, modelId: modelId || config.geminiModelTextAnalysis };
             }
             throw new Error(`Provider ${providerId} not found or not initialized`)
        }

        return { provider, providerId, modelId }
    }

    /**
     * Generate text using a specific model
     */
    public async generateText(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}): Promise<string> {
        let { provider, providerId, modelId } = await this.resolveProvider(AIModelType.TEXT, inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || config.geminiModelTextAnalysis;

        // SOVEREIGN HYBRID ROUTING
        if (options.usePrivateAI || (providerId === AIAccountProvider.PRIVATE)) {
            if (await privateLLMClient.testConnection()) {
                Logger.info(`🛡️ Routing text task to Private AI (Local)`, 'AIServiceManager');
                const result = await privateLLMClient.chat(prompt, { model: options.localModel || 'llama3' });
                if (result) return result;
            }
        }

        try {
            if (providerId === AIAccountProvider.GOOGLE || providerId === AIAccountProvider.GOOGLE_VERTEX) {
                const result = await provider.generateContent(prompt, finalModelName, options);
                return result.text;
            } else {
                const result = await provider.generateText(prompt, finalModelName, options);
                return result.text;
            }
        } catch (error: any) {
            Logger.error(`AI Text Generation failed (${finalModelName}) via ${providerId}:`, error.message)

            if (providerId !== AIAccountProvider.GOOGLE && providerId !== AIAccountProvider.GOOGLE_VERTEX) {
                Logger.info(`Falling back to primary Gemini for text generation...`, 'AIServiceManager');
                return this.generateText(prompt, finalModelName, AIAccountProvider.GOOGLE, options);
            }
            throw error
        }
    }

    /**
     * Generate image using a specific model
     */
    public async generateImage(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider(AIModelType.IMAGE, inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || config.geminiModelImageGeneration;

        try {
            let result: any = null;
            Logger.info(`generateImage inputModelName:${inputModelName} inputProviderId:${inputProviderId} providerId:${providerId} modelId:${modelId}`, "AIServiceManager");
            //priority google-flow first
            if (!inputProviderId && providerId != AIAccountProvider.GOOGLE_FLOW) {
                Logger.info("Try Google Flow provider first", "AIServiceManager");
                let { provider: flowProvider, providerId: flowProviderId } = await this.resolveProvider(AIModelType.IMAGE, AIAccountProvider.GOOGLE_FLOW, inputModelName);
                if (flowProviderId == AIAccountProvider.GOOGLE_FLOW) {
                    const account = await aiAccountManager.getOptimalAccount(AIModelType.IMAGE, AIAccountProvider.GOOGLE_FLOW);
                    if (account) {
                        try{
                            result = await flowProvider.generateImage(account, prompt, finalModelName, options);
                            if (result && (result.jobId || result.status === 'pending')) {
                                return result;
                            }
                        }catch(err: any){
                            Logger.error(`AI Image Generation failed (${finalModelName}) via ${flowProviderId}: ${err.message}`, 'AIServiceManager');
                            result = null;
                        }
                    }
                }
            }

            if(!result){
                if (providerId === AIAccountProvider.GOOGLE || providerId === AIAccountProvider.GOOGLE_VERTEX) {
                    result = await provider.generateImage(prompt, finalModelName, options);
                    if(!result && inputProviderId){
                        const account = await aiAccountManager.getOptimalAccount(AIModelType.IMAGE, AIAccountProvider.GOOGLE_FLOW);
                        if(account){
                            ({ provider, providerId, modelId } = await this.resolveProvider(AIModelType.IMAGE, AIAccountProvider.GOOGLE_FLOW, finalModelName));
                            Logger.info(`Using Google Flow account for image generation: ${account.email}`, 'AIServiceManager');
                            if(provider){
                                result = await provider.generateImage(account, prompt, modelId, options);
                            }
                        }
                    }
                } else if (providerId === AIAccountProvider.GOOGLE_FLOW) {
                    const account = await aiAccountManager.getOptimalAccount(AIModelType.IMAGE, AIAccountProvider.GOOGLE_FLOW);
                    if (!account) throw new Error('No active Google Flow account found');
                    result = await provider.generateImage(account, prompt, finalModelName, options);
                } else {
                    result = await provider.generateImage(prompt, finalModelName, options);
                }
            }

            if(!result){
                throw new Error('No image generated');
            }

            // Handle async/jobId return from Flow
            if (result.jobId || result.status === 'pending') {
                return result;
            }

            const media = result.media || result;
            if (!media || (!media.url && !media.buffer)) throw new Error('No image generated');

            if (media.buffer) {
                return { buffer: media.buffer, mimeType: media.mimeType || 'image/png' };
            }

            if (typeof media.url === 'string' && media.url.startsWith('http')) {
                
                const buffer = await getFileBuffer(media.url);
                return { buffer, mimeType: media.mimeType || 'image/png' };
            }

            if (typeof media.url === 'string' && media.url.startsWith('data:')) {
                const base64Data = media.url.replace(/^data:image\/\w+;base64,/, "");
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'image/png' }
            }

            const base64Data = typeof media.url === 'string' ? media.url : '';
            return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'image/png' }
        } catch (error: any) {
            Logger.error(`AI Image Generation failed (${finalModelName}) via ${providerId}:`, error.message)
            throw error
        }
    }

    /**
     * Generate video using a specific model
     */
    public async generateVideo(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider(AIModelType.VIDEO, inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || config.geminiModelVideoGeneration;

        try {
            let result: any = null;
            Logger.info(`generateVideo inputModelName:${inputModelName} inputProviderId:${inputProviderId} providerId:${providerId} modelId:${modelId}`, "AIServiceManager");
            //priority google-flow first
            if (!inputProviderId && providerId != AIAccountProvider.GOOGLE_FLOW) {
                let { provider: flowProvider, providerId: flowProviderId } = await this.resolveProvider(AIModelType.VIDEO, AIAccountProvider.GOOGLE_FLOW, inputModelName);
                Logger.info(`Try Google Flow provider first flowProvider:${flowProvider} flowProviderId:${flowProviderId}`, "AIServiceManager");
                if (flowProviderId == AIAccountProvider.GOOGLE_FLOW) {
                    const account = await aiAccountManager.getOptimalAccount(AIModelType.VIDEO, AIAccountProvider.GOOGLE_FLOW);
                    if (account) {
                        try{
                            result = await flowProvider.generateVideo(account, prompt, finalModelName, options);
                            if (result && (result.jobId || result.status === 'pending')) {
                                return result;
                            }
                        }catch(err: any){
                            Logger.error(`AI Video Generation failed (${finalModelName}) via ${flowProviderId}: ${err.message}`, 'AIServiceManager');
                            result = null;
                        }
                    }
                    else{
                        Logger.error('Can\'t find the optimal Flow account => please check your flow cookie and sync again', 'AIServiceManager');
                    }
                }
            }

            if(!result){
                if (providerId === AIAccountProvider.GOOGLE || providerId === AIAccountProvider.GOOGLE_VERTEX) {
                    result = await provider.generateVideo(prompt, finalModelName, options);
                    if(!result && inputProviderId){
                        const account = await aiAccountManager.getOptimalAccount(AIModelType.VIDEO, AIAccountProvider.GOOGLE_FLOW);
                        if(account){
                            ({ provider, providerId, modelId } = await this.resolveProvider(AIModelType.VIDEO, AIAccountProvider.GOOGLE_FLOW, finalModelName));
                            if(provider){
                                Logger.info(`Using Google Flow account for video generation: ${account.email}`, 'AIServiceManager');
                                result = await provider.generateVideo(account, prompt, finalModelName, options);
                            }
                        }
                    }
                } else if (providerId === AIAccountProvider.GOOGLE_FLOW) {
                    const account = await aiAccountManager.getOptimalAccount(AIModelType.VIDEO, AIAccountProvider.GOOGLE_FLOW);
                    if (!account) throw new Error('No active Google Flow account found => please check your flow cookie and sync again');
                    result = await provider.generateVideo(account, prompt, finalModelName, options);
                } else {
                    if (typeof provider.generateVideo !== 'function') throw new Error(`Provider ${providerId} does not support video generation`);
                    result = await provider.generateVideo(prompt, finalModelName, options);
                }
            }
            
            if(!result){
                throw new Error('No video generated');
            }

            // Handle async/jobId return
            if (result.jobId || result.status === 'pending') {
                return result;
            }

            const media = result.media || result;
            if (!media || (!media.url && !media.buffer)) throw new Error('No video generated');

            if (media.buffer) return { buffer: media.buffer, mimeType: media.mimeType || 'video/mp4' };

            if (typeof media.url === 'string' && media.url.startsWith('http')) {
                const buffer = await getFileBuffer(media.url);
                return { buffer, mimeType: media.mimeType || 'video/mp4', url: media.url };
            }

            if (typeof media.url === 'string' && media.url.startsWith('data:')) {
                const base64Data = media.url.replace(/^data:video\/\w+;base64,/, "");
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'video/mp4' }
            }

            const base64Data = typeof media.url === 'string' ? media.url : '';
            return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'video/mp4', url: media.url }
        } catch (error: any) {
            Logger.error(`AI Video Generation failed (${finalModelName}) via ${providerId}: ${error.message}`, 'AIServiceManager')
            throw error
        }
    }

    /**
     * Generate Audio (TTS) using a specific model
     */
    public async generateAudio(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        // gemini will inherit modelId from google setting in admin
        let { provider, providerId, modelId } = await this.resolveProvider(AIModelType.AUDIO, (inputProviderId && inputProviderId == AIAccountProvider.GEMINI) ? AIAccountProvider.GOOGLE : inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || config.geminiModelTTS;
        
        Logger.info(`generateAudio inputModelName:${inputModelName} inputProviderId:${inputProviderId} providerId:${providerId} modelId:${modelId}`, "AIServiceManager");
        if (providerId === AIAccountProvider.GOOGLE || providerId === AIAccountProvider.GOOGLE_VERTEX) {
            try {
                const voiceProvider = options.providerId || AIAccountProvider.GEMINI;
                if(voiceProvider === AIAccountProvider.GEMINI){
                    const result = await provider.generateAudio(prompt, options.voiceId || 'Puck', finalModelName, options);
                    return { media: result }; 
                } else {
                    const client = GoogleTTSProvider.getInstance();
                    const result = await client.generateAudio(prompt, options.voiceId || 'en-US-Standard-A', options);
                    return result;
                }
            } catch (err: any) {
                Logger.error(`Gemini direct audio failed:${err.message}`, 'AIServiceManager');
            }
        }

        try {
            if (typeof provider.generateAudio !== 'function') throw new Error(`Provider ${providerId} does not support audio generation`)
            return await provider.generateAudio(prompt, finalModelName, options)
        } catch (error: any) {
            Logger.error(`AI Audio Generation failed (${finalModelName}) via ${providerId}:`, error.message)
            throw error
        }
    }

    /**
     * Generate Music using a specific model
     */
    public async generateMusic(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider(AIModelType.MUSIC, inputProviderId, inputModelName);
        const finalModelName = modelId || inputModelName || config.geminiModelMusic;
        
        Logger.info(`generateMusic inputModelName:${inputModelName} inputProviderId:${inputProviderId} providerId:${providerId} modelId:${modelId}`, "AIServiceManager");
        if (providerId === AIAccountProvider.GOOGLE || providerId === AIAccountProvider.GOOGLE_VERTEX) {
            try {
                const result = await provider.generateMusic(prompt, finalModelName, options);
                const media = result as any;
                if (media.url?.startsWith('data:')) {
                    const base64Data = media.url.replace(/^data:audio\/\w+;base64,/, "");
                    return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'audio/mpeg' };
                }
                return { buffer: Buffer.from(''), mimeType: media.mimeType || 'audio/mpeg', url: media.url };
            } catch (err: any) {
                Logger.error(`Gemini direct music failed:${err.message}`, 'AIServiceManager');
            }
        }

        try {
            if (typeof provider.generateMusic === 'function') {
                return await provider.generateMusic(prompt, finalModelName, options);
            }
            throw new Error(`Provider ${providerId} does not support music generation`);
        } catch (error: any) {
            Logger.error(`AI Music Generation failed (${finalModelName}) via ${providerId}:`, error.message);
            throw error;
        }
    }

    public async getVoiceList(providerId: AIAccountProvider, language?: string){
        try{
            if(providerId == AIAccountProvider.GEMINI){
                let { provider } = await this.resolveProvider(AIModelType.AUDIO, AIAccountProvider.GOOGLE);
                return (provider as GeminiClient).listVoices(language);
            }
            else if(providerId == AIAccountProvider.GOOGLE){
                const client = GoogleTTSProvider.getInstance();
                return client.listVoices(language);
            }
        }catch(error: any){
            Logger.error(`getVoiceList error:${error.message}`, 'AIServiceManager');
        }
        
        return [];
    }

    /**
     * Generate optimized English prompts for AI generation
     */
    public async generatePrompt(payload: any, type: string, options: any = {}) {
        const translator = async (prompt: string) => {
            return await this.generateText(prompt, undefined, undefined, { ...options, usePrivateAI: false });
        };

        if (type === 'segment' || type === AIModelType.VIDEO || type === AIModelType.IMAGE) {
            const videoStyle = payload.videoStyle || payload.projectAnalysis?.creativeBrief?.visualStyle || payload.projectAnalysis?.visuals?.visualStyle?.label || 'Cinematic';
            const imagePrompt = await buildScenePrompt(payload.description, payload.characters_context || [], videoStyle, payload.projectAnalysis, 'en', translator);
            const videoPrompt = await buildVeoVideoPrompt(payload, payload.all_characters || [], payload.projectAnalysis || payload, 'en', translator);

            return { imagePrompt, videoPrompt };
        } else if (type === 'character') {
            const videoStyle = payload.videoStyle || payload.projectAnalysis?.creativeBrief?.visualStyle || payload.projectAnalysis?.visuals?.visualStyle?.label || 'Cinematic';
            const characterPrompt = await buildCharacterSheetPrompt(payload, videoStyle, payload.projectAnalysis, 'en', translator);
            return { characterPrompt };
        } else if (type === AIModelType.AUDIO) {
            
            const audioPrompt = await buildVoiceoverPrompt(payload.text, payload.characterName, payload.all_characters || [], 'en', translator);
            return { audioPrompt };
        } else if (type === AIModelType.MUSIC) {
            
            const musicPrompt = await buildMusicPrompt(payload.mood, payload.projectAnalysis, 'en', translator);
            return { musicPrompt };
        }
        throw new Error(`Unsupported prompt generation type: ${type}`);
    }

    /**
     * Test connection for a specific provider
     */
    public async testConnection(providerId: string): Promise<{ success: boolean; message: string }> {
        const provider = await this.getProvider(providerId);
        if (!provider) return { success: false, message: `Provider ${providerId} not found or not initialized` };
        if (typeof provider.testConnection !== 'function') return { success: false, message: `Provider ${providerId} does not support connection testing` };
        return await provider.testConnection();
    }
}

export const aiManager = AIServiceManager.getInstance()
