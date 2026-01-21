import { configService } from '../configService.js'
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'
import { CustomAIAdapter } from './CustomAIAdapter.js'

// Singleton instance cache
let providerInstances: Record<string, any> = {}
let currentSettings: any = null

export class AIServiceManager {
    private static instance: AIServiceManager

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
                else if (provider.apiKey && provider.baseUrl) {
                    // Pass taskConfigs if available
                    providerInstances[provider.id] = new CustomAIAdapter(
                        provider.apiKey,
                        provider.baseUrl,
                        provider.taskConfigs // Pass the map directly
                    )
                }
            }

            // Fallback for Env Vars (Legacy) - ConfigService handles defaults too but good to double check
            if (!providerInstances['google']) {
                // If not in DB, check if we have a fallback key from ConfigService (which reads env)
                // Note: ConfigService doesn't expose raw keys easily unless we map them. 
                // But wait, the loop above iterates `settings.providers`. 
                // If `process.env.GEMINI_API_KEY` exists, we might want to ensure it's in the providers list effectively?
                // Or just fallback creation here.
                const fallbackKey = process.env.GEMINI_API_KEY
                if (fallbackKey) {
                    providerInstances['google'] = genkit({
                        plugins: [googleAI({ apiKey: fallbackKey })]
                    })
                }
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
    private async resolveProvider(type: 'text' | 'image' | 'video', requestedProviderId?: string, requestedModelId?: string) {
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
        const { provider, providerId, modelId } = await this.resolveProvider('text', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'gemini-1.5-flash' // Fallback

        console.debug(`generateText [Provider: ${providerId}, Model: ${finalModelName}]`)

        try {
            if (providerId === 'google') {
                // Genkit Native
                const result = await provider.generate({
                    model: googleAI.model(finalModelName),
                    prompt: prompt,
                    config: options
                })
                return result.text
            } else {
                // Custom Adapter
                const result = await provider.generateText(prompt, finalModelName, options)
                return result.text
            }
        } catch (error: any) {
            console.error(`AI Text Generation failed (${finalModelName}):`, error.message)
            throw error
        }
    }

    /**
     * Generate image using a specific model
     */
    public async generateImage(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        const { provider, providerId, modelId } = await this.resolveProvider('image', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'imagen-3.0' // Fallback

        console.debug(`generateImage [Provider: ${providerId}, Model: ${finalModelName}]`)

        try {
            if (providerId === 'google') {
                // Genkit Native
                const result = await provider.generate({
                    model: googleAI.model(finalModelName),
                    prompt: prompt,
                    config: {
                        // Gemini 2.0 Flash Image experimental might not support aspect_ratio in generation_config yet or validation is strict.
                        // Relying on prompt instructions for aspect ratio for now.
                        responseModalities: ['IMAGE']
                    }
                })
                const media = result.media
                if (!media || !media.url) throw new Error('No image generated')

                const base64Data = typeof media.url === 'string'
                    ? media.url.replace(/^data:image\/\w+;base64,/, "")
                    : '';

                if (!base64Data) throw new Error('Invalid image data format')
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: 'image/png' }

            } else {
                // Custom Adapter
                const result = await provider.generateImage(prompt, finalModelName, options)
                const media = result.media
                if (!media || !media.url) throw new Error('No image generated')

                const base64Data = typeof media.url === 'string'
                    ? media.url.replace(/^data:image\/\w+;base64,/, "")
                    : '';

                if (!base64Data) throw new Error('Invalid image data format')
                return { buffer: Buffer.from(base64Data, 'base64'), mimeType: 'image/png' }
            }
        } catch (error: any) {
            console.error(`AI Image Generation failed (${finalModelName}):`, error.message)
            throw error
        }
    }

    /**
     * Generate video using a specific model
     */
    public async generateVideo(prompt: string, inputModelName?: string, inputProviderId?: string, options: any = {}) {
        const { provider, providerId, modelId } = await this.resolveProvider('video', inputProviderId, inputModelName)
        const finalModelName = modelId || inputModelName || 'veo-2.0' // Fallback

        console.debug(`generateVideo [Provider: ${providerId}, Model: ${finalModelName}]`)

        try {
            if (providerId === 'google') {
                // Native Google Veo implementation (if available in Genkit or via direct call logic mimicking CustomAdapter)
                // For now, since Genkit might not have Veo, we might need to rely on CustomAIAdapter logic or special handling
                // But wait, Veo3.ts had specific logic. Ideally we move that here?
                // Or we return a "jobId" or similar.

                // If the provider instance is Genkit, we might check if it supports it or just throw "Not Implemented via Genkit"
                // and rely on veo3.ts's fallback?
                // Actually, let's treat 'google' here as "we need to call Google Cloud directly".
                // But since we want to unify, let's assume CustomAIAdapter-like behavior or throw.
                throw new Error('Native Google Veo via Manager not fully implemented yet - use generic adapter or specific util')
            } else {
                // Custom Adapter (GeminiGen AI, etc.)
                // Expecting { jobId: string, ... } or similar
                if (typeof provider.generateVideo !== 'function') {
                    throw new Error(`Provider ${providerId} does not support video generation`)
                }
                const result = await provider.generateVideo(prompt, finalModelName, options)
                return result
            }
        } catch (error: any) {
            console.error(`AI Video Generation failed (${finalModelName}):`, error.message)
            throw error
        }
    }
}

export const aiManager = AIServiceManager.getInstance()
