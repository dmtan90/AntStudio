/**
 * Example: OpenAI DALL-E image generation pipeline.
 * 1:1 port of examples/dalle_image_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { DALLEProvider } from '../libs/connectors/openai/genblaze_openai/index.js';

async function main() {
    const provider = new DALLEProvider();

    const pipe = new Pipeline('dalle-demo');
    pipe.step(provider as any, {
        model: 'dall-e-3',
        prompt: 'A watercolor painting of a cozy bookshop on a rainy evening',
        modality: Modality.IMAGE,
        params: { size: '1024x1024', quality: 'hd' }
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
