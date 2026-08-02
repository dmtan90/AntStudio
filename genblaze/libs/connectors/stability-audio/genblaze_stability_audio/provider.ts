/**
 * StabilityAudioProvider — adapter for Stability AI Stable Audio API.
 * 1:1 port of connectors/stability-audio/genblaze_stability_audio/provider.py
 *
 * Synchronous API: POST multipart form, returns audio bytes directly.
 * Supports text-to-audio music/SFX generation up to ~3 minutes.
 */

const API_URL = 'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio';

const FORMAT_TO_MIME: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg'
};
const OUTPUT_FORMATS = new Set(Object.keys(FORMAT_TO_MIME));

export interface StabilityAudioOptions {
    apiKey?: string;
    defaultModel?: string;
}

export interface StabilityAudioResult {
    audioBuffer: Buffer;
    mimeType: string;
    duration?: number | null;
}

export class StabilityAudioProvider {
    readonly name = 'stability-audio';
    private apiKey: string;
    private defaultModel: string;

    constructor(options: StabilityAudioOptions = {}) {
        this.apiKey = options.apiKey || process.env.STABILITY_API_KEY || '';
        this.defaultModel = options.defaultModel || 'stable-audio-2.5';
    }

    async generate(params: {
        prompt: string;
        model?: string;
        duration?: number;
        outputFormat?: 'mp3' | 'wav' | 'ogg';
        negativePrompt?: string;
        steps?: number;
        cfg?: number;
        seed?: number;
    }): Promise<StabilityAudioResult> {
        if (!this.apiKey) {
            throw new Error('STABILITY_API_KEY is required for StabilityAudioProvider');
        }

        const outputFormat = params.outputFormat ?? 'mp3';
        const duration = params.duration;

        if (!OUTPUT_FORMATS.has(outputFormat)) {
            throw new Error(`Invalid output_format=${JSON.stringify(outputFormat)}. Must be one of: ${[...OUTPUT_FORMATS].join(', ')}`);
        }
        if (duration != null && (duration < 0.5 || duration > 190)) {
            throw new Error(`duration must be between 0.5 and 190, got ${duration}`);
        }

        // Build multipart form data
        const formData = new FormData();
        formData.append('prompt', params.prompt);
        formData.append('output_format', outputFormat);
        if (duration != null) formData.append('duration', String(duration));
        if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
        if (params.steps != null) formData.append('steps', String(params.steps));
        if (params.cfg != null) formData.append('cfg', String(params.cfg));
        if (params.seed != null) formData.append('seed', String(params.seed));

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': `audio/${outputFormat}`
            },
            body: formData
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Stability Audio failed (${res.status}): ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        return {
            audioBuffer,
            mimeType: FORMAT_TO_MIME[outputFormat] ?? 'audio/mpeg',
            duration: duration ?? null
        };
    }
}
