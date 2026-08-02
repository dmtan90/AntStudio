/**
 * LMNTProvider — adapter for the LMNT Text-to-Speech API.
 * 1:1 port of connectors/lmnt/genblaze_lmnt/provider.py
 *
 * Synchronous API: returns audio bytes directly.
 * LMNT has no enumerable model catalog (DiscoverySupport.NONE).
 */

export interface LMNTOptions {
    apiKey?: string;
    defaultModel?: string;
    defaultFormat?: 'mp3' | 'wav' | 'aac';
}

export interface LMNTResult {
    audioBuffer: Buffer;
    mimeType: string;
    wordTimings?: Array<{ word: string; start: number; end: number }>;
    characterCount: number;
}

export class LMNTProvider {
    readonly name = 'lmnt';
    private apiKey: string;
    private defaultModel: string;
    private defaultFormat: 'mp3' | 'wav' | 'aac';
    private baseUrl = 'https://api.lmnt.com/v1';

    constructor(options: LMNTOptions = {}) {
        this.apiKey = options.apiKey || process.env.LMNT_API_KEY || '';
        this.defaultModel = options.defaultModel || 'blizzard';
        this.defaultFormat = options.defaultFormat || 'mp3';
    }

    private get headers(): Record<string, string> {
        return {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    async synthesize(params: {
        text: string;
        voiceId?: string;
        model?: string;
        format?: 'mp3' | 'wav' | 'aac';
        sampleRate?: number;
        returnTimestamps?: boolean;
        temperature?: number;
        topP?: number;
        [key: string]: any;
    }): Promise<LMNTResult> {
        if (!this.apiKey) {
            throw new Error('LMNT_API_KEY is required for LMNTProvider');
        }

        // Warn about deprecated "speed" param
        if ('speed' in params) {
            console.warn(
                '[LMNTProvider] The `speed` parameter has no equivalent in LMNT 2.x. ' +
                'Use `temperature` / `topP` for expressiveness control instead. ' +
                'The `speed` value will be dropped.'
            );
        }

        const model = params.model ?? this.defaultModel;
        const format = params.format ?? this.defaultFormat;

        const body: Record<string, any> = {
            text: params.text,
            model,
            format
        };

        if (params.voiceId) body.voice = params.voiceId;
        if (params.sampleRate) body.sample_rate = params.sampleRate;
        if (params.returnTimestamps) body.return_timestamps = true;
        if (params.temperature != null) body.temperature = params.temperature;
        if (params.topP != null) body.top_p = params.topP;

        const res = await fetch(`${this.baseUrl}/ai/speech/bytes`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`LMNT TTS failed (${res.status}): ${errText}`);
        }

        // If return_timestamps requested, response is JSON with base64 audio
        if (params.returnTimestamps) {
            const data = await res.json() as {
                audio?: string;
                timestamps?: Array<{ text: string; start: number; end: number }>;
            };

            const audioBuffer = Buffer.from(data.audio ?? '', 'base64');
            const wordTimings = (data.timestamps ?? []).map(t => ({
                word: t.text,
                start: t.start,
                end: t.end
            }));

            const mimeMap: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac' };
            return {
                audioBuffer,
                mimeType: mimeMap[format] ?? 'audio/mpeg',
                wordTimings,
                characterCount: params.text.length
            };
        }

        // Otherwise response is raw audio bytes
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        const mimeMap: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac' };

        return {
            audioBuffer,
            mimeType: mimeMap[format] ?? 'audio/mpeg',
            characterCount: params.text.length
        };
    }
}
