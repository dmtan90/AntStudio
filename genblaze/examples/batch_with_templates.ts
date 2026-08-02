/**
 * Batch processing with pipeline templates example.
 * 1:1 port of examples/batch_with_templates.py
 */

import { PipelineTemplate, Modality, StepType } from '../libs/core/genblaze_core/index.js';

async function main() {
    console.log('📑 Running Batch With Templates Example...');

    const template = new PipelineTemplate({
        name: 'image-to-video-template',
        chain: true,
        steps: [
            {
                providerName: 'openai',
                model: 'dall-e-3',
                prompt: '{scene_description}',
                params: {},
                modality: Modality.IMAGE,
                stepType: StepType.GENERATE,
                fallbackModels: []
            }
        ]
    });

    console.log('Template created:', template.name);
    console.log('JSON spec:', template.toJson());
}

main().catch(console.error);
