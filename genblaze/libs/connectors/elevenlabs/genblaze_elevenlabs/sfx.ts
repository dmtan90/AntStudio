/**
 * ElevenLabsSFXProvider — adapter for ElevenLabs Sound Effects API.
 * 1:1 port of connectors/elevenlabs/genblaze_elevenlabs/sfx.py
 *
 * Generates sound effects from text descriptions (e.g., "thunder crashing").
 * Duration 0.5–30 seconds.
 */

export interface ElevenLabsSFXOptions {
    apiKey?: string;
    defaultModel?: string;
}

export interface SFXResult {
    audioBuffer: Buffer;
    mimeType: string;
    durationHint?: number | null;
}

export class ElevenLabsSFXProvider {
    readonly name = 'elevenlabs-sfx';
    private apiKey: string;
    private defaultModel: string;
    private baseUrl = 'https://api.elevenlabs.io/v1';

    constructor(options: ElevenLabsSFXOptions = {}) {
        this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY || '';
        this.defaultModel = options.defaultModel || 'eleven_text_to_sound_v2';
    }

    private get headers(): Record<string, string> {
        return {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    async generate(params: {
        text: string;
        model?: string;
        durationSeconds?: number;
        promptInfluence?: number;
    }): Promise<SFXResult> {
        if (!this.apiKey) {
            throw new Error('ELEVENLABS_API_KEY is required for ElevenLabsSFXProvider');
        }

        const model = params.model ?? this.defaultModel;

        const body: Record<string, any> = {
            text: params.text
        };

        if (params.durationSeconds != null) {
            if (params.durationSeconds < 0.5 || params.durationSeconds > 30) {
                throw new Error(`durationSeconds must be between 0.5 and 30, got ${params.durationSeconds}`);
            }
            body.duration_seconds = params.durationSeconds;
        }

        if (params.promptInfluence != null) {
            body.prompt_influence = params.promptInfluence;
        }

        const res = await fetch(`${this.baseUrl}/sound-generation`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`ElevenLabs SFX failed (${res.status}): ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        return {
            audioBuffer,
            mimeType: 'audio/mpeg',
            durationHint: params.durationSeconds ?? null
        };
    }
}
