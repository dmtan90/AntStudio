import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '../../Logger.js';
import fs from 'fs';
import path from 'path';

export interface GoogleTTSConfig {
    apiKey?: string;
    accessToken?: string;
    projectId?: string;
    serviceAccount?: string | Record<string, any>;
    keyFilename?: string;
    credentials?: {
        client_email?: string;
        private_key?: string;
        [key: string]: any;
    };
}

export class GoogleTTSProvider {
    private client!: TextToSpeechClient;
    private static instance: GoogleTTSProvider;

    constructor(config?: GoogleTTSConfig) {
        this.updateClient(config);
    }

    public static getInstance(): GoogleTTSProvider{
        if(GoogleTTSProvider.instance == null){
            GoogleTTSProvider.instance = new GoogleTTSProvider();
        }
        return GoogleTTSProvider.instance;
    }

    public updateClient(config?: GoogleTTSConfig) {
        const clientConfig: any = {};

        // 1. Direct credentials object or keyFilename
        if (config?.credentials) {
            clientConfig.credentials = config.credentials;
            if (config.projectId) clientConfig.projectId = config.projectId;
        } else if (config?.keyFilename) {
            clientConfig.keyFilename = config.keyFilename;
        } else if (config?.serviceAccount) {
            if (typeof config.serviceAccount === 'object' && config.serviceAccount !== null) {
                clientConfig.credentials = config.serviceAccount;
                if ((config.serviceAccount as any).project_id) {
                    clientConfig.projectId = (config.serviceAccount as any).project_id;
                }
            } else if (typeof config.serviceAccount === 'string') {
                const trimmed = config.serviceAccount.trim();
                if (trimmed.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        clientConfig.credentials = parsed;
                        if (parsed.project_id) clientConfig.projectId = parsed.project_id;
                    } catch (e: any) {
                        Logger.warn(`[GoogleTTSProvider] Failed to parse serviceAccount JSON string: ${e.message}`, 'GoogleTTSProvider');
                    }
                } else if (fs.existsSync(trimmed)) {
                    clientConfig.keyFilename = path.resolve(trimmed);
                }
            }
        }

        // 2. OAuth2 Access Token
        if (!clientConfig.credentials && !clientConfig.keyFilename && config?.accessToken) {
            const auth = new OAuth2Client();
            auth.setCredentials({ access_token: config.accessToken });
            (auth as any).getUniverseDomain = () => 'googleapis.com';
            (auth as any).getClient = async () => auth;
            
            clientConfig.auth = auth;
            if (config.projectId) {
                clientConfig.projectId = config.projectId;
            }
        }

        // 3. API Key
        if (!clientConfig.credentials && !clientConfig.keyFilename && !clientConfig.auth && config?.apiKey) {
            clientConfig.apiKey = config.apiKey;
        }

        // 4. Fallback to GOOGLE_APPLICATION_CREDENTIALS environment variable
        if (!clientConfig.credentials && !clientConfig.keyFilename && !clientConfig.auth && !clientConfig.apiKey) {
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
                clientConfig.keyFilename = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
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
            //format voices
            const formattedVoices = response?.voices?.map((v: any) => ({
                id: v.name,
                name: v.name,
                language: v.languageCodes?.[0] || 'en-US',
                gender: v.ssmlGender || 'NEUTRAL',
                provider: 'google',
                audioSampleUrl: `https://cloud.google.com/static/text-to-speech/docs/audio/${v.name}.wav`
            }))  || [];

            return formattedVoices;
        } catch (error: any) {
            Logger.error(`Google TTS List Voices Error: ${error.message}`, 'GoogleTTSProvider');
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
                    speakingRate: options.speed || 1.0,
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
            Logger.error(`Google TTS Generation Error: ${error.message}`, 'GoogleTTSProvider');
            throw error;
        }
    }
}
