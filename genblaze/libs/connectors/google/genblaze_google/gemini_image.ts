/**
 * Google Gemini image generation provider (Gemini 2.0 Flash experimental).
 * 1:1 port of connectors/google/genblaze_google/gemini_image.py
 */

export interface GeminiImageOptions {
    apiKey?: string;
    defaultModel?: string;
}

export interface GeminiImageResult {
    b64Data: string;
    mimeType: string;
}

export class GeminiImageProvider {
    readonly name = 'google-gemini-image';
    private apiKey: string;
    private defaultModel: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(options: GeminiImageOptions = {}) {
        this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
        this.defaultModel = options.defaultModel || 'gemini-2.0-flash-preview-image-generation';
    }

    async generate(params: {
        prompt: string;
        model?: string;
        width?: number;
        height?: number;
        numberOfImages?: number;
    }): Promise<GeminiImageResult[]> {
        if (!this.apiKey) throw new Error('GEMINI_API_KEY is required for GeminiImageProvider');

        const model = params.model ?? this.defaultModel;

        const body: Record<string, any> = {
            contents: [{ parts: [{ text: params.prompt }] }],
            generationConfig: {
                responseModalities: ['image', 'text'],
                numberOfImages: params.numberOfImages ?? 1
            }
        };

        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini image generation failed (${res.status}): ${errText}`);
        }

        const data = await res.json() as {
            candidates?: Array<{
                content?: {
                    parts?: Array<{
                        text?: string;
                        inlineData?: { data: string; mimeType: string };
                    }>;
                };
            }>;
        };

        const results: GeminiImageResult[] = [];
        for (const candidate of data.candidates ?? []) {
            for (const part of candidate.content?.parts ?? []) {
                if (part.inlineData) {
                    results.push({
                        b64Data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType
                    });
                }
            }
        }

        return results;
    }
}
