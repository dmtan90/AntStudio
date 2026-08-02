/**
 * Example: Google Veo video generation pipeline.
 * 1:1 port of examples/veo_video_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { GoogleVeoProvider } from '../libs/connectors/google/genblaze_google/index.js';

async function main() {
    const provider = new GoogleVeoProvider();

    const pipe = new Pipeline('veo-demo');
    pipe.step(provider as any, {
        model: 'veo-3.0-generate-001',
        prompt: (
            'A time-lapse of a coral reef coming to life, with colorful fish ' +
            'swimming through vibrant coral formations, natural ocean lighting'
        ),
        modality: Modality.VIDEO,
        params: {
            aspect_ratio: '16:9',
            duration_seconds: 8,
            resolution: '720p',
            enhance_prompt: true
        }
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
