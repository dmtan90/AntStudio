/** Manifest model — hash-verified generation manifest. 1:1 port of models/manifest.py */

import crypto from 'crypto';
import { Asset } from './asset.js';
import { Run } from './run.js';
import { Step } from './step.js';
import { canonicalHash, canonicalJson } from '../canonical/json.js';
import { stripAssetUrlCredentials } from '../_asset_url.js';

export const SCHEMA_VERSION = '1.5';
export const SUPPORTED_SCHEMA_VERSIONS = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6'];

/** Operational fields excluded from canonical hash — non-deterministic or sensitive. */
const STEP_HASH_EXCLUDE = new Set([
    'stepId', 'runId', 'status', 'error', 'errorCode',
    'retries', 'costUsd', 'startedAt', 'completedAt', 'providerPayload', 'stepIndex'
]);

const RUN_HASH_EXCLUDE = new Set([
    'runId', 'status', 'createdAt', 'startedAt', 'completedAt',
    'idempotencyKey', 'parentRunId'
]);

const ASSET_HASH_EXCLUDE = new Set(['assetId', 'url']);

export interface ManifestPromptSpec {
    text: string | null;
    visibility: string;
    redacted: boolean;
}

export interface ManifestStep {
    provider: string | null;
    model: string;
    stepType: string;
    modelVersion: string | null;
    modelHash: string | null;
    modality: string;
    prompt: ManifestPromptSpec | null;
    negativePrompt: ManifestPromptSpec | null;
    seed: number | null;
    params: Record<string, any>;
    inputs: Asset[];
    outputs: Asset[];
    metadata: Record<string, any>;
}

export interface Manifest {
    schemaVersion: string;
    runId: string;
    tenantId: string | null;
    projectId: string | null;
    name: string | null;
    canonicalHash: string;
    manifestUri: string | null;
    steps: ManifestStep[];
    transferFailures: string[];
    metadata: Record<string, any>;
}

/** Build a ManifestStep from a Step model. */
function stepToManifestStep(step: Step): ManifestStep {
    return {
        provider: step.provider,
        model: step.model,
        stepType: step.stepType,
        modelVersion: step.modelVersion,
        modelHash: step.modelHash,
        modality: step.modality,
        prompt: step.prompt != null ? { text: step.prompt, visibility: step.promptVisibility, redacted: false } : null,
        negativePrompt: step.negativePrompt != null ? { text: step.negativePrompt, visibility: step.promptVisibility, redacted: false } : null,
        seed: step.seed,
        params: step.params,
        inputs: step.inputs,
        outputs: step.assets,
        metadata: step.metadata
    };
}

/** Compute canonical hash for a step (for provenance, excluding runtime fields). */
function stepHashPayload(step: Step): Record<string, any> {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(step)) {
        if (!STEP_HASH_EXCLUDE.has(k)) {
            payload[k] = v;
        }
    }
    return payload;
}

/** Compute canonical hash for a run (excluding operational fields). */
function runHashPayload(run: Run): Record<string, any> {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(run)) {
        if (!RUN_HASH_EXCLUDE.has(k)) {
            if (k === 'steps') {
                payload[k] = (v as Step[]).map(stepHashPayload);
            } else {
                payload[k] = v;
            }
        }
    }
    return payload;
}

/** Compute the canonical hash for a run. */
export function computeCanonicalHash(run: Run): string {
    return canonicalHash(runHashPayload(run));
}

/** Build a Manifest from a Run and Steps. */
export function buildManifest(run: Run, options?: { manifestUri?: string }): Manifest {
    return {
        schemaVersion: SCHEMA_VERSION,
        runId: run.runId,
        tenantId: run.tenantId,
        projectId: run.projectId,
        name: run.name,
        canonicalHash: computeCanonicalHash(run),
        manifestUri: options?.manifestUri ?? null,
        steps: run.steps.map(stepToManifestStep),
        transferFailures: [],
        metadata: run.metadata
    };
}

/** Verify a manifest's canonical hash against a run. */
export function verifyManifest(manifest: Manifest, run: Run): boolean {
    const expected = computeCanonicalHash(run);
    return manifest.canonicalHash === expected;
}

export class ManifestBuilder {
    static build(run: Run, options?: { manifestUri?: string }): Manifest {
        return buildManifest(run, options);
    }
    static verify(manifest: Manifest, run: Run): boolean {
        return verifyManifest(manifest, run);
    }
}

export function parseManifest(data: any): Manifest {
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }
    return {
        schemaVersion: data.schemaVersion ?? data.schema_version ?? SCHEMA_VERSION,
        runId: data.runId ?? data.run_id ?? '',
        tenantId: data.tenantId ?? data.tenant_id ?? null,
        projectId: data.projectId ?? data.project_id ?? null,
        name: data.name ?? null,
        canonicalHash: data.canonicalHash ?? data.canonical_hash ?? '',
        manifestUri: data.manifestUri ?? data.manifest_uri ?? null,
        steps: data.steps ?? [],
        transferFailures: data.transferFailures ?? data.transfer_failures ?? [],
        metadata: data.metadata ?? {}
    };
}


