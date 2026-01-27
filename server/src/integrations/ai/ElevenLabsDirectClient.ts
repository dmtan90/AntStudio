import axios from 'axios';
import crypto from 'crypto';
import { systemLogger } from '../../utils/systemLogger.js';

export interface VeoRequest {
    prompt: string;
    aspectRatio?: string;
    seed?: number;
    duration?: number;
    upscale_1080p?: boolean;
}

/**
 * ElevenLabs Unified Direct Client (Audio & Video)
 * Bypasses restrictive license/quota checks by talking directly to compute providers.
 */
export class ElevenLabsDirectClient {
    private googleBaseUrl = 'https://aisandbox-pa.googleapis.com/v1';
    private elevenBaseUrl = 'https://api.elevenlabs.io/v1'; // Standard API but used with direct credentials
    private credentials: { email: string; token: string; licenseKey?: string };

    constructor(credentials: { email: string; token: string; licenseKey?: string }) {
        this.credentials = credentials;
    }

    /**
     * Generate Video using Veo 3.1
     */
    async generateVideo(req: VeoRequest) {
        try {
            const modelName = 'veo_3_1_t2v_fast';
            const payload = {
                model: modelName,
                prompt: req.prompt,
                aspect_ratio: req.aspectRatio || 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                seed: req.seed || Math.floor(Math.random() * 1000000000),
                duration_seconds: req.duration || 8,
                upscale_1080p: !!req.upscale_1080p
            };

            const response = await axios.post(`${this.googleBaseUrl}/runVideoFx`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            systemLogger.error(`ElevenLabs Veo Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Generate Image (Imagen 4.0)
     */
    async generateImage(prompt: string, options: any = {}) {
        try {
            const modelName = options.modelId || 'imagen_4_0_generate_001';

            const payload = {
                model: modelName,
                prompt: prompt,
                aspect_ratio: options.aspectRatio || '1:1',
                safety_filter_level: 'BLOCK_ONLY_HIGHY_EXPLICIT' // Relaxed if needed
            };

            const response = await axios.post(`${this.googleBaseUrl}/runImagenFx`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Usually returns a final URL or base64 in media field
            return response.data;
        } catch (error: any) {
            systemLogger.error(`ElevenLabs Imagen Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Generate Audio using 11Labs TTS
     * This uses the License Key or Token directly to bypass tool-side quotas.
     */
    async generateAudio(prompt: string, modelId?: string, options: any = {}) {
        try {
            const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel
            const model = modelId || 'eleven_multilingual_v2';

            const response = await axios.post(
                `${this.elevenBaseUrl}/text-to-speech/${voiceId}`,
                {
                    text: prompt,
                    model_id: model,
                    voice_settings: options.voice_settings || { stability: 0.5, similarity_boost: 0.75 }
                },
                {
                    headers: {
                        'xi-api-key': this.credentials.licenseKey || this.credentials.token, // Use License Key as API Key
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'arraybuffer'
                }
            );

            return Buffer.from(response.data);
        } catch (error: any) {
            systemLogger.error(`ElevenLabs Audio Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Generate Music (Music FX)
     */
    async generateMusic(prompt: string, options: any = {}) {
        try {
            const payload = {
                generationCount: options.generationCount || 1,
                input: { textInput: prompt },
                loop: !!options.loop,
                soundLengthSeconds: options.duration || 30,
                model: options.modelId || "DEFAULT",
                clientContext: {
                    tool: "MUSICLM_V2",
                    sessionId: crypto.randomUUID()
                }
            };

            const response = await axios.post(`${this.googleBaseUrl}:soundDemo`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            });

            return response.data;
        } catch (error: any) {
            systemLogger.error(`ElevenLabs Music FX Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Poll status of a video operation
     */
    async checkStatus(operationName: string) {
        try {
            const response = await axios.post(`${this.googleBaseUrl}:runVideoFxCheckConcatenationStatus`, {
                operation: { operation: { name: operationName } }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    }
}
