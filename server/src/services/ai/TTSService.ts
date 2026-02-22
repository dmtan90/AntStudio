import { GoogleTTSProvider } from '../../utils/ai/providers/GoogleTTSProvider.js';
import { GeminiClient } from '../../integrations/ai/GeminiClient.js';
import { ElevenLabsProvider } from '../../utils/ai/providers/ElevenLabsProvider.js';
import { aiAccountManager } from '../../utils/ai/AIAccountManager.js';
import { AdminSettings } from '../../models/AdminSettings.js';

export class TTSService {
    private googleProvider: GoogleTTSProvider;
    private geminiClient: GeminiClient | null = null;
    private elevenLabsProvider: ElevenLabsProvider | null = null;

    constructor() {
        this.googleProvider = new GoogleTTSProvider();
    }

    /**
     * Generate speech from text using specified provider
     */
    async generateSpeech(options: {
        text: string;
        provider: string;
        voiceId: string;
        language?: string;
    }): Promise<{ media: { url: string; mimeType: string } }> {
        const { text, provider, voiceId, language } = options;

        switch (provider) {
            case 'google': {
                const account = await aiAccountManager.getOptimalAccount('audio');
                if (account) {
                    const token = await aiAccountManager.refreshAccessToken(account);
                    this.googleProvider.updateClient({ 
                        accessToken: token,
                        projectId: account.projectId 
                    });
                }
                return await this.googleProvider.generateAudio(text, voiceId, { languageCode: language });
            }

            case 'gemini': {
                if (!this.geminiClient) {
                    const settings = await AdminSettings.findOne();
                    const geminiConfig = settings?.aiSettings?.providers?.find((p: any) => p.id === 'google');
                    const apiKey = geminiConfig?.apiKey || process.env.GOOGLE_API_KEY;
                    
                    if (!apiKey) {
                        throw new Error('Gemini API key not configured');
                    }
                    
                    this.geminiClient = new GeminiClient({ apiKey });
                }
                const result = await this.geminiClient.generateAudio(text, voiceId);
                return { media: result };
            }

            case 'elevenlabs': {
                if (!this.elevenLabsProvider) {
                    const settings = await AdminSettings.findOne();
                    const elevenLabsConfig = settings?.aiSettings?.providers?.find((p: any) => p.id === 'elevenlabs');
                    const apiKey = elevenLabsConfig?.apiKey || process.env.ELEVENLABS_API_KEY;
                    
                    if (!apiKey) {
                        throw new Error('ElevenLabs API key not configured');
                    }
                    
                    this.elevenLabsProvider = new ElevenLabsProvider(apiKey);
                }
                return await this.elevenLabsProvider.generateAudio(text, voiceId);
            }

            case 'openai': {
                // OpenAI TTS implementation
                throw new Error('OpenAI TTS not yet implemented');
            }

            default:
                throw new Error(`Unsupported TTS provider: ${provider}`);
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    async synthesizeSpeech(text: string, voiceId?: string): Promise<{ url: string }> {
        const result = await this.generateSpeech({
            text,
            provider: 'google',
            voiceId: voiceId || 'en-US-Standard-A',
            language: 'en-US'
        });

        return {
            url: result.media.url
        };
    }
}

export const ttsService = new TTSService();
