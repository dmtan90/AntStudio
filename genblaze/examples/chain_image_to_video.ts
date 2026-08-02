/**
 * Chained image-to-video pipeline example.
 * 1:1 port of examples/chain_image_to_video.py
 */

import { Pipeline, Modality, BaseTestProviderAdapter } from '../libs/core/genblaze_core/index.js';

async function main() {
    console.log('🔗 Running Chained Image-to-Video Example...');

    const imageProvider = new BaseTestProviderAdapter();
    const videoProvider = new BaseTestProviderAdapter();

    const pipe = new Pipeline('image-to-video-chain');
    pipe.step(imageProvider, {
        model: 'dall-e-3',
        prompt: 'a tranquil forest in morning mist',
        modality: Modality.IMAGE
    });
    pipe.step(videoProvider, {
        model: 'gen3a_turbo',
        prompt: 'camera slowly moves forward through trees',
        modality: Modality.VIDEO
    });

    const result = await pipe.run();
    console.log('Pipeline run status:', result.run.status);
}

main().catch(console.error);
