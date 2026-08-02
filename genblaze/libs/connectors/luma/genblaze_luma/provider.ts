/**
 * LumaProvider — adapter for the Luma Dream Machine video API.
 * 1:1 port of connectors/luma/genblaze_luma/provider.py
 *
 * Uses the lumaai SDK / REST API with async generation-based workflow:
 *   POST /generations → poll generation → get output URL
 */

import { BaseProviderAdapter, StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';

const VALID_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9', '21:9', '9:21']);
const PARAM_ALLOWLIST = new Set(['prompt', 'aspect_ratio', 'loop', 'resolution', 'duration', 'keyframes']);

function checkAspectRatio(params: Record<string, any>): void {
    const ar = params.aspect_ratio;
    if (ar != null && !VALID_ASPECT_RATIOS.has(ar)) {
        throw new Error(`Invalid aspect_ratio=${JSON.stringify(ar)}. Must be one of ${[...VALID_ASPECT_RATIOS].join(', ')}`);
    }
}

function coerceLoop(value: any): boolean {
    return Boolean(value);
}

export interface LumaProviderOptions {
    apiKey?: string;
    maxPollAttempts?: number;
    pollIntervalMs?: number;
}

export class LumaProvider extends BaseProviderAdapter {
    readonly name = 'luma';
    private apiKey: string;
    private maxPollAttempts: number;
    private pollIntervalMs: number;

    constructor(options: LumaProviderOptions = {}) {
        super();
        this.apiKey = options.apiKey || process.env.LUMAAI_API_KEY || '';
        this.maxPollAttempts = options.maxPollAttempts ?? 120;
        this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const inputParams: Record<string, any> = {
            prompt: params.prompt,
            model: params.model,
            ...(params.params ?? {})
        };
        const result = await this.generate(inputParams);
        return {
            buffer: Buffer.from(result.url),
            mimeType: result.mediaType,
            url: result.url,
            metadata: { model: params.model }
        };
    }

    async generate(params: Record<string, any>): Promise<{ url: string; mediaType: string }> {
        checkAspectRatio(params);

        if (!this.apiKey) {
            throw new Error('LUMAAI_API_KEY is required for LumaProvider');
        }

        const filteredParams: Record<string, any> = {};
        for (const [k, v] of Object.entries(params)) {
            if (PARAM_ALLOWLIST.has(k)) {
                filteredParams[k] = k === 'loop' ? coerceLoop(v) : v;
            }
        }

        // Submit generation via Luma API
        const createRes = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filteredParams)
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            throw new Error(`Luma generation submit failed (${createRes.status}): ${errBody}`);
        }

        const generation = await createRes.json() as { id: string; state?: string };
        const generationId = generation.id;

        // Poll for completion
        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await new Promise(r => setTimeout(r, this.pollIntervalMs));

            const pollRes = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            if (!pollRes.ok) {
                throw new Error(`Luma poll failed (${pollRes.status})`);
            }

            const status = await pollRes.json() as { state: string; assets?: { video?: string }; failure_reason?: string };

            if (status.state === 'completed' && status.assets?.video) {
                return { url: status.assets.video, mediaType: 'video/mp4' };
            }
            if (status.state === 'failed') {
                throw new Error(`Luma generation failed: ${status.failure_reason ?? 'unknown error'}`);
            }
        }

        throw new Error(`Luma generation timed out after ${this.maxPollAttempts} poll attempts`);
    }
}
