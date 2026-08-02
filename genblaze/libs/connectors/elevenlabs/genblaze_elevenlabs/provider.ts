/**
 * ElevenLabsTTSProvider — adapter for ElevenLabs Text-to-Speech API.
 * 1:1 port of connectors/elevenlabs/genblaze_elevenlabs/provider.py
 *
 * Synchronous API: returns audio bytes directly.
 */

import { BaseProviderAdapter, StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';

const FORMAT_TO_MIME: Record<string, string> = {
    'mp3_44100_128': 'audio/mpeg',
    'mp3_44100_192': 'audio/mpeg',
    'mp3_44100_64': 'audio/mpeg',
    'mp3_44100_32': 'audio/mpeg',
    'mp3_22050_32': 'audio/mpeg',
    'pcm_16000': 'audio/pcm',
    'pcm_22050': 'audio/pcm',
    'pcm_24000': 'audio/pcm',
    'pcm_44100': 'audio/pcm',
    'wav_44100': 'audio/wav',
    'opus_48000_128': 'audio/opus'
};

export interface ElevenLabsOptions {
    apiKey?: string;
    defaultVoiceId?: string;
    defaultModel?: string;
    defaultOutputFormat?: string;
}

export interface ElevenLabsTTSResult {
    audioBuffer: Buffer;
    mimeType: string;
    characterCount: number;
}

export interface Voice {
    voiceId: string;
    name: string;
    category?: string;
    description?: string;
    labels?: Record<string, string>;
    sampleUrl?: string;
}

export class ElevenLabsProvider extends BaseProviderAdapter {
    readonly name = 'elevenlabs';
    private apiKey: string;
    private defaultVoiceId: string;
    private defaultModel: string;
    private defaultOutputFormat: string;
    private baseUrl = 'https://api.elevenlabs.io/v1';

    constructor(options: ElevenLabsOptions = {}) {
        super();
        this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY || '';
        this.defaultVoiceId = options.defaultVoiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
        this.defaultModel = options.defaultModel || 'eleven_multilingual_v2';
        this.defaultOutputFormat = options.defaultOutputFormat || 'mp3_44100_128';
    }

    private get headers(): Record<string, string> {
        return {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const text = params.prompt || params.params?.text || '';
        const result = await this.synthesize({
            text,
            voiceId: params.params?.voiceId || params.params?.voice_id,
            model: params.model !== '*' ? params.model : undefined,
            outputFormat: params.params?.outputFormat || params.params?.output_format,
            voiceSettings: params.params?.voiceSettings
        });
        return {
            buffer: result.audioBuffer,
            mimeType: result.mimeType,
            metadata: { characterCount: result.characterCount, model: params.model }
        };
    }

    async synthesize(params: {
        text: string;
        voiceId?: string;
        model?: string;
        outputFormat?: string;
        voiceSettings?: {
            stability?: number;
            similarityBoost?: number;
            style?: number;
            useSpeakerBoost?: boolean;
        };
    }): Promise<ElevenLabsTTSResult> {
        if (!this.apiKey) {
            throw new Error('ELEVENLABS_API_KEY is required for ElevenLabsProvider');
        }

        const voiceId = params.voiceId ?? this.defaultVoiceId;
        const model = params.model ?? this.defaultModel;
        const outputFormat = params.outputFormat ?? this.defaultOutputFormat;
        const mimeType = FORMAT_TO_MIME[outputFormat] ?? 'audio/mpeg';

        const body: Record<string, any> = {
            text: params.text,
            model_id: model
        };

        if (params.voiceSettings) {
            body.voice_settings = {
                stability: params.voiceSettings.stability ?? 0.5,
                similarity_boost: params.voiceSettings.similarityBoost ?? 0.75,
                style: params.voiceSettings.style ?? 0,
                use_speaker_boost: params.voiceSettings.useSpeakerBoost ?? true
            };
        }

        const res = await fetch(
            `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(body)
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        return {
            audioBuffer,
            mimeType,
            characterCount: params.text.length
        };
    }

    async listVoices(): Promise<Voice[]> {
        const res = await fetch(`${this.baseUrl}/voices`, { headers: this.headers });
        if (!res.ok) throw new Error(`ElevenLabs list voices failed (${res.status})`);

        const data = await res.json() as { voices: Array<{
            voice_id: string;
            name: string;
            category?: string;
            description?: string;
            labels?: Record<string, string>;
            preview_url?: string;
        }>};

        return data.voices.map(v => ({
            voiceId: v.voice_id,
            name: v.name,
            category: v.category,
            description: v.description,
            labels: v.labels,
            sampleUrl: v.preview_url
        }));
    }

    async listModels(): Promise<Array<{ modelId: string; name: string; description?: string }>> {
        const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers });
        if (!res.ok) throw new Error(`ElevenLabs list models failed (${res.status})`);

        const data = await res.json() as Array<{ model_id: string; name: string; description?: string }>;
        return data.map(m => ({ modelId: m.model_id, name: m.name, description: m.description }));
    }
}
