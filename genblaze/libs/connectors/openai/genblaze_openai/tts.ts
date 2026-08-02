/**
 * OpenAI Text-to-Speech provider.
 * 1:1 port of connectors/openai/genblaze_openai/tts.py
 */

const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'sage', 'coral']);
const VALID_FORMATS = new Set(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']);

const FORMAT_TO_MIME: Record<string, string> = {
    mp3: 'audio/mpeg',
    opus: 'audio/opus',
    aac: 'audio/aac',
    flac: 'audio/flac',
    wav: 'audio/wav',
    pcm: 'audio/pcm'
};

export interface OpenAITTSOptions {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    defaultVoice?: string;
    defaultFormat?: string;
}

export interface OpenAITTSResult {
    audioBuffer: Buffer;
    mimeType: string;
    characterCount: number;
}

export class OpenAITTSProvider {
    readonly name = 'openai-tts';
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;
    private defaultVoice: string;
    private defaultFormat: string;

    constructor(options: OpenAITTSOptions = {}) {
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
        this.defaultModel = options.defaultModel || 'tts-1';
        this.defaultVoice = options.defaultVoice || 'alloy';
        this.defaultFormat = options.defaultFormat || 'mp3';
    }

    async synthesize(params: {
        text: string;
        model?: string;
        voice?: string;
        format?: string;
        speed?: number;
    }): Promise<OpenAITTSResult> {
        if (!this.apiKey) throw new Error('OPENAI_API_KEY is required for OpenAITTSProvider');

        const model = params.model ?? this.defaultModel;
        const voice = params.voice ?? this.defaultVoice;
        const format = params.format ?? this.defaultFormat;

        if (!VALID_FORMATS.has(format)) {
            throw new Error(`Invalid format=${JSON.stringify(format)}. Must be one of: ${[...VALID_FORMATS].join(', ')}`);
        }
        if (!VALID_VOICES.has(voice)) {
            throw new Error(`Invalid voice=${JSON.stringify(voice)}. Must be one of: ${[...VALID_VOICES].join(', ')}`);
        }

        const body: Record<string, any> = {
            model,
            input: params.text,
            voice,
            response_format: format
        };
        if (params.speed != null) body.speed = params.speed;

        const res = await fetch(`${this.baseUrl}/audio/speech`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI TTS failed (${res.status}): ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        return {
            audioBuffer: Buffer.from(arrayBuffer),
            mimeType: FORMAT_TO_MIME[format] ?? 'audio/mpeg',
            characterCount: params.text.length
        };
    }
}
