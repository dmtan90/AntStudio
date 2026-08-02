/**
 * Example: AssemblyAI speech-to-text transcription pipeline.
 * 1:1 port of examples/transcribe.py
 */

import { Modality, Pipeline, ManifestBuilder } from '../libs/core/genblaze_core/index.js';
import { AssemblyAIProvider } from '../libs/connectors/assemblyai/genblaze_assemblyai/index.js';

const AUDIO_URL = 'https://assembly.ai/wildfires.mp3';

async function main() {
    const provider = new AssemblyAIProvider();

    const pipe = new Pipeline('assemblyai-transcribe-demo');
    pipe.step(provider as any, {
        model: 'universal-3-pro',
        prompt: AUDIO_URL,
        modality: Modality.TEXT
    });

    const { run, manifest } = await pipe.run();
    const step = run.steps[0];

    console.log(`Run ID:    ${run.runId}`);
    console.log(`Status:    ${step?.status}`);
    console.log(`Hash:      ${manifest.canonicalHash}`);
    console.log(`Verified:  ${ManifestBuilder.verify(manifest, run)}`);

    if (step?.assets?.length) {
        const asset = step.assets[0];
        console.log(`Asset:     ${asset.url}`);
    }

    console.log('✅ Transcribe script execution finished.');
}

main().catch(console.error);
