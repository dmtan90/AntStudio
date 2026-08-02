/**
 * Example: ElevenLabs Sound Effects pipeline.
 * 1:1 port of examples/elevenlabs_sfx_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { ElevenLabsSFXProvider } from '../libs/connectors/elevenlabs/genblaze_elevenlabs/index.js';

async function main() {
    const provider = new ElevenLabsSFXProvider();

    const pipe = new Pipeline('elevenlabs-sfx-demo');
    pipe.step(provider as any, {
        model: 'eleven_text_to_sound_v2',
        prompt: 'Thunder crashing during a heavy rainstorm with distant rumbling',
        modality: Modality.AUDIO,
        params: { duration_seconds: 10 }
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
