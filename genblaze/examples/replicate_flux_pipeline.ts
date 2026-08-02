/**
 * Example: Replicate Flux pipeline.
 * 1:1 port of examples/replicate_flux_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { ReplicateProvider } from '../libs/connectors/replicate/genblaze_replicate/index.js';

async function main() {
    const provider = new ReplicateProvider();

    const pipe = new Pipeline('flux-demo');
    pipe.step(provider as any, {
        model: 'black-forest-labs/flux-schnell',
        prompt: (
            'a photorealistic golden retriever puppy sitting in a field of wildflowers, ' +
            'golden hour lighting, shallow depth of field'
        ),
        modality: Modality.IMAGE,
        params: { num_outputs: 1, aspect_ratio: '1:1' }
    });

    const { run, manifest } = await pipe.run();

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Steps:     ${run.steps.length}`);
    console.log(`Status:    ${run.steps[0]?.status}`);
    console.log(`Assets:    ${run.steps[0]?.assets?.length ?? 0}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (run.steps[0]?.assets?.length) {
        console.log(`Output:    ${run.steps[0].assets[0].url}`);
    }
}

main().catch(console.error);
