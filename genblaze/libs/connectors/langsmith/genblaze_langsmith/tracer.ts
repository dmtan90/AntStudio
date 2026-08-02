/**
 * LangSmithTracer — maps genblaze run/step lifecycle to LangSmith runs.
 * 1:1 port of connectors/langsmith/genblaze_langsmith/tracer.py
 *
 * Each pipeline run becomes a `chain` run in LangSmith; each step becomes
 * a nested child run tagged with `genblaze.step`.
 */

import crypto from 'crypto';
import { Tracer } from '../../../core/genblaze_core/observability/tracer.js';

export interface LangSmithTracerOptions {
    projectName?: string;
    apiKey?: string;
    baseUrl?: string;
}

export class LangSmithTracer extends Tracer {
    private projectName: string;
    private apiKey: string;
    private baseUrl: string;
    private runIds = new Map<string, string>();     // pipeline run_id → LangSmith run id
    private stepRunIds = new Map<string, string>(); // step_id → LangSmith run id

    constructor(options: LangSmithTracerOptions = {}) {
        super();
        this.projectName = options.projectName ?? 'default';
        this.apiKey = options.apiKey || process.env.LANGSMITH_API_KEY || '';
        this.baseUrl = options.baseUrl || 'https://api.smith.langchain.com';
    }

    private async createRun(payload: Record<string, any>): Promise<void> {
        if (!this.apiKey) return;
        try {
            await fetch(`${this.baseUrl}/runs`, {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (err: any) {
            console.warn('[LangSmithTracer] createRun failed:', err.message);
        }
    }

    private async updateRun(runId: string, payload: Record<string, any>): Promise<void> {
        if (!this.apiKey) return;
        try {
            await fetch(`${this.baseUrl}/runs/${runId}`, {
                method: 'PATCH',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...payload, end_time: new Date().toISOString() })
            });
        } catch (err: any) {
            console.warn('[LangSmithTracer] updateRun failed:', err.message);
        }
    }

    onRunStart(
        runId: string,
        name?: string | null,
        options: { tenantId?: string | null; totalSteps?: number | null; metadata?: Record<string, any> | null } = {}
    ): void {
        const lsRunId = crypto.randomUUID();
        this.runIds.set(runId, lsRunId);

        this.createRun({
            id: lsRunId,
            name: name ?? 'genblaze-pipeline',
            run_type: 'chain',
            inputs: { total_steps: options.totalSteps, tenant_id: options.tenantId },
            project_name: this.projectName,
            tags: ['genblaze', 'pipeline'],
            extra: { metadata: { 'genblaze.run_id': runId, ...(options.metadata ?? {}) } }
        }).catch(() => {});
    }

    onStepStart(
        runId: string,
        step: any,
        options: { stepIndex: number; totalSteps: number }
    ): void {
        const parent = this.runIds.get(runId);
        const lsStepId = crypto.randomUUID();
        this.stepRunIds.set(step.stepId, lsStepId);

        this.createRun({
            id: lsStepId,
            name: `${step.provider}/${step.model}`,
            run_type: 'llm',
            inputs: {
                prompt: step.prompt,
                params: step.params,
                modality: String(step.modality)
            },
            parent_run_id: parent,
            project_name: this.projectName,
            tags: ['genblaze', 'step', step.provider].filter(Boolean),
            extra: {
                metadata: {
                    'genblaze.step_id': step.stepId,
                    'genblaze.step_index': options.stepIndex,
                    'genblaze.total_steps': options.totalSteps
                }
            }
        }).catch(() => {});
    }

    onEvent(_event: any): void {
        // Progress ticks are noisy; skip by default.
    }

    onStepEnd(
        runId: string,
        step: any,
        options: { durationMs: number; stepIndex: number }
    ): void {
        const lsId = this.stepRunIds.get(step.stepId);
        if (!lsId) return;
        this.stepRunIds.delete(step.stepId);

        const outputs: Record<string, any> = {
            assets: (step.assets ?? []).map((a: any) => ({ url: a.url, media_type: a.mediaType })),
            status: String(step.status),
            duration_ms: options.durationMs
        };
        if (step.costUsd != null) outputs.cost_usd = step.costUsd;

        this.updateRun(lsId, { outputs, error: step.error ?? null }).catch(() => {});
    }

    onRunEnd(runId: string, result: any): void {
        const lsId = this.runIds.get(runId);
        if (!lsId) return;
        this.runIds.delete(runId);

        this.updateRun(lsId, {
            outputs: {
                status: String(result.run?.status),
                manifest_hash: result.manifest?.canonicalHash,
                n_steps: result.run?.steps?.length ?? 0
            },
            error: typeof result.errorSummary === 'function' ? result.errorSummary() : null
        }).catch(() => {});
    }
}
