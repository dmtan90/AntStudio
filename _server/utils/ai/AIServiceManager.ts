import { getAdminSettings } from '~/server/models/AdminSettings'
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'
// import { openAI } from 'genkitx-openai' // If available/installed, otherwise mock or implement custom adapter

// Singleton instance cache
let providerInstances: Record<string, any> = {}
let lastSettingsUpdate: number = 0

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
            const settings: any = await getAdminSettings()
            const now = Date.now()

            // Reload if settings updated (naive check: refresh every 5 mins or checking lastUpdated timestamp if available)
            // For now, let's just refresh if we have no instances or force it.
            // A better way is to listen to settings events or just check timestamp.

            const providers = settings.aiSettings?.providers || []

            // Clear old instances if needed or update them
            // For simplicity, we recreate. In production, be smarter.

            for (const provider of providers) {
                if (!provider.isActive) continue

                if (provider.id === 'google' && provider.apiKey) {
                    // Google GenAI
                    providerInstances['google'] = genkit({
                        plugins: [googleAI({ apiKey: provider.apiKey })]
                    })
                }
                // else if (provider.id === 'openai' && provider.apiKey) {
                //      providerInstances['openai'] = genkit({ plugins: [openAI({ apiKey: provider.apiKey })] })
                // }
            }

            // Fallback for Env Vars (Legacy)
            if (!providerInstances['google']) {
                const config = useRuntimeConfig()
                const key = config.geminiApiKey
                if (key) {
                    providerInstances['google'] = genkit({
                        plugins: [googleAI({ apiKey: key })]
                    })
                }
            }

            // If still no google, we have a problem if app relies on it

        } catch (error) {
            console.error('Failed to initialize AI Service Manager:', error)
        }
    }

    /**
     * Get a specific provider instance
     */
    public async getProvider(providerId: string = 'google') {
        if (!providerInstances[providerId]) {
            await this.initialize()
        }
        return providerInstances[providerId]
    }

    /**
     * Generate text using a specific model
     */
    public async generateText(prompt: string, modelName: string = 'gemini-1.5-flash', providerId: string = 'google', options: any = {}) {
        const ai = await this.getProvider(providerId)
        if (!ai) throw new Error(`Provider ${providerId} not initialized`)

        // Map model name if needed (e.g., database ID to actual API model name)
        // Here we assume modelName passed is valid for the provider

        try {
            // Genkit specific: model needs to be imported/referenced or string? 
            // googleAI.model(modelName) returns a Ref.
            // We might need to use the string directly if genkit allows or map it.
            // Genkit usually expects a ModelReference or string.

            const result = await ai.generate({
                model: googleAI.model(modelName), // This assumes we are always using googleAI helper, which binds to specific strings. 
                // Valid strings: 'gemini-1.5-pro', 'gemini-1.5-flash', etc.
                prompt: prompt,
                config: options
            })
            return result.text
        } catch (error: any) {
            console.error(`AI Generation failed (${modelName}):`, error.message)
            throw error
        }
    }
}

export const aiManager = AIServiceManager.getInstance()
