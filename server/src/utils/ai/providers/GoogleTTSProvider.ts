import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export class GoogleTTSProvider {
    private client: TextToSpeechClient;

    constructor(config?: { apiKey?: string, accessToken?: string }) {
        this.updateClient(config);
    }

    public updateClient(config?: { apiKey?: string, accessToken?: string }) {
        const clientConfig: any = {};
        if (config?.apiKey) {
            clientConfig.apiKey = config.apiKey;
        } else if (config?.accessToken) {
            clientConfig.credentials = { access_token: config.accessToken };
        }
        this.client = new TextToSpeechClient(clientConfig);
    }

    /**
     * List available voices with metadata
     */
    async listVoices(languageCode?: string) {
        try {
            const [response] = await this.client.listVoices({ languageCode });
            return response.voices || [];
        } catch (error: any) {
            console.error('Google TTS List Voices Error:', error.message);
            return []; // Return empty array on error
        }
    }

    /**
     * Generate Audio (TTS)
     */
    async generateAudio(text: string, modelId?: string, options: any = {}) {
        try {
            const request = {
                input: { text },
                voice: {
                    languageCode: options.languageCode || 'en-US',
                    name: options.voiceName || modelId || 'en-US-Wavenet-D',
                    ssmlGender: options.ssmlGender || 'NEUTRAL',
                },
                audioConfig: {
                    audioEncoding: 'MP3' as const,
                    speakingRate: options.speakingRate || 1.0,
                    pitch: options.pitch || 0,
                    volumeGainDb: options.volumeGainDb || 0,
                },
            };

            const [response] = await this.client.synthesizeSpeech(request);
            const audioContent = response.audioContent as Buffer;

            // Convert buffer to data URL
            const base64Audio = audioContent.toString('base64');
            const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

            return {
                media: {
                    url: dataUrl,
                    mimeType: 'audio/mpeg'
                }
            };
        } catch (error: any) {
            console.error('Google TTS Generation Error:', error.message);
            throw error;
        }
    }
}
