import { Buffer } from 'buffer';
import { BaseProviderAdapter, ProviderOutput, StepParams } from './pipeline.js';

export * from './mocks.js';

export class BaseTestProviderAdapter extends BaseProviderAdapter {
    readonly name = 'test-adapter';

    async execute(params: StepParams): Promise<ProviderOutput> {
        return {
            buffer: Buffer.from(`[BaseTestProviderAdapter] Canned result for prompt: "${params.prompt}"`),
            mimeType: 'text/plain',
            metadata: { mock: true, model: params.model }
        };
    }
}
