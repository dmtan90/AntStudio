import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { OAuth2Client } from 'google-auth-library';

export class GoogleTTSProvider {
    private client!: TextToSpeechClient;

    constructor(config?: { apiKey?: string, accessToken?: string }) {
        this.updateClient(config);
    }

    public updateClient(config?: { apiKey?: string, accessToken?: string, projectId?: string }) {
        const clientConfig: any = {};
        if (config?.apiKey) {
            clientConfig.apiKey = config.apiKey;
        } else if (config?.accessToken) {
            const auth = new OAuth2Client();
            auth.setCredentials({ access_token: config.accessToken });
            // Satisfy newer Cloud SDK requirements
            (auth as any).getUniverseDomain = () => 'googleapis.com';
            (auth as any).getClient = async () => auth;
            
            clientConfig.auth = auth;
            
            if (config.projectId) {
                clientConfig.projectId = config.projectId;
            }
        }
        this.client = new TextToSpeechClient(clientConfig);
    }

    /**
     * List available voices with metadata
     */
    async listVoices(languageCode?: string) {
        try {
            const [response] = await this.client.listVoices({ languageCode });
            if(response.voices){
                // const chirp3_HD = ["achernar", "achird", "algenib", "alnilam", "algieba", "aoede", "autonoe", "callirrhoe", "caph", "charon", "despina", "enceladus", "erinome", "fenrir", "gacrux", "helvetios", "iapetus", "kasami", "kore", "laomedeia", "leda", "orus", "puck", "pulcherrima", "rasalgethi", "rigel", "schedar", "shaula", "sadachbia", "umbriel", "zephyr"];
                for(let i = 0; i < response.voices.length; i++){
                    const voice = response.voices[i];
                    const name = voice?.name?.toLowerCase() || "";
                    const languageCode = voice?.languageCodes?.[0].toLowerCase() || "";
                    //these voices return invalid sampleVoiceURL because of the language code in the name
                    if(!name || !languageCode || !name.includes(languageCode)){
                      response.voices.splice(i, 1);
                      i--;
                    }
                }
            }
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
            let voiceName = options.voiceName || modelId || 'en-US-Wavenet-D';
            
            // GOOGLE FIX: Studio and Journey voices require a specific 'model' parameter
            // let voiceModel: string | undefined = undefined;
            
            const lowVoice = voiceName.toLowerCase();
            const chirp3_HD = ["achernar", "algenib", "alnilam", "algieba", "aoede", "autonoe", "callirrhoe", "charon", "despina", "enceladus", "erinome", "fenrir", "gacrux", "iapetus", "kore", "laomedeia", "leda", "orus", "puck", "pulcherrima", "rasalgethi", "schedar", "umbriel", "zephyr"];
            // if (lowVoice.includes('studio')) {
            //     voiceModel = 'google-studio';
            // } else if (lowVoice.includes('journey') || 
            //           ['achird', 'caph', 'deneb', 'helvetios', 'kasami', 'rigel', 'shaula'].some(v => lowVoice.includes(v))) {
            //     voiceModel = 'google-journey';
            // }
            if (chirp3_HD.includes(lowVoice)) {
                // voiceModel = 'chirp3-hd';
                voiceName = (options.languageCode || 'en-US') + '-Chirp3-HD-' + voiceName;
            }

            const request: any = {
                input: { text },
                voice: {
                    languageCode: options.languageCode || 'en-US',
                    name: voiceName,
                    ssmlGender: options.ssmlGender || 'NEUTRAL',
                },
                audioConfig: {
                    audioEncoding: 'MP3' as const,
                    speakingRate: options.speakingRate || 1.0,
                    pitch: options.pitch || 0,
                    volumeGainDb: options.volumeGainDb || 0,
                },
            };

            // if (voiceModel) {
            //     request.voice.model = voiceModel;
            // }

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
