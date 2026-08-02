/**
 * Streaming local pipeline example.
 * 1:1 port of examples/streaming_local.py
 */

import { Pipeline, Modality, BaseTestProviderAdapter } from '../libs/core/genblaze_core/index.js';

async function main() {
    console.log('⚡ Running Streaming Local Example...');
    const pipe = new Pipeline('streaming-pipeline');
    pipe.step(new BaseTestProviderAdapter(), { model: 'stream-v1', prompt: 'a quick stream test', modality: Modality.TEXT });

    const result = await pipe.run();
    console.log('Stream pipeline completed:', result.run.status);
}

main().catch(console.error);
