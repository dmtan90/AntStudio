export interface ITracer {
    onPipelineStart(pipelineName: string, runId: string): void;
    onStepStart(stepId: string, provider: string, model: string): void;
    onStepComplete(stepId: string, durationMs: number, assetsCount: number): void;
    onStepError(stepId: string, error: Error): void;
    onPipelineComplete(pipelineName: string, runId: string, totalMs: number): void;
}

export class LoggingTracer implements ITracer {
    onPipelineStart(pipelineName: string, runId: string): void {
        console.log(`[GenblazeTracer] 🏁 Pipeline '${pipelineName}' started | Run ID: ${runId}`);
    }

    onStepStart(stepId: string, provider: string, model: string): void {
        console.log(`[GenblazeTracer] 🚀 Step '${stepId}' started | Provider: ${provider} | Model: ${model}`);
    }

    onStepComplete(stepId: string, durationMs: number, assetsCount: number): void {
        console.log(`[GenblazeTracer] ✅ Step '${stepId}' completed in ${durationMs}ms | Assets generated: ${assetsCount}`);
    }

    onStepError(stepId: string, error: Error): void {
        console.error(`[GenblazeTracer] ❌ Step '${stepId}' failed: ${error.message}`);
    }

    onPipelineComplete(pipelineName: string, runId: string, totalMs: number): void {
        console.log(`[GenblazeTracer] 🎉 Pipeline '${pipelineName}' finished in ${totalMs}ms`);
    }
}
