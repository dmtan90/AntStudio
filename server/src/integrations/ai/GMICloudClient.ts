import { IAIAccount } from '../../models/AIAccount.js';
import { Logger } from '../../utils/Logger.js';
import {
    Pipeline,
    Modality,
    ManifestBuilder,
    GMICloudChatClient,
    GMICloudAudioProvider,
    GMICloudImageProvider,
    GMICloudVideoProvider
} from 'genblaze';

export interface GMICloudClientOptions {
    apiKey?: string;
    baseUrl?: string;
    queueBaseUrl?: string;
}

export interface GMICloudModelInfo {
    id: string;
    name?: string;
    type: 'llm' | 'multimodal';
    category?: string;
    contextLength?: number;
    pricing?: any;
    remainingFraction: number;
}

export interface GMICloudCategorizedModels {
    llm: GMICloudModelInfo[];
    multimodal: GMICloudModelInfo[];
}

/**
 * GMICloudClient: High-performance client for GMICloud AI services.
 * Implements GMICloud Inference Engine (OpenAI-compatible LLM endpoint)
 * and Request Queue API (multimodal image, video, audio generation).
 */
export class GMICloudClient {
    private account?: IAIAccount;
    private apiKey: string;
    private baseUrl: string;
    private queueBaseUrl: string;

    constructor(accountOrOptions?: IAIAccount | GMICloudClientOptions) {
        if (accountOrOptions && 'apiKey' in accountOrOptions && typeof accountOrOptions.apiKey === 'string') {
            const opts = accountOrOptions as GMICloudClientOptions;
            this.apiKey = opts.apiKey || '';
            this.baseUrl = opts.baseUrl || process.env.GMI_BASE_URL || 'https://api.gmi-serving.com/v1';
            this.queueBaseUrl = opts.queueBaseUrl || process.env.GMI_QUEUE_BASE_URL || 'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey';
        } else if (accountOrOptions && 'status' in accountOrOptions) {
            this.account = accountOrOptions as IAIAccount;
            this.apiKey = (this.account as any).licenseKey || process.env.GMI_API_KEY || '';
            this.baseUrl = process.env.GMI_BASE_URL || 'https://api.gmi-serving.com/v1';
            this.queueBaseUrl = process.env.GMI_QUEUE_BASE_URL || 'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey';
        } else {
            this.apiKey = process.env.GMI_API_KEY || '';
            this.baseUrl = process.env.GMI_BASE_URL || 'https://api.gmi-serving.com/v1';
            this.queueBaseUrl = process.env.GMI_QUEUE_BASE_URL || 'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey';
        }
    }

    private getApiKey(): string {
        const key = this.apiKey || (this.account as any)?.licenseKey || process.env.GMI_API_KEY;
        if (!key) {
            throw new Error('GMICloud API key is missing. Set GMI_API_KEY environment variable or supply an account with licenseKey/credentials.');
        }
        return key;
    }

    /**
     * Generate text/chat completion content using GMICloudChatClient via Inference Engine.
     * (OpenAI-compatible LLM endpoint: https://api.gmi-serving.com/v1)
     */
    public async generateContent(
        prompt: string | any[],
        modelId: string = 'anthropic/claude-opus-5',
        options: any = {}
    ): Promise<{ text: string }> {
        const apiKey = this.getApiKey();
        Logger.info(`[GMICloudClient] generateContent model: ${modelId}`);

        const promptText = typeof prompt === 'string' ? prompt : (Array.isArray(prompt) ? prompt.map(p => p.text || JSON.stringify(p)).join('\n') : String(prompt));
        const client = new GMICloudChatClient({ apiKey, baseUrl: this.baseUrl });

        try {
            const response = await client.chat({
                model: modelId,
                prompt: promptText,
                systemPrompt: options.systemPrompt
            });

            return { text: response.text };
        } catch (error: any) {
            Logger.error(`[GMICloudClient] generateContent failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate image via Genblaze Pipeline + GMICloudImageProvider (Multimodal Request Queue API).
     */
    public async generateImage(
        prompt: string | any[],
        modelId: string = 'gemini-3.1-flash-lite-image',
        options: any = {}
    ): Promise<{ url: string; manifest?: any }> {
        const apiKey = this.getApiKey();
        Logger.info(`[GMICloudClient] generateImage model: ${modelId}`);

        const promptText = typeof prompt === 'string' ? prompt : (Array.isArray(prompt) ? prompt.map(p => p.text || JSON.stringify(p)).join('\n') : String(prompt));
        const provider = new GMICloudImageProvider({ apiKey, baseUrl: this.queueBaseUrl });

        const pipe = new Pipeline('gmicloud-image-generation');
        pipe.step(provider, {
            model: modelId,
            prompt: promptText,
            modality: Modality.IMAGE,
            params: {
                aspect_ratio: options.aspectRatio || '16:9',
                ...options
            }
        });

        try {
            const { run, manifest } = await pipe.run();
            const assetUrl = run.steps[0]?.assets?.[0]?.url;

            if (!assetUrl) {
                throw new Error('GMICloud Image generation returned no output assets');
            }

            Logger.info(`[GMICloudClient] Image generated successfully. Hash: ${manifest.canonicalHash}`);
            return {
                url: assetUrl,
                manifest
            };
        } catch (error: any) {
            Logger.error(`[GMICloudClient] generateImage failed: ${error.message}`);
            throw new Error(`GMICloud Image Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate video via Genblaze Pipeline + GMICloudVideoProvider (Multimodal Request Queue API).
     */
    public async generateVideo(
        prompt: string,
        modelId: string = 'gemini-omni-flash-preview',
        options: any = {}
    ): Promise<{ url: string; runId: string; manifest?: any }> {
        const apiKey = this.getApiKey();
        Logger.info(`[GMICloudClient] generateVideo model: ${modelId}`);

        const provider = new GMICloudVideoProvider({ apiKey, baseUrl: this.queueBaseUrl });
        const pipe = new Pipeline('gmicloud-video-generation');
        pipe.step(provider, {
            model: modelId,
            prompt,
            modality: Modality.VIDEO,
            params: {
                duration: options.duration || 10,
                aspect_ratio: options.aspectRatio || '16:9',
                ...options
            }
        });

        try {
            const { run, manifest } = await pipe.run();
            const assetUrl = run.steps[0]?.assets?.[0]?.url;

            if (!assetUrl) {
                throw new Error('GMICloud Video generation returned no output assets');
            }

            Logger.info(`[GMICloudClient] Video generated successfully. RunId: ${run.runId}`);
            return {
                url: assetUrl,
                runId: run.runId,
                manifest
            };
        } catch (error: any) {
            Logger.error(`[GMICloudClient] generateVideo failed: ${error.message}`);
            throw new Error(`GMICloud Video Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Audio/TTS via Genblaze Pipeline + GMICloudAudioProvider (Multimodal Request Queue API).
     */
    public async generateAudio(
        text: string,
        modelId: string = 'inworld-tts-1.5-mini',
        options: any = {}
    ): Promise<{ url: string; mimeType: string; manifest?: any }> {
        const apiKey = this.getApiKey();
        Logger.info(`[GMICloudClient] generateAudio model: ${modelId}`);

        const provider = new GMICloudAudioProvider({ apiKey, baseUrl: this.queueBaseUrl });
        const pipe = new Pipeline('gmicloud-audio-generation');
        pipe.step(provider, {
            model: modelId,
            prompt: text,
            modality: Modality.AUDIO,
            params: options
        });

        try {
            const { run, manifest } = await pipe.run();
            const assetUrl = run.steps[0]?.assets?.[0]?.url;

            if (!assetUrl) {
                throw new Error('GMICloud Audio generation returned no output assets');
            }

            Logger.info(`[GMICloudClient] Audio generated successfully.`);
            return {
                url: assetUrl,
                mimeType: 'audio/mpeg',
                manifest
            };
        } catch (error: any) {
            Logger.error(`[GMICloudClient] generateAudio failed: ${error.message}`);
            throw new Error(`GMICloud Audio Gen failed: ${error.message}`);
        }
    }

    /**
     * Generate Music via Genblaze Pipeline + GMICloudAudioProvider (Multimodal Request Queue API).
     * Ref: Minimax Music 2.5 ("minimax-music-2.5")
     */
    public async generateMusic(
        lyrics: string,
        modelId: string = 'minimax-music-2.5',
        options: { prompt?: string; format?: string; sample_rate?: number; bitrate?: number; [key: string]: any } = {}
    ): Promise<{ url: string; mimeType: string; manifest?: any }> {
        const apiKey = this.getApiKey();
        Logger.info(`[GMICloudClient] generateMusic model: ${modelId}`);

        const provider = new GMICloudAudioProvider({ apiKey, baseUrl: this.queueBaseUrl });
        const pipe = new Pipeline('gmicloud-music-generation');
        pipe.step(provider, {
            model: modelId,
            prompt: lyrics,
            modality: Modality.AUDIO,
            params: {
                lyrics,
                prompt: options.prompt,
                format: options.format || 'mp3',
                sample_rate: options.sample_rate || 44100,
                bitrate: options.bitrate || 256000,
                ...options
            }
        });

        try {
            const { run, manifest } = await pipe.run();
            const assetUrl = run.steps[0]?.assets?.[0]?.url;

            if (!assetUrl) {
                throw new Error('GMICloud Music generation returned no output assets');
            }

            Logger.info(`[GMICloudClient] Music generated successfully.`);
            return {
                url: assetUrl,
                mimeType: options.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
                manifest
            };
        } catch (error: any) {
            Logger.error(`[GMICloudClient] generateMusic failed: ${error.message}`);
            throw new Error(`GMICloud Music Gen failed: ${error.message}`);
        }
    }

    /**
     * Fetch LLM Models from GMI Cloud Inference Engine endpoint (GET https://api.gmi-serving.com/v1/models).
     * Ref: https://docs.gmicloud.ai/inference-engine/api-reference/llm-api-reference#list-models
     */
    public async fetchLLMModels(): Promise<GMICloudModelInfo[]> {
        const apiKey = this.getApiKey();
        Logger.info('[GMICloudClient] Fetching live LLM models from GMI Cloud...');

        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const items: any[] = data.data || (Array.isArray(data) ? data : []);

            return items.map(m => ({
                id: m.id || m.name,
                name: m.name || m.id,
                type: 'llm',
                contextLength: m.context_length,
                pricing: m.pricing,
                remainingFraction: 1
            }));
        } catch (error: any) {
            Logger.warn(`[GMICloudClient] Failed to fetch LLM models: ${error.message}`);
            return [];
        }
    }

    /**
     * Fetch Multimodal Models from GMI Cloud Request Queue API (GET https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/models).
     * Ref: https://docs.gmicloud.ai/inference-engine/api-reference/video-api-reference#list-video-models
     */
    public async fetchMultimodalModels(): Promise<GMICloudModelInfo[]> {
        const apiKey = this.getApiKey();
        Logger.info('[GMICloudClient] Fetching live Multimodal models from GMI Cloud...');

        try {
            const response = await fetch(`${this.queueBaseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const rawModels: string[] = data.model_ids || data.models || data.data || (Array.isArray(data) ? data : []);

            return rawModels.map(m => ({
                id: typeof m === 'string' ? m : (m as any).id || (m as any).name,
                type: 'multimodal',
                category: typeof m === 'object' ? (m as any).category : undefined,
                remainingFraction: 1
            }));
        } catch (error: any) {
            Logger.warn(`[GMICloudClient] Failed to fetch Multimodal models: ${error.message}`);
            return [];
        }
    }

    /**
     * Fetch available GMICloud models separated into LLM and Multimodal categories.
     */
    public async fetchCategorizedModels(): Promise<GMICloudCategorizedModels> {
        const [llm, multimodal] = await Promise.all([
            this.fetchLLMModels(),
            this.fetchMultimodalModels()
        ]);
        return { llm, multimodal };
    }

    /**
     * Unified fetchAvailableModels() returning combined model list with type metadata.
     */
    public async fetchAvailableModels(): Promise<GMICloudModelInfo[]> {
        const { llm, multimodal } = await this.fetchCategorizedModels();
        return [...llm, ...multimodal];
    }
}
