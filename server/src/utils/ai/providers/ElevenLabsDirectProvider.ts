import { ElevenLabsDirectClient } from '../../../integrations/ai/ElevenLabsDirectClient.js';

export class ElevenLabsDirectProvider {
    private client: ElevenLabsDirectClient;

    constructor(token: string, email: string = 'unknown', licenseKey?: string) {
        this.client = new ElevenLabsDirectClient({ email, token, licenseKey });
    }

    /**
     * Generate Video (T2V)
     */
    async generateVideo(prompt: string, modelId: string, options: any = {}) {
        const result = await this.client.generateVideo({
            prompt,
            aspectRatio: options.aspectRatio,
            seed: options.seed,
            duration: options.duration
        });

        if (result.video_url) {
            return { media: { url: result.video_url, mimeType: 'video/mp4' } };
        }

        return {
            url: result.operation_id || result.task_id || 'pending',
            media: { url: '', mimeType: 'video/mp4' },
            isAsync: true
        };
    }

    /**
     * Generate Image (Imagen)
     */
    async generateImage(prompt: string, modelId: string, options: any = {}) {
        const result = await this.client.generateImage(prompt, { ...options, modelId });

        // Imagen usually returns media array with base64 or URL
        const media = result.media?.[0] || result.media || result.prediction?.[0] || result;
        const b64 = media.base64 || media.bytes || '';

        if (b64) {
            return {
                buffer: Buffer.from(b64, 'base64'),
                mimeType: media.mimeType || 'image/png'
            };
        }

        return {
            media: { url: media.url || '', mimeType: media.mimeType || 'image/png' }
        };
    }

    /**
     * Generate Audio (TTS)
     */
    async generateAudio(prompt: string, modelId: string, options: any = {}) {
        const buffer = await this.client.generateAudio(prompt, modelId, options);

        // Convert to data URL for consistency in manager
        const base64 = buffer.toString('base64');
        return {
            media: {
                url: `data:audio/mpeg;base64,${base64}`,
                mimeType: 'audio/mpeg'
            }
        };
    }

    /**
     * Generate Music (T2M)
     */
    async generateMusic(prompt: string, modelId: string, options: any = {}) {
        const result = await this.client.generateMusic(prompt, { ...options, modelId });

        // Returns { sounds: [{ data: "...", audioContainer: "WAV", ... }] }
        const sound = result.sounds?.[0] || result.sounds || result;
        const b64 = sound.data || sound.bytes || '';

        if (b64) {
            return {
                buffer: Buffer.from(b64, 'base64'),
                mimeType: `audio/${(sound.audioContainer || 'WAV').toLowerCase()}`
            };
        }

        return {
            media: { url: sound.url || '', mimeType: `audio/${(sound.audioContainer || 'WAV').toLowerCase()}` }
        };
    }

    /**
     * Check async status (Video)
     */
    async checkStatus(taskId: string) {
        return await this.client.checkStatus(taskId);
    }

    async isReady() {
        return true;
    }
}
