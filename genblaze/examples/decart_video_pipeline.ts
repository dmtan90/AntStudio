/**
 * Example: Decart Lucy video generation pipeline.
 * 1:1 port of examples/decart_video_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { DecartProvider } from '../libs/connectors/decart/genblaze_decart/index.js';

async function main() {
    const provider = new DecartProvider();

    const pipe = new Pipeline('decart-demo');
    pipe.step(provider as any, {
        model: 'lucy-pro-t2v',
        prompt: 'A serene ocean with dolphins jumping at sunset, cinematic lighting',
        modality: Modality.VIDEO,
        params: { resolution: '720p' }
    });

    const { run, manifest } = await pipe.run();

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Status:    ${run.steps[0]?.status}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (run.steps[0]?.assets?.length) {
        console.log(`Video:     ${run.steps[0].assets[0].url}`);
    }
}

main().catch(console.error);
