/**
 * Ingest UGC upload example.
 * 1:1 port of examples/ingest_ugc_upload.py
 */

import { Pipeline, Modality, BaseTestProviderAdapter } from '../libs/core/genblaze_core/index.js';

async function main() {
    console.log('📹 Running Ingest UGC Upload Example...');
    const pipe = new Pipeline('ugc-upload-ingest');
    pipe.step(new BaseTestProviderAdapter(), { model: 'ingest-v1', prompt: 'user upload processing', modality: Modality.VIDEO });

    const result = await pipe.run();
    console.log('Ingest run status:', result.run.status);
}

main().catch(console.error);
