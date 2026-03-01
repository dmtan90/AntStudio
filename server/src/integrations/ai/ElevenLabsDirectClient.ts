import axios from 'axios';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/Logger.js';

export interface VeoRequest {
    prompt: string;
    aspectRatio?: string;
    seed?: number;
    duration?: number;
    upscale_1080p?: boolean;
    image_url?: string;
}

/**
 * ElevenLabs Unified Direct Client (Audio, Video, Image)
 * Implements heterogeneous flows based on service type.
 */
export class ElevenLabsDirectClient {
    private googleBaseUrl = 'https://aisandbox-pa.googleapis.com/v1';
    private directBaseUrl = 'https://11labs.net';
    private credentials: {
        email: string;
        token: string;
        licenseKey?: string;
        serviceKeys?: Map<string, string>;
    };

    constructor(credentials: { email: string; token: string; licenseKey?: string; serviceKeys?: Map<string, string> }) {
        this.credentials = credentials;
    }

    /**
     * Generate Video using Veo3 via WebSocket (api.nhungoc.me)
     */
    async generateVideo(req: VeoRequest): Promise<any> {
        return new Promise((resolve, reject) => {
            const licenseKey = this.credentials.serviceKeys?.get?.('video') || this.credentials.licenseKey;

            if (!licenseKey) {
                return reject(new Error('Video license key missing for 11labs-direct'));
            }

            const wsUrl = 'wss://api.nhungoc.me:8766';
            const ws = new WebSocket(wsUrl);
            const taskId = uuidv4();

            const timeout = setTimeout(() => {
                ws.terminate();
                reject(new Error('Video generation via WebSocket timed out (120s)'));
            }, 120000);

            ws.on('open', () => {
                Logger.info(`[ElevenLabsDirectClient] WS Connection opened for task ${taskId}`, 'ElevenLabsDirectClient');
                // 1. Register
                ws.send(JSON.stringify({
                    action: 'register',
                    license_key: licenseKey
                }));
            });

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message.toString());

                    if (data.event === 'registered') {
                        Logger.info(`[ElevenLabsDirectClient] WS Registered. Submitting video prompt...`, 'ElevenLabsDirectClient');
                        // 2. Submit task
                        ws.send(JSON.stringify({
                            action: 'submit_video_prompt',
                            prompt: req.prompt,
                            aspect_ratio: req.aspectRatio || 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                            seed: req.seed || Math.floor(Math.random() * 1000000),
                            upscale_1080p: !!req.upscale_1080p,
                            duration_seconds: req.duration || 8,
                            image_url: req.image_url,
                            task_id: taskId
                        }));
                    } else if (data.event === 'video_queued') {
                        Logger.info(`[ElevenLabsDirectClient] Video queued. Position: ${data.queue_position}`, 'ElevenLabsDirectClient');
                    } else if (data.event === 'video_processing') {
                        Logger.info(`[ElevenLabsDirectClient] Video processing...`, 'ElevenLabsDirectClient');
                    } else if (data.event === 'video_result') {
                        if (data.task_id === taskId || data.status === 'success' || data.status === 'error') {
                            clearTimeout(timeout);
                            ws.close();
                            if (data.status === 'success') {
                                resolve(data);
                            } else {
                                reject(new Error(data.message || 'Video generation failed at server'));
                            }
                        }
                    } else if (data.event === 'error') {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(data.message || 'WebSocket server error'));
                    }
                } catch (err: any) {
                    Logger.error(`[ElevenLabsDirectClient] WS message parsing error: ${err.message}`, 'ElevenLabsDirectClient');
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            ws.on('close', () => {
                Logger.info(`[ElevenLabsDirectClient] WS Connection closed for task ${taskId}`, 'ElevenLabsDirectClient');
            });
        });
    }

    /**
     * Generate Image using Imagen4 via Token Pre-fetch (11labs.net)
     */
    async generateImage(prompt: string, options: any = {}): Promise<any> {
        try {
            const licenseKey = this.credentials.serviceKeys?.get?.('image') || this.credentials.licenseKey;

            if (!licenseKey) {
                throw new Error('Image license key missing for 11labs-direct');
            }

            // 1. Fetch dynamic tokens from 11labs.net
            Logger.info(`[ElevenLabsDirectClient] Fetching Imagen4 tokens for license ${licenseKey.substring(0, 8)}...`, 'ElevenLabsDirectClient');
            const tokenResponse = await axios.post(`${this.directBaseUrl}/api/checker/get-imagen4-token.php`, {
                license_key: licenseKey,
                limit: 1
            });

            if (!tokenResponse.data.success || !tokenResponse.data.data?.tokens?.[0]) {
                throw new Error('Failed to fetch Imagen4 token: ' + (tokenResponse.data.message || 'No tokens available'));
            }

            const dynamicToken = tokenResponse.data.data.tokens[0];

            // 2. Call standard Google API with the retrieved token
            const payload = {
                model: options.modelId || 'imagen_4_0_generate_001',
                prompt: prompt,
                aspect_ratio: options.aspectRatio || '1:1',
                safety_filter_level: 'BLOCK_ONLY_HIGHY_EXPLICIT'
            };

            const response = await axios.post(`${this.googleBaseUrl}/runImagenFx`, payload, {
                headers: {
                    'Authorization': `Bearer ${dynamicToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            Logger.error(`ElevenLabs Imagen Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Generate Audio using ElevenLabs via Resource Allocation (11labs.net)
     */
    async generateAudio(prompt: string, modelId: string = 'eleven_multilingual_v2', options: any = {}): Promise<any> {
        try {
            const licenseKey = this.credentials.serviceKeys?.get?.('voice') || this.credentials.licenseKey;

            if (!licenseKey) {
                throw new Error('Voice license key missing for 11labs-direct');
            }

            const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel

            // 1. Request resource allocation from 11labs.net to get an ElevenLabs API Key
            Logger.info(`[ElevenLabsDirectClient] Allocating ElevenLabs resource for license ${licenseKey.substring(0, 8)}...`, 'ElevenLabsDirectClient');
            const allocationResponse = await axios.post(`${this.directBaseUrl}/api/resource/initial_allocation`, {
                license_key: licenseKey,
                voice_id: voiceId,
                text_length: prompt.length,
                model_id: modelId,
                combine_output: true
            });

            if (!allocationResponse.data.success || !allocationResponse.data.data?.api_key) {
                throw new Error('Failed to allocate ElevenLabs voice resource: ' + (allocationResponse.data.message || 'No API key allocated'));
            }

            const allocatedApiKey = allocationResponse.data.data.api_key;

            // 2. Call official ElevenLabs API with the allocated key
            const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                text: prompt,
                model_id: modelId,
                voice_settings: options.voice_settings || { stability: 0.5, similarity_boost: 0.75 }
            }, {
                headers: {
                    'xi-api-key': allocatedApiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer'
            });

            return Buffer.from(response.data);
        } catch (error: any) {
            Logger.error(`ElevenLabs Audio Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Generate Music/Sound Effects using ElevenLabs via Resource Allocation (11labs.net)
     */
    async generateMusic(prompt: string, options: any = {}): Promise<any> {
        try {
            const licenseKey = this.credentials.serviceKeys?.get?.('voice') || this.credentials.licenseKey;

            if (!licenseKey) {
                throw new Error('Music license key missing for 11labs-direct');
            }

            // 1. Request resource allocation from 11labs.net
            Logger.info(`[ElevenLabsDirectClient] Allocating ElevenLabs music resource for license ${licenseKey.substring(0, 8)}...`, 'ElevenLabsDirectClient');
            const allocationResponse = await axios.post(`${this.directBaseUrl}/api/resource/initial_allocation`, {
                license_key: licenseKey,
                text_length: prompt.length,
                service: 'sound-effects'
            });

            if (!allocationResponse.data.success || !allocationResponse.data.data?.api_key) {
                throw new Error('Failed to allocate ElevenLabs music resource: ' + (allocationResponse.data.message || 'No API key allocated'));
            }

            const allocatedApiKey = allocationResponse.data.data.api_key;

            // 2. Call official ElevenLabs Sound Effects API
            const response = await axios.post(`https://api.elevenlabs.io/v1/sound-generation`, {
                text: prompt,
                duration_seconds: options.duration || 10,
                prompt_influence: options.prompt_influence || 0.3
            }, {
                headers: {
                    'xi-api-key': allocatedApiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            return {
                sounds: [
                    {
                        data: Buffer.from(response.data).toString('base64'),
                        audioContainer: 'MP3'
                    }
                ]
            };
        } catch (error: any) {
            Logger.error(`ElevenLabs Music Direct failed: ${error.message}`, 'ElevenLabsDirectClient');
            throw error;
        }
    }

    /**
     * Fallback or Legacy: Poll status of a video operation
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
