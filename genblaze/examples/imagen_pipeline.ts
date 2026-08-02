/**
 * Example: Google Imagen image generation pipeline.
 * 1:1 port of examples/imagen_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { ImagenProvider } from '../libs/connectors/google/genblaze_google/index.js';

async function main() {
    const provider = new ImagenProvider();

    const pipe = new Pipeline('imagen-demo');
    pipe.step(provider as any, {
        model: 'imagen-3.0-generate-002',
        prompt: 'A photorealistic aerial view of a coral reef teeming with tropical fish',
        modality: Modality.IMAGE,
        params: { aspect_ratio: '16:9' }
    });

    const { run, manifest } = await pipe.run();

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Status:    ${run.steps[0]?.status}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (run.steps[0]?.assets?.length) {
        console.log(`Image:     ${run.steps[0].assets[0].url}`);
    }
}

main().catch(console.error);
