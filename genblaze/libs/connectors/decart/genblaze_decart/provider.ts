/**
 * DecartVideoProvider — adapter for the Decart Lucy video API.
 * 1:1 port of connectors/decart/genblaze_decart/provider.py
 *
 * Uses async queue-based workflow: submit() → poll status → download result.
 * DiscoverySupport.NONE: no GET /v1/models endpoint.
 */

const VALID_RESOLUTIONS = new Set(['480p', '720p']);
const LUCY_VIDEO_PATTERN = /^lucy-.*(?:2v|motion|restyle)/;

export interface DecartOptions {
    apiKey?: string;
    maxPollAttempts?: number;
    pollIntervalMs?: number;
}

export class DecartProvider {
    readonly name = 'decart';
    private apiKey: string;
    private maxPollAttempts: number;
    private pollIntervalMs: number;
    private baseUrl = 'https://api.platform.decart.ai/v1';

    constructor(options: DecartOptions = {}) {
        this.apiKey = options.apiKey || process.env.DECART_API_KEY || '';
        this.maxPollAttempts = options.maxPollAttempts ?? 180;
        this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    }

    private get headers(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async generate(params: Record<string, any>): Promise<{ url: string; mediaType: string }> {
        if (!this.apiKey) {
            throw new Error('DECART_API_KEY is required for DecartProvider');
        }

        const model = params.model ?? 'lucy-pro-t2v';
        const resolution = params.resolution ?? '720p';

        if (!VALID_RESOLUTIONS.has(resolution)) {
            throw new Error(`Invalid resolution=${JSON.stringify(resolution)}. Must be one of: ${[...VALID_RESOLUTIONS].join(', ')}`);
        }

        const body: Record<string, any> = {
            model,
            prompt: params.prompt ?? '',
            resolution,
            enhance_prompt: Boolean(params.enhance_prompt ?? true)
        };

        if (params.image_url || params.input_image) {
            body.input_image = params.image_url ?? params.input_image;
        }

        // Submit generation
        const submitRes = await fetch(`${this.baseUrl}/queue/submit`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!submitRes.ok) {
            const err = await submitRes.text();
            throw new Error(`Decart generation submit failed (${submitRes.status}): ${err}`);
        }

        const submitted = await submitRes.json() as { request_id: string; status?: string };
        const requestId = submitted.request_id;

        // Poll for completion
        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await new Promise(r => setTimeout(r, this.pollIntervalMs));

            const pollRes = await fetch(`${this.baseUrl}/queue/status/${requestId}`, {
                headers: this.headers
            });

            if (!pollRes.ok) throw new Error(`Decart poll failed (${pollRes.status})`);

            const status = await pollRes.json() as {
                status: string;
                output_url?: string;
                error?: string;
            };

            if (status.status === 'completed' && status.output_url) {
                return { url: status.output_url, mediaType: 'video/mp4' };
            }
            if (status.status === 'failed') {
                throw new Error(`Decart generation failed: ${status.error ?? 'unknown error'}`);
            }
        }

        throw new Error(`Decart generation timed out after ${this.maxPollAttempts} poll attempts`);
    }
}
