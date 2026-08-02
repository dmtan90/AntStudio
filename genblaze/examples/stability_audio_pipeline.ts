/**
 * Example: Stability AI Stable Audio music generation pipeline.
 * 1:1 port of examples/stability_audio_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { StabilityAudioProvider } from '../libs/connectors/stability-audio/genblaze_stability_audio/index.js';

async function main() {
    const provider = new StabilityAudioProvider();

    const pipe = new Pipeline('stability-audio-demo');
    pipe.step(provider as any, {
        model: 'stable-audio-2.5',
        prompt: 'Upbeat lo-fi hip hop beat with warm piano chords and vinyl crackle',
        modality: Modality.AUDIO,
        params: { duration: 30, output_format: 'mp3' }
    });

    const { run, manifest } = await pipe.run();

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Status:    ${run.steps[0]?.status}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (run.steps[0]?.assets?.length) {
        console.log(`Audio:     ${run.steps[0].assets[0].url}`);
    }
}

main().catch(console.error);
