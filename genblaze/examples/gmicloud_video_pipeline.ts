/**
 * Example: GMICloud video generation pipeline.
 * 1:1 port of examples/gmicloud_video_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { GMICloudVideoProvider } from '../libs/connectors/gmicloud/genblaze_gmicloud/index.js';

async function main() {
    const provider = new GMICloudVideoProvider();

    const pipe = new Pipeline('gmicloud-video-demo');
    pipe.step(provider, {
        model: 'Kling-Text2Video-V2.1-Master',
        prompt: (
            'A drone shot flying over a misty mountain valley at sunrise, ' +
            'golden light filtering through clouds, cinematic'
        ),
        modality: Modality.VIDEO,
        params: { duration: 10, aspect_ratio: '16:9' }
    });

    const { run, manifest } = await pipe.run();

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Status:    ${run.steps[0]?.status}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (run.steps[0]?.assets?.length) {
        console.log(`Video:     ${run.steps[0].assets[0].url}`);
    }
    if (run.steps[0]?.costUsd != null) {
        console.log(`Cost:      $${run.steps[0].costUsd.toFixed(3)}`);
    }
}

main().catch(console.error);
