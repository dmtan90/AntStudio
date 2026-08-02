/**
 * Fan-in A/V composite pipeline example.
 * 1:1 port of examples/fan_in_av_composite.py
 */

import { Pipeline, Modality, BaseTestProviderAdapter } from '../libs/core/genblaze_core/index.js';

async function main() {
    console.log('🎞️ Running Fan-In A/V Composite Example...');
    const videoProv = new BaseTestProviderAdapter();
    const audioProv = new BaseTestProviderAdapter();

    const pipe = new Pipeline('av-composite');
    pipe.step(videoProv, { model: 'video-v1', prompt: 'city sunset', modality: Modality.VIDEO });
    pipe.step(audioProv, { model: 'audio-v1', prompt: 'lofi synth beats', modality: Modality.AUDIO });

    const result = await pipe.run();
    console.log('Composite run status:', result.run.status);
}

main().catch(console.error);
