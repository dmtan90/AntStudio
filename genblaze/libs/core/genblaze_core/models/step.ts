/** Step model — a single generation step within a run. 1:1 port of models/step.py */

import crypto from 'crypto';
import { Asset } from './asset.js';
import {
    Modality,
    PromptVisibility,
    ProviderErrorCode,
    StepStatus,
    StepType,
    RETRYABLE_ERROR_CODES
} from './enums.js';

/** Step types that are allowed to have provider=null — non-generative operations. */
const PROVIDERLESS_STEP_TYPES = new Set<StepType>([StepType.INGEST, StepType.IMPORT]);

/** Metadata key used to surface provider prediction/job ids to progress/streaming consumers. */
export const UPSTREAM_ID_KEY = 'upstream_id';

export interface Step {
    stepId: string;
    runId: string | null;
    provider: string | null;
    model: string;
    stepType: StepType;
    modelVersion: string | null;
    modelHash: string | null;
    modality: Modality;
    prompt: string | null;
    negativePrompt: string | null;
    promptVisibility: PromptVisibility;
    seed: number | null;
    params: Record<string, any>;
    status: StepStatus;
    inputs: Asset[];
    assets: Asset[];
    providerPayload: Record<string, any>;
    retries: number;
    costUsd: number | null;
    error: string | null;
    errorCode: ProviderErrorCode | null;
    startedAt: string | null;
    completedAt: string | null;
    stepIndex: number | null;
    metadata: Record<string, any>;
}

export function createStep(data: Partial<Step> & { model: string }): Step {
    const step: Step = {
        stepId: data.stepId ?? crypto.randomUUID(),
        runId: data.runId ?? null,
        provider: data.provider ?? null,
        model: data.model,
        stepType: data.stepType ?? StepType.GENERATE,
        modelVersion: data.modelVersion ?? null,
        modelHash: data.modelHash ?? null,
        modality: data.modality ?? Modality.IMAGE,
        prompt: data.prompt ?? null,
        negativePrompt: data.negativePrompt ?? null,
        promptVisibility: data.promptVisibility ?? PromptVisibility.PUBLIC,
        seed: data.seed ?? null,
        params: data.params ?? {},
        status: data.status ?? StepStatus.PENDING,
        inputs: data.inputs ?? [],
        assets: data.assets ?? [],
        providerPayload: data.providerPayload ?? {},
        retries: data.retries ?? 0,
        costUsd: data.costUsd ?? null,
        error: data.error ?? null,
        errorCode: data.errorCode ?? null,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        stepIndex: data.stepIndex ?? null,
        metadata: data.metadata ?? {}
    };

    // Validate: provider is required for generative step types
    if (step.provider == null && !PROVIDERLESS_STEP_TYPES.has(step.stepType)) {
        throw new Error(
            `Step.provider is required when stepType=${step.stepType}; ` +
            `only [${[...PROVIDERLESS_STEP_TYPES].join(', ')}] step types may have provider=null.`
        );
    }

    return step;
}

export function isStepRetryable(step: Step): boolean {
    return step.errorCode != null && RETRYABLE_ERROR_CODES.has(step.errorCode);
}
