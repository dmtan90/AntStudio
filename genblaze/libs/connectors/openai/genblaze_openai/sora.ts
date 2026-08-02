/**
 * OpenAISoraProvider — OpenAI Sora video generation adapter.
 * 1:1 port of connectors/openai/genblaze_openai/sora.py
 */

import { BaseProviderAdapter, StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';
import { Modality } from '../../../core/genblaze_core/models/enums.js';

export interface OpenAISoraOptions {
    apiKey?: string;
    baseUrl?: string;
}

export class OpenAISoraProvider extends BaseProviderAdapter {
    readonly name = 'openai-sora';
    private apiKey: string;
    private baseUrl: string;

    constructor(options: OpenAISoraOptions = {}) {
        super();
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is required for OpenAISoraProvider');
        }

        const body = {
            model: params.model ?? 'sora-2',
            prompt: params.prompt,
            modality: Modality.VIDEO
        };

        const res = await fetch(`${this.baseUrl}/video/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI Sora video generation failed (${res.status}): ${errText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        return {
            buffer: Buffer.from(arrayBuffer),
            mimeType: 'video/mp4',
            metadata: { model: params.model }
        };
    }
}

export class OpenAIProvider extends OpenAISoraProvider {}
