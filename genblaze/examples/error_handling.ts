/**
 * Error handling example.
 * 1:1 port of examples/error_handling.py
 */

import { Pipeline, Modality, BaseTestProviderAdapter, ProviderError, ProviderErrorCode } from '../libs/core/genblaze_core/index.js';

class FailingProvider extends BaseTestProviderAdapter {
    readonly name = 'test-adapter';
    async execute(): Promise<any> {
        throw new ProviderError('Simulated provider failure', ProviderErrorCode.RATE_LIMIT);
    }
}

async function main() {
    console.log('⚠️ Running Error Handling Example...');
    const pipe = new Pipeline('failing-pipeline');
    pipe.step(new FailingProvider(), { model: 'fail-v1', prompt: 'test', modality: Modality.TEXT });

    const result = await pipe.run();
    console.log('Run status:', result.run.status);
}

main().catch(console.error);
