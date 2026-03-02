import { AIAccount } from '../../models/AIAccount.js'
import { aiAccountManager } from './AIAccountManager.js'
import { CloudCodeClient } from '../../integrations/ai/CloudCodeClient.js'
import { configService } from '../configService.js'
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'
import { CustomAIAdapter } from './CustomAIAdapter.js'
import { privateLLMClient } from './PrivateLLMClient.js'
import { buildCharacterSheetPrompt, buildScenePrompt, buildVeoVideoPrompt } from '../PromptBuilder.js'

import { Logger } from '../Logger.js';

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
            Logger.error('[AIServiceManager] Failed to load settings:', 'AIServiceManager', error);
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
                    Logger.info('[AIServiceManager] Google Gemini Client (Unified) initialized.');
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
                Logger.info(`[AIServiceManager] Custom Provider "${providerId}" initialized.`);
            }
        } catch (error: any) {
            Logger.error(`[AIServiceManager] Failed to initialize provider "${providerId}":`, error.message);
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
            Logger.info(`[AIServiceManager] Resolved default for ${type}: ${providerId}/${modelId}`);
        }

        // 2. Mapping legacy IDs to the unified Google provider
        const legacyGeminiIds = ['aistudio', 'gemini-chat', 'gemini-veo', 'gemini-music', 'gemini-content', 'google-tts'];
        if (providerId && legacyGeminiIds.includes(providerId)) {
            providerId = 'google';
        }

        // 3. PRIORITY: Fallbacks if still no provider specified
        if (!providerId) {
            if (providerInstances['google']) {
                providerId = 'google'
                modelId = modelId || (type === 'image' ? 'imagen-3.0' : type === 'video' ? 'veo-2.0' : 'gemini-2.5-flash')
            } else {
                // Last resort fallback
                providerId = Object.keys(providerInstances).find(k => k !== 'private') || 'google';
            }
            Logger.info(`[AIServiceManager] Using resolved fallback for ${type}: ${providerId}/${modelId}`);
        }

        // Get Provider Instance
        const provider = await this.getProvider(providerId)
        if (!provider) {
             // Second chance fallback if the specific ID failed but others exist
             const fallback = Object.keys(providerInstances).find(k => k !== 'private');
             if (fallback) {
                 Logger.warn(`[AIServiceManager] Provider ${providerId} not found. Falling back to ${fallback}.`);
                 return { provider: providerInstances[fallback], providerId: fallback, modelId: modelId || 'gemini-2.5-flash' };
             }
             throw new Error(`Provider ${providerId} not found or not initialized`)
        }

        return { provider, providerId, modelId }
    }

    /**
     * Generate text using a specific model
     */
    public async generateText(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}): Promise<string> {
        let { provider, providerId, modelId } = await this.resolveProvider('text', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'gemini-2.5-flash'

        // SOVEREIGN HYBRID ROUTING (Phase 9)
        if (options.usePrivateAI || (currentSettings?.usePrivateAI && providerId === 'google')) {
            if (await privateLLMClient.testConnection()) {
                Logger.info(`[AIServiceManager] 🛡️ Routing text task to Private AI (Local)`);
                const result = await privateLLMClient.chat(prompt, { model: options.localModel || 'llama3' });
                if (result) return result;
            }
        }

        try {
            if (providerId === 'google') {
                const result = await provider.generateContent(prompt, finalModelName, options);
                return result.text;
            } else {
                const result = await provider.generateText(prompt, finalModelName, options);
                return result.text;
            }
        } catch (error: any) {
            Logger.error(`AI Text Generation failed (${finalModelName}) via ${providerId}:`, error.message)

            if (providerId !== 'google') {
                Logger.info(`[AIServiceManager] Falling back to primary Gemini for text generation...`);
                return this.generateText(prompt, finalModelName, 'google', options);
            }
            throw error
        }
    }

    /**
     * Generate image using a specific model
     */
    public async generateImage(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('image', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'imagen-3.0'

        try {
            let result: any;
            if (providerId === 'google') {
                result = await provider.generateImage(prompt, finalModelName, options);
            } else {
                result = await provider.generateImage(prompt, finalModelName, options);
            }

            const media = result.media || result;
            if (!media || !media.url) throw new Error('No image generated');

            if (typeof media.url === 'string' && media.url.startsWith('http')) {
                const { getFileBuffer } = await import('../AIGenerator.js');
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
        let { provider, providerId, modelId } = await this.resolveProvider('video', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'veo-2.0'

        try {
            let result: any;
            if (providerId === 'google') {
                result = await provider.generateVideo(prompt, finalModelName, options);
            } else {
                if (typeof provider.generateVideo !== 'function') throw new Error(`Provider ${providerId} does not support video generation`);
                result = await provider.generateVideo(prompt, finalModelName, options);
            }

            const media = result.media || result;
            if (!media || (!media.url && !media.buffer)) throw new Error('No video generated');

            if (media.buffer) return { buffer: media.buffer, mimeType: media.mimeType || 'video/mp4' };

            if (typeof media.url === 'string' && media.url.startsWith('http')) {
                const { getFileBuffer } = await import('../AIGenerator.js');
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
            Logger.error(`AI Video Generation failed (${finalModelName}) via ${providerId}:`, error.message)
            throw error
        }
    }

    /**
     * Generate Audio (TTS) using a specific model
     */
    public async generateAudio(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        let { provider, providerId, modelId } = await this.resolveProvider('audio', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'tts-1'

        if (providerId === 'google') {
            try {
                const voiceProvider = options.providerId || 'gemini';
                if(voiceProvider === 'gemini'){
                    const result = await provider.generateAudio(prompt, options.voiceId || 'Puck', finalModelName, options);
                    return { media: result };    
                } else {
                    const { GoogleTTSProvider } = await import('./providers/GoogleTTSProvider.js');
                    const client = new GoogleTTSProvider();
                    const result = await client.generateAudio(prompt, options.voiceId || 'en-US-Standard-A', options);
                    return result;
                }
            } catch (err: any) {
                Logger.error(`[AIServiceManager] Gemini direct audio failed:`, err.message);
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
        let { provider, providerId, modelId } = await this.resolveProvider('audio', inputProviderId, inputModelName);
        const finalModelName = modelId || inputModelName || 'music-fx-default';

        if (providerId === 'google') {
            try {
                const result = await provider.generateMusic(prompt, finalModelName, options);
                const media = result as any;
                if (media.url?.startsWith('data:')) {
                    const base64Data = media.url.replace(/^data:audio\/\w+;base64,/, "");
                    return { buffer: Buffer.from(base64Data, 'base64'), mimeType: media.mimeType || 'audio/mpeg' };
                }
                return { buffer: Buffer.from(''), mimeType: media.mimeType || 'audio/mpeg', url: media.url };
            } catch (err: any) {
                Logger.error(`[AIServiceManager] Gemini direct music failed:`, err.message);
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

    /**
     * Generate optimized English prompts for AI generation
     */
    public async generatePrompt(payload: any, type: string, options: any = {}) {
        const translator = async (prompt: string) => {
            return await this.generateText(prompt, undefined, undefined, { ...options, usePrivateAI: false });
        };

        if (type === 'segment' || type === 'video' || type === 'image') {
            const videoStyle = payload.videoStyle || payload.projectAnalysis?.creativeBrief?.visualStyle || payload.projectAnalysis?.visuals?.visualStyle?.label || 'Cinematic';
            const imagePrompt = await buildScenePrompt(payload.description, payload.characters_context || [], videoStyle, payload.projectAnalysis, 'vi', translator);
            const videoPrompt = await buildVeoVideoPrompt(payload, payload.all_characters || [], payload.projectAnalysis || payload, 'vi', translator);

            return { imagePrompt, videoPrompt };
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
        if (!provider) return { success: false, message: `Provider ${providerId} not found or not initialized` };
        if (typeof provider.testConnection !== 'function') return { success: false, message: `Provider ${providerId} does not support connection testing` };
        return await provider.testConnection();
    }
}

export const aiManager = AIServiceManager.getInstance()
