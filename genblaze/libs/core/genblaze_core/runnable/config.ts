/** Runnable configuration. 1:1 port of runnable/config.py */

export interface RunnableConfig {
    tags?: string[];
    metadata?: Record<string, any>;
    runId?: string;
    timeout?: number;
    maxRetries?: number;
    onProgress?: ((event: any) => void) | null;
    onSubmit?: ((stepId: string, predictionId: any) => void) | null;
    onRetry?: ((event: any) => void) | null;
}
