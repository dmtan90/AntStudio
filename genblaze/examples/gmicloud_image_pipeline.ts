/**
 * Example: GMICloud image generation pipeline.
 * 1:1 port of examples/gmicloud_image_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { GMICloudImageProvider } from '../libs/connectors/gmicloud/genblaze_gmicloud/index.js';

async function main() {
    const provider = new GMICloudImageProvider();

    const pipe = new Pipeline('gmicloud-image-demo');
    pipe.step(provider, {
        model: 'seedream-5.0-lite',
        prompt: (
            'A photorealistic macro shot of morning dew on a spider web, ' +
            'soft bokeh background, warm golden hour lighting'
        ),
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
    if (run.steps[0]?.costUsd != null) {
        console.log(`Cost:      $${run.steps[0].costUsd.toFixed(3)}`);
    }
}

main().catch(console.error);
