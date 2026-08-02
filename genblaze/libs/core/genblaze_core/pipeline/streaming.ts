export const SENTINEL = Symbol('SENTINEL');

export interface StreamEvent {
    type: string;
    runId?: string;
    stepId?: string;
    provider?: string;
    model?: string;
    requestId?: string;
    progressPct?: number;
    elapsedSec?: number;
    message?: string;
    data?: any;
}

export class QueueEmitter {
    readonly runId?: string;
    private queue: any[] = [];
    private closed = false;

    constructor(runId?: string) {
        this.runId = runId;
    }

    public put(event: StreamEvent | typeof SENTINEL): void {
        if (this.closed) return;
        this.queue.push(event);
    }

    public close(): void {
        if (this.closed) return;
        this.put(SENTINEL);
        this.closed = true;
    }

    public *drain(): Generator<StreamEvent> {
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (item === SENTINEL) break;
            yield item as StreamEvent;
        }
    }
}
