/**
 * Example: ElevenLabs Text-to-Speech pipeline.
 * 1:1 port of examples/elevenlabs_tts_pipeline.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { ElevenLabsProvider } from '../libs/connectors/elevenlabs/genblaze_elevenlabs/index.js';

async function main() {
    const provider = new ElevenLabsProvider();

    const pipe = new Pipeline('elevenlabs-tts-demo');
    pipe.step(provider as any, {
        model: 'eleven_v3',
        prompt: (
            'Welcome to Genblaze. This audio was generated with ' +
            'ElevenLabs and tracked with full provenance.'
        ),
        modality: Modality.AUDIO,
        params: {
            voice_id: 'JBFqnCBsd6RMkjVDRZzb',
            output_format: 'mp3_44100_128'
        }
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
