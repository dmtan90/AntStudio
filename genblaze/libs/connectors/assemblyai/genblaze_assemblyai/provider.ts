/**
 * AssemblyAIProvider — adapter for the AssemblyAI speech-to-text API.
 * 1:1 port of connectors/assemblyai/genblaze_assemblyai/provider.py
 */

import crypto from 'crypto';
import { BaseProviderAdapter, StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';

const TERMINAL_STATUSES = new Set(['completed', 'error']);

export interface WordTiming {
    word: string;
    start: number;
    end: number;
    confidence?: number | null;
}

export interface TranscriptResult {
    text: string;
    sha256: string;
    wordTimings: WordTiming[];
    audioDurationSec: number | null;
    speakers?: Array<{ speaker: string; text: string; start: number; end: number }>;
    raw: Record<string, any>;
}

export interface AssemblyAIOptions {
    apiKey?: string;
    maxPollAttempts?: number;
    pollIntervalMs?: number;
}

export class AssemblyAIProvider extends BaseProviderAdapter {
    readonly name = 'assemblyai';
    private apiKey: string;
    private maxPollAttempts: number;
    private pollIntervalMs: number;
    private baseUrl = 'https://api.assemblyai.com/v2';

    constructor(options: AssemblyAIOptions = {}) {
        super();
        this.apiKey = options.apiKey || process.env.ASSEMBLYAI_API_KEY || '';
        this.maxPollAttempts = options.maxPollAttempts ?? 240;
        this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    }

    private get headers(): Record<string, string> {
        return {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const audioUrl = params.prompt || params.params?.audioUrl || params.params?.audio_url;
        if (!audioUrl) {
            throw new Error('AssemblyAIProvider requires audioUrl in prompt or params');
        }
        const result = await this.transcribe(audioUrl, params.params || {});
        return {
            buffer: Buffer.from(result.text),
            mimeType: 'text/plain',
            metadata: { ...result }
        };
    }

    async transcribe(audioUrl: string, params: Record<string, any> = {}): Promise<TranscriptResult> {
        if (!this.apiKey) {
            throw new Error('ASSEMBLYAI_API_KEY is required for AssemblyAIProvider');
        }

        const speechModel = params.model ?? 'universal-3-pro';

        const body: Record<string, any> = {
            audio_url: audioUrl,
            speech_model: speechModel
        };

        if (params.speaker_labels) body.speaker_labels = true;
        if (params.speakers_expected != null) body.speakers_expected = params.speakers_expected;
        if (params.language_code) body.language_code = params.language_code;
        if (params.word_boost) body.word_boost = params.word_boost;
        if (params.punctuate !== false) body.punctuate = true;
        if (params.format_text !== false) body.format_text = true;

        const submitRes = await fetch(`${this.baseUrl}/transcript`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!submitRes.ok) {
            const err = await submitRes.text();
            throw new Error(`AssemblyAI transcription submit failed (${submitRes.status}): ${err}`);
        }

        const submitted = await submitRes.json() as { id: string; status: string };
        const transcriptId = submitted.id;

        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await new Promise(r => setTimeout(r, this.pollIntervalMs));

            const pollRes = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
                headers: this.headers
            });

            if (!pollRes.ok) {
                throw new Error(`AssemblyAI poll failed (${pollRes.status})`);
            }

            const status = await pollRes.json() as {
                status: string;
                text?: string;
                words?: Array<{ text: string; start: number; end: number; confidence: number }>;
                utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
                audio_duration?: number;
                error?: string;
            };

            if (!TERMINAL_STATUSES.has(status.status)) continue;

            if (status.status === 'error') {
                throw new Error(`AssemblyAI transcription failed: ${status.error ?? 'unknown error'}`);
            }

            const text = status.text ?? '';
            const sha256 = crypto.createHash('sha256').update(text).digest('hex');

            const wordTimings: WordTiming[] = (status.words ?? []).map(w => ({
                word: w.text,
                start: w.start / 1000,
                end: w.end / 1000,
                confidence: w.confidence
            }));

            const speakers = (status.utterances ?? []).map(u => ({
                speaker: u.speaker,
                text: u.text,
                start: u.start / 1000,
                end: u.end / 1000
            }));

            return {
                text,
                sha256,
                wordTimings,
                audioDurationSec: status.audio_duration ?? null,
                speakers: speakers.length > 0 ? speakers : undefined,
                raw: status as Record<string, any>
            };
        }

        throw new Error(`AssemblyAI transcription timed out after ${this.maxPollAttempts} poll attempts`);
    }
}
