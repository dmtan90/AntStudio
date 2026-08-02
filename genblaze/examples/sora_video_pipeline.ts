/**
 * Example: OpenAI Sora video generation pipeline.
 * 1:1 port of examples/sora_video_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { OpenAISoraProvider } from '../libs/connectors/openai/genblaze_openai/index.js';

async function main() {
    const provider = new OpenAISoraProvider();

    const pipe = new Pipeline('sora-demo');
    pipe.step(provider as any, {
        model: 'sora-2',
        prompt: (
            'A cinematic drone shot gliding over a misty mountain valley ' +
            'at sunrise, golden light breaking through clouds'
        ),
        modality: Modality.VIDEO,
        params: { seconds: 4, size: '1280x720' }
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
