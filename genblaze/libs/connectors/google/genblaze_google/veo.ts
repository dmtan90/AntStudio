/**
 * GoogleVeoProvider — Google Veo video generation adapter.
 * 1:1 port of connectors/google/genblaze_google/veo.py
 */

import { BaseProviderAdapter, StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';
import { Modality } from '../../../core/genblaze_core/models/enums.js';

export interface GoogleVeoOptions {
    apiKey?: string;
}

export class GoogleVeoProvider extends BaseProviderAdapter {
    readonly name = 'google-veo';
    private apiKey: string;

    constructor(options: GoogleVeoOptions = {}) {
        super();
        this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required for GoogleVeoProvider');
        }

        const body = {
            prompt: params.prompt,
            model: params.model,
            modality: Modality.VIDEO
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:predict?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Google Veo video generation failed (${res.status}): ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        return {
            buffer: Buffer.from(arrayBuffer),
            mimeType: 'video/mp4',
            metadata: { model: params.model }
        };
    }
}

export class GoogleProvider extends GoogleVeoProvider {}
