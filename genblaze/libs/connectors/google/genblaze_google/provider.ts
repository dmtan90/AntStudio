import process from 'process';
import { Buffer } from 'buffer';
import { BaseProviderAdapter, Modality, ProviderOutput, StepParams } from '../../../core/genblaze_core/index.js';

export class GoogleProvider extends BaseProviderAdapter {
    readonly name = 'google';
    private apiKey: string;

    constructor(apiKey?: string) {
        super();
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const model = params.model || 'gemini-2.0-flash';
        return {
            buffer: Buffer.from(`[Google Gemini (${model})] Generated output for: "${params.prompt}"`),
            mimeType: 'text/plain',
            metadata: { provider: this.name, model }
        };
    }
}
