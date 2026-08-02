/**
 * ReplicateProvider — adapter for the Replicate API.
 * 1:1 port of connectors/replicate/genblaze_replicate/provider.py
 *
 * Replicate hosts thousands of models. Slugs are free-form `owner/name` strings.
 * Features: DiscoverySupport.NATIVE — GET /v1/models/{owner}/{name} is authoritative.
 */

const DISCOVERY_PAGE_LIMIT = 25;

export interface ReplicateProviderOptions {
    apiKey?: string;
    maxPollAttempts?: number;
    pollIntervalMs?: number;
}

interface ModelVersionCache {
    version: string | null;
    resolvedAt: number;
    ttlMs: number;
}

export class ReplicateProvider {
    readonly name = 'replicate';
    private apiKey: string;
    private maxPollAttempts: number;
    private pollIntervalMs: number;
    private versionCache = new Map<string, ModelVersionCache>();
    private readonly versionCacheTtlMs = 300_000; // 5 minutes

    constructor(options: ReplicateProviderOptions = {}) {
        this.apiKey = options.apiKey || process.env.REPLICATE_API_TOKEN || '';
        this.maxPollAttempts = options.maxPollAttempts ?? 240;
        this.pollIntervalMs = options.pollIntervalMs ?? 3000;
    }

    private get headers(): Record<string, string> {
        return {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async resolveVersion(modelId: string): Promise<string | null> {
        const cached = this.versionCache.get(modelId);
        if (cached && (Date.now() - cached.resolvedAt) < cached.ttlMs) {
            return cached.version;
        }

        const [owner, name, version] = modelId.split('/');
        if (version) {
            // Versioned slug like "owner/name:version"
            const actualVersion = version.includes(':') ? version.split(':')[1] : version;
            this.versionCache.set(modelId, { version: actualVersion, resolvedAt: Date.now(), ttlMs: this.versionCacheTtlMs });
            return actualVersion;
        }

        // Resolve to latest version
        try {
            const res = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/versions?limit=1`, {
                headers: this.headers
            });
            if (res.ok) {
                const data = await res.json() as { results?: Array<{ id: string }> };
                const latestVersion = data.results?.[0]?.id ?? null;
                this.versionCache.set(modelId, { version: latestVersion, resolvedAt: Date.now(), ttlMs: this.versionCacheTtlMs });
                return latestVersion;
            }
        } catch {
            // Fall through
        }

        this.versionCache.set(modelId, { version: null, resolvedAt: Date.now(), ttlMs: this.versionCacheTtlMs });
        return null;
    }

    async generate(params: Record<string, any>): Promise<{ url: string; mediaType: string }> {
        if (!this.apiKey) {
            throw new Error('REPLICATE_API_TOKEN is required for ReplicateProvider');
        }

        const modelId = params.model;
        if (!modelId) throw new Error('params.model is required for ReplicateProvider');

        const input = { ...params };
        delete input.model;

        let body: Record<string, any>;
        const [owner, name, versionTag] = modelId.includes('/') ? modelId.split('/') : ['', modelId, ''];

        // Build prediction request
        if (versionTag) {
            const version = versionTag.includes(':') ? versionTag.split(':')[1] : versionTag;
            body = { version, input };
        } else {
            // Try to resolve version
            const version = await this.resolveVersion(modelId);
            if (version) {
                body = { version, input };
            } else {
                // Use model path directly for official models
                body = { input };
                const url = `https://api.replicate.com/v1/models/${modelId}/predictions`;
                return this._submitAndPoll(url, body);
            }
        }

        return this._submitAndPoll('https://api.replicate.com/v1/predictions', body);
    }

    private async _submitAndPoll(url: string, body: Record<string, any>): Promise<{ url: string; mediaType: string }> {
        const createRes = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            throw new Error(`Replicate prediction submit failed (${createRes.status}): ${errBody}`);
        }

        const prediction = await createRes.json() as { id: string; status?: string; urls?: { get?: string } };
        const pollUrl = prediction.urls?.get ?? `https://api.replicate.com/v1/predictions/${prediction.id}`;

        // Poll for completion
        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await new Promise(r => setTimeout(r, this.pollIntervalMs));

            const pollRes = await fetch(pollUrl, { headers: this.headers });
            if (!pollRes.ok) throw new Error(`Replicate poll failed (${pollRes.status})`);

            const status = await pollRes.json() as {
                status: string;
                output?: string | string[];
                error?: string;
            };

            if (status.status === 'succeeded') {
                const output = Array.isArray(status.output) ? status.output[0] : status.output;
                if (!output) throw new Error('Replicate returned succeeded but no output URL');
                const mediaType = output.includes('.mp4') ? 'video/mp4'
                    : output.includes('.mp3') ? 'audio/mpeg'
                    : output.includes('.wav') ? 'audio/wav'
                    : 'image/png';
                return { url: output, mediaType };
            }
            if (status.status === 'failed') {
                throw new Error(`Replicate prediction failed: ${status.error ?? 'unknown error'}`);
            }
            if (status.status === 'canceled') {
                throw new Error('Replicate prediction was canceled');
            }
        }

        throw new Error(`Replicate prediction timed out after ${this.maxPollAttempts} poll attempts`);
    }

    async discoverModels(): Promise<Array<{ modelId: string }>> {
        try {
            const res = await fetch(`https://api.replicate.com/v1/models?limit=${DISCOVERY_PAGE_LIMIT}`, {
                headers: this.headers
            });
            if (!res.ok) return [];
            const data = await res.json() as { results?: Array<{ owner: string; name: string }> };
            return (data.results ?? []).map(m => ({ modelId: `${m.owner}/${m.name}` }));
        } catch {
            return [];
        }
    }
}
