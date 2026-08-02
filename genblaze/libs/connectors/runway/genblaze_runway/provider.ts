/**
 * RunwayProvider — adapter for the Runway Gen video API.
 * 1:1 port of connectors/runway/genblaze_runway/provider.py
 *
 * Uses the runwayml SDK with async task-based workflow:
 *   image_to_video.create() or text_to_video.create() → poll task → get output URL
 */

const VALID_RATIOS = new Set(['1280:768', '768:1280', '1:1']);
const GEN_PATTERN = /^gen\d+[a-z]?_turbo$/;

export interface RunwayProviderOptions {
    apiKey?: string;
    maxPollAttempts?: number;
    pollIntervalMs?: number;
}

export class RunwayProvider {
    readonly name = 'runway';
    private apiKey: string;
    private maxPollAttempts: number;
    private pollIntervalMs: number;
    private baseUrl = 'https://api.runwayml.com/v1';

    constructor(options: RunwayProviderOptions = {}) {
        this.apiKey = options.apiKey || process.env.RUNWAYML_API_SECRET || '';
        this.maxPollAttempts = options.maxPollAttempts ?? 240;
        this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    }

    async generate(params: Record<string, any>): Promise<{ url: string; mediaType: string }> {
        if (!this.apiKey) {
            throw new Error('RUNWAYML_API_SECRET is required for RunwayProvider');
        }

        const hasImage = Boolean(params.prompt_image ?? params.image_url ?? params.image);
        const model = params.model ?? 'gen3a_turbo';

        let endpoint: string;
        let body: Record<string, any>;

        if (hasImage) {
            endpoint = `${this.baseUrl}/image_to_video`;
            body = {
                model,
                prompt_image: params.prompt_image ?? params.image_url ?? params.image,
                prompt_text: params.prompt ?? '',
                duration: params.duration ?? 5,
                ratio: params.ratio ?? '1280:768'
            };
        } else {
            if (GEN_PATTERN.test(model)) {
                throw new Error(
                    `Model ${model} is image-to-video only and requires a prompt_image input. ` +
                    'Pass an image URL via params.prompt_image or a chained Step input.'
                );
            }
            endpoint = `${this.baseUrl}/text_to_video`;
            body = {
                model,
                prompt_text: params.prompt ?? '',
                duration: params.duration ?? 5,
                ratio: params.ratio ?? '1280:768'
            };
        }

        // Submit task
        const createRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'X-Runway-Version': '2024-11-06'
            },
            body: JSON.stringify(body)
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            throw new Error(`Runway generation submit failed (${createRes.status}): ${errBody}`);
        }

        const task = await createRes.json() as { id: string; status?: string };
        const taskId = task.id;

        // Poll for completion
        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await new Promise(r => setTimeout(r, this.pollIntervalMs));

            const pollRes = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Runway-Version': '2024-11-06'
                }
            });

            if (!pollRes.ok) {
                throw new Error(`Runway poll failed (${pollRes.status})`);
            }

            const status = await pollRes.json() as {
                status: string;
                output?: string[];
                failure?: string;
                failureCode?: string;
            };

            if (status.status === 'SUCCEEDED' && status.output?.[0]) {
                return { url: status.output[0], mediaType: 'video/mp4' };
            }
            if (status.status === 'FAILED') {
                throw new Error(`Runway task failed: ${status.failure ?? 'unknown error'}`);
            }
        }

        throw new Error(`Runway generation timed out after ${this.maxPollAttempts} poll attempts`);
    }
}
