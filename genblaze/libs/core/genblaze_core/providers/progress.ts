/** Progress events for provider poll loops. 1:1 port of providers/progress.py */

export interface ProgressEvent {
    stepId: string;
    provider: string;
    model: string;
    /** Current status: 'submitted', 'processing', 'resumed', 'retry_resumed', 'succeeded', 'failed'. */
    status: string;
    /** 0.0–1.0 if the provider reports progress, else null. */
    progressPct: number | null;
    /** Seconds elapsed since step start. */
    elapsedSec: number;
    /** Optional human-readable status message. */
    message?: string | null;
    /** Optional URL to an intermediate preview. */
    previewUrl?: string | null;
    /** Upstream provider's prediction/job id, available once submit returns. */
    requestId?: string | null;
    /** True when synthesized by the heartbeat helper (no real progress change). */
    isHeartbeat: boolean;
}
