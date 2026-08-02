/**
 * Custom ModelRegistry example.
 * 1:1 port of examples/custom_model_registry.py
 */

import { ModelRegistry, ModelSpec, Modality } from '../libs/core/genblaze_core/index.js';

async function main() {
    console.log('🏛️ Running Custom ModelRegistry Example...');

    const registry = new ModelRegistry();
    const customSpec = new ModelSpec({
        modelId: 'custom-v1',
        modality: Modality.IMAGE,
        description: 'Custom fine-tuned image model'
    });

    registry.register(customSpec);
    console.log('Registered custom spec:', registry.getSpec('custom-v1').modelId);
}

main().catch(console.error);
