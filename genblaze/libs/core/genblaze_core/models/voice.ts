/** Voice — describes a single TTS/music voice option. 1:1 port of models/voice.py */

export type VoiceGender = 'male' | 'female' | 'neutral';

export interface Voice {
    readonly voiceId: string;
    readonly name: string;
    readonly provider: string;
    readonly model?: string | null;
    readonly gender?: VoiceGender | null;
    readonly language?: string | null;
    readonly styleTags: readonly string[];
    readonly sampleUrl?: string | null;
    readonly deprecated: boolean;
}

export function createVoice(data: Omit<Voice, 'styleTags' | 'deprecated'> & { styleTags?: string[]; deprecated?: boolean }): Voice {
    return {
        voiceId: data.voiceId,
        name: data.name,
        provider: data.provider,
        model: data.model ?? null,
        gender: data.gender ?? null,
        language: data.language ?? null,
        styleTags: data.styleTags ?? [],
        sampleUrl: data.sampleUrl ?? null,
        deprecated: data.deprecated ?? false
    };
}
