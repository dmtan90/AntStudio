/**
 * Example: GMICloud audio/TTS generation pipeline.
 * 1:1 port of examples/gmicloud_audio_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { GMICloudAudioProvider } from '../libs/connectors/gmicloud/genblaze_gmicloud/index.js';

async function main() {
    const provider = new GMICloudAudioProvider();

    const pipe = new Pipeline('gmicloud-audio-demo');
    pipe.step(provider, {
        model: 'elevenlabs-tts-v3',
        prompt: 'Welcome to Genblaze, the fastest way to build generative AI pipelines.',
        modality: Modality.AUDIO
    });

    const { run, manifest } = await pipe.run();

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Status:    ${run.steps[0]?.status}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (run.steps[0]?.assets?.length) {
        console.log(`Audio:     ${run.steps[0].assets[0].url}`);
    }
    if (run.steps[0]?.costUsd != null) {
        console.log(`Cost:      $${run.steps[0].costUsd.toFixed(3)}`);
    }
}

main().catch(console.error);
