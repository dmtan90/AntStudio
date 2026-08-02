import { GenblazeAsset } from './types.js';
import { Modality, StepStatus } from './models/enums.js';
import { Step as IStep, createStep } from './models/step.js';

export interface GenblazeStepResult {
    stepId: string;
    provider: string;
    model: string;
    prompt: string;
    modality: Modality;
    params: Record<string, any>;
    assets: GenblazeAsset[];
    startedAt: string;
    completedAt: string;
    status: 'COMPLETED' | 'FAILED';
    error?: string;
}

export function createStepHelper(stepId: string, provider: string, model: string, prompt: string, modality: Modality, params: Record<string, any> = {}): IStep {
    return createStep({
        stepId,
        provider,
        model,
        prompt,
        modality,
        params,
        status: StepStatus.SUCCEEDED
    });
}
