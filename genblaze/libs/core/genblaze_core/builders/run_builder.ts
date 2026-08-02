/** Fluent builder for Run models. 1:1 port of builders/run_builder.py */

import { Run, createRun } from '../models/run.js';
import { Step } from '../models/step.js';
import { RunStatus } from '../models/enums.js';

export class RunBuilder {
    private data: Partial<Run> = {};
    private steps: Step[] = [];

    constructor(name?: string) {
        if (name) this.data.name = name;
    }

    runId(id: string): this {
        this.data.runId = id;
        return this;
    }

    tenant(tenantId: string): this {
        this.data.tenantId = tenantId;
        return this;
    }

    project(projectId: string): this {
        this.data.projectId = projectId;
        return this;
    }

    parent(parentRunId: string): this {
        this.data.parentRunId = parentRunId;
        return this;
    }

    status(s: RunStatus): this {
        this.data.status = s;
        return this;
    }

    addStep(step: Step): this {
        this.steps.push(step);
        return this;
    }

    meta(metadata: Record<string, any>): this {
        this.data.metadata = { ...this.data.metadata, ...metadata };
        return this;
    }

    build(): Run {
        const run = createRun(this.data);
        // Wire steps with run_id and step_index
        const wiredSteps = this.steps.map((step, idx) => ({
            ...step,
            runId: run.runId,
            stepIndex: idx
        }));
        run.steps = wiredSteps;
        return run;
    }
}
