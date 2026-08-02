/**
 * Google Imagen image generation provider.
 * 1:1 port of connectors/google/genblaze_google/imagen.py
 */

export interface ImagenOptions {
    apiKey?: string;
    defaultModel?: string;
    projectId?: string;
    location?: string;
}

export interface ImagenResult {
    b64Data: string;
    mimeType: string;
}

export class ImagenProvider {
    readonly name = 'google-imagen';
    private apiKey: string;
    private defaultModel: string;
    private projectId: string;
    private location: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(options: ImagenOptions = {}) {
        this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
        this.defaultModel = options.defaultModel || 'imagen-3.0-generate-001';
        this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT || '';
        this.location = options.location || 'us-central1';
    }

    async generate(params: {
        prompt: string;
        model?: string;
        numberOfImages?: number;
        aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
        negativePrompt?: string;
        personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow';
        safetySetting?: string;
        addWatermark?: boolean;
        seed?: number;
    }): Promise<ImagenResult[]> {
        if (!this.apiKey) throw new Error('GEMINI_API_KEY is required for ImagenProvider');

        const model = params.model ?? this.defaultModel;

        const body: Record<string, any> = {
            instances: [{ prompt: params.prompt }],
            parameters: {
                sampleCount: params.numberOfImages ?? 1,
                aspectRatio: params.aspectRatio ?? '1:1'
            }
        };

        if (params.negativePrompt) body.instances[0].negativePrompt = params.negativePrompt;
        if (params.personGeneration) body.parameters.personGeneration = params.personGeneration;
        if (params.seed != null) body.parameters.seed = params.seed;
        if (params.addWatermark != null) body.parameters.addWatermark = params.addWatermark;

        const url = `${this.baseUrl}/models/${model}:predict?key=${this.apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Imagen generation failed (${res.status}): ${errText}`);
        }

        const data = await res.json() as {
            predictions?: Array<{
                bytesBase64Encoded?: string;
                mimeType?: string;
            }>;
        };

        return (data.predictions ?? []).map(p => ({
            b64Data: p.bytesBase64Encoded ?? '',
            mimeType: p.mimeType ?? 'image/png'
        }));
    }
}
