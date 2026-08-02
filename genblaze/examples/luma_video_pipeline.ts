/**
 * Example: Luma Dream Machine video generation pipeline.
 * 1:1 port of examples/luma_video_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { LumaProvider } from '../libs/connectors/luma/genblaze_luma/index.js';

async function main() {
    const provider = new LumaProvider();

    const pipe = new Pipeline('luma-demo');
    pipe.step(provider as any, {
        model: 'ray-2',
        prompt: (
            'A slow-motion shot of ocean waves crashing against ' +
            'volcanic rocks at golden hour, cinematic'
        ),
        modality: Modality.VIDEO,
        params: { aspect_ratio: '16:9' }
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
