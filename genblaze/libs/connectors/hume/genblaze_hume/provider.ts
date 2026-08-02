/**
 * HumeTTSProvider — adapter for the Hume AI Octave Text-to-Speech API.
 * 1:1 port of connectors/hume/genblaze_hume/provider.py
 *
 * Returns base64-encoded audio bytes decoded to Buffer. Supports
 * octave model versions 1 and 2.
 */

const FORMAT_TO_MIME: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    pcm: 'audio/pcm'
};

export interface HumeTTSOptions {
    apiKey?: string;
    defaultModel?: string;
    defaultFormat?: 'mp3' | 'wav' | 'pcm';
}

export interface HumeTTSResult {
    audioBuffer: Buffer;
    mimeType: string;
    characterCount: number;
}

export interface HumeVoice {
    id: string;
    name: string;
    description?: string;
    provider?: string;
}

export class HumeTTSProvider {
    readonly name = 'hume';
    private apiKey: string;
    private defaultModel: string;
    private defaultFormat: 'mp3' | 'wav' | 'pcm';
    private baseUrl = 'https://api.hume.ai/v0';

    constructor(options: HumeTTSOptions = {}) {
        this.apiKey = options.apiKey || process.env.HUME_API_KEY || '';
        this.defaultModel = options.defaultModel || 'octave-1';
        this.defaultFormat = options.defaultFormat || 'mp3';
    }

    private get headers(): Record<string, string> {
        return {
            'X-Hume-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    /** Map step.model slug to Hume API version field. E.g. "octave-2" → "2". */
    private resolveVersion(model: string): string {
        const match = model.match(/(\d+)$/);
        return match ? match[1] : '1';
    }

    async synthesize(params: {
        text: string;
        model?: string;
        voiceId?: string;
        voiceName?: string;
        format?: 'mp3' | 'wav' | 'pcm';
        sampleRate?: number;
        description?: string;
    }): Promise<HumeTTSResult> {
        if (!this.apiKey) {
            throw new Error('HUME_API_KEY is required for HumeTTSProvider');
        }

        const model = params.model ?? this.defaultModel;
        const format = params.format ?? this.defaultFormat;
        const version = this.resolveVersion(model);

        const body: Record<string, any> = {
            utterances: [{ text: params.text }],
            format: { type: format },
            version
        };

        if (params.voiceId) {
            body.utterances[0].voice = { id: params.voiceId };
        } else if (params.voiceName) {
            body.utterances[0].voice = { name: params.voiceName };
        }

        if (params.description) {
            body.utterances[0].description = params.description;
        }

        const res = await fetch(`${this.baseUrl}/tts/json`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Hume TTS failed (${res.status}): ${errText}`);
        }

        const data = await res.json() as {
            generations?: Array<{
                audio?: string;
                duration?: number;
            }>;
        };

        const generation = data.generations?.[0];
        if (!generation?.audio) {
            throw new Error('Hume TTS returned no audio data');
        }

        const audioBuffer = Buffer.from(generation.audio, 'base64');
        return {
            audioBuffer,
            mimeType: FORMAT_TO_MIME[format] ?? 'audio/mpeg',
            characterCount: params.text.length
        };
    }

    async listVoices(): Promise<HumeVoice[]> {
        if (!this.apiKey) return [];
        try {
            const res = await fetch(`${this.baseUrl}/tts/voices`, { headers: this.headers });
            if (!res.ok) return [];
            const data = await res.json() as {
                voices?: Array<{ id: string; name: string; description?: string; provider?: string }>;
            };
            return (data.voices ?? []).map(v => ({
                id: v.id,
                name: v.name,
                description: v.description,
                provider: v.provider
            }));
        } catch {
            return [];
        }
    }
}
