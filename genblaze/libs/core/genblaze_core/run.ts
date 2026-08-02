import { GenblazeStepResult } from './step.js';

export interface GenblazeRun {
    runId: string;
    pipelineName: string;
    tenantId?: string;
    parentRunId?: string;
    steps: GenblazeStepResult[];
    startedAt: string;
    completedAt: string;
}
