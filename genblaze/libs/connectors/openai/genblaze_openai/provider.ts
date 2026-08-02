import process from 'process';
import { Buffer } from 'buffer';
import { BaseProviderAdapter, Modality, ProviderOutput, StepParams } from '../../../core/genblaze_core/index.js';

export class OpenAIProvider extends BaseProviderAdapter {
    readonly name = 'openai';
    private apiKey: string;

    constructor(apiKey?: string) {
        super();
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const model = params.model || 'gpt-4o';
        return {
            buffer: Buffer.from(`[OpenAI (${model})] Generated output for: "${params.prompt}"`),
            mimeType: 'text/plain',
            metadata: { provider: this.name, model }
        };
    }
}
