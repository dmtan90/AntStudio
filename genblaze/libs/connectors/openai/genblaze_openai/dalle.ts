/**
 * OpenAI DALL-E image generation provider.
 * 1:1 port of connectors/openai/genblaze_openai/dalle.py
 */

export interface DALLEOptions {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
}

export interface DALLEResult {
    url: string;
    revisedPrompt?: string;
    b64Json?: string;
}

export class DALLEProvider {
    readonly name = 'openai-dalle';
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;

    constructor(options: DALLEOptions = {}) {
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
        this.defaultModel = options.defaultModel || 'dall-e-3';
    }

    async generate(params: {
        prompt: string;
        model?: string;
        n?: number;
        size?: '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512';
        quality?: 'standard' | 'hd';
        style?: 'vivid' | 'natural';
        responseFormat?: 'url' | 'b64_json';
    }): Promise<DALLEResult[]> {
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is required for DALLEProvider');
        }

        const model = params.model ?? this.defaultModel;
        const body: Record<string, any> = {
            model,
            prompt: params.prompt,
            n: params.n ?? 1,
            size: params.size ?? '1024x1024',
            response_format: params.responseFormat ?? 'url'
        };

        // DALL-E 3 supports quality and style; DALL-E 2 does not
        if (model === 'dall-e-3') {
            if (params.quality) body.quality = params.quality;
            if (params.style) body.style = params.style;
        }

        const res = await fetch(`${this.baseUrl}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`DALL-E generation failed (${res.status}): ${errText}`);
        }

        const data = await res.json() as { data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> };
        return (data.data ?? []).map(item => ({
            url: item.url ?? '',
            revisedPrompt: item.revised_prompt,
            b64Json: item.b64_json
        }));
    }

    async edit(params: {
        image: Buffer;
        mask?: Buffer;
        prompt: string;
        n?: number;
        size?: '1024x1024' | '512x512' | '256x256';
        responseFormat?: 'url' | 'b64_json';
    }): Promise<DALLEResult[]> {
        if (!this.apiKey) throw new Error('OPENAI_API_KEY is required');

        const formData = new FormData();
        formData.append('image', new Blob([new Uint8Array(params.image)], { type: 'image/png' }), 'image.png');
        if (params.mask) {
            formData.append('mask', new Blob([new Uint8Array(params.mask)], { type: 'image/png' }), 'mask.png');
        }
        formData.append('prompt', params.prompt);
        formData.append('n', String(params.n ?? 1));
        formData.append('size', params.size ?? '1024x1024');
        formData.append('response_format', params.responseFormat ?? 'url');

        const res = await fetch(`${this.baseUrl}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
            body: formData
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`DALL-E edit failed (${res.status}): ${errText}`);
        }

        const data = await res.json() as { data: Array<{ url?: string; b64_json?: string }> };
        return (data.data ?? []).map(item => ({ url: item.url ?? '', b64Json: item.b64_json }));
    }
}
