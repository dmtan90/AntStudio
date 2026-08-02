/** Run model — a collection of generation steps. 1:1 port of models/run.py */

import crypto from 'crypto';
import { Step } from './step.js';
import { RunStatus } from './enums.js';

export interface Run {
    runId: string;
    tenantId: string | null;
    projectId: string | null;
    name: string | null;
    status: RunStatus;
    steps: Step[];
    parentRunId: string | null;
    idempotencyKey: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    metadata: Record<string, any>;
}

export function createRun(data: Partial<Run> = {}): Run {
    return {
        runId: data.runId ?? crypto.randomUUID(),
        tenantId: data.tenantId ?? null,
        projectId: data.projectId ?? null,
        name: data.name ?? null,
        status: data.status ?? RunStatus.PENDING,
        steps: data.steps ?? [],
        parentRunId: data.parentRunId ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
        createdAt: data.createdAt ?? new Date().toISOString(),
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        metadata: data.metadata ?? {}
    };
}
