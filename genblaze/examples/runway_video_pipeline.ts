/**
 * Example: Runway Gen video generation pipeline.
 * 1:1 port of examples/runway_video_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { RunwayProvider } from '../libs/connectors/runway/genblaze_runway/index.js';

async function main() {
    const provider = new RunwayProvider();

    const pipe = new Pipeline('runway-demo');
    pipe.step(provider as any, {
        model: 'gen4_turbo',
        prompt: 'A timelapse of wildflowers blooming in a meadow, soft morning light, macro detail',
        modality: Modality.VIDEO,
        params: { duration: 10 }
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
