export class Tracer {
    public onRunStart(runId: string, name?: string, options?: any): void {}
    public onStepStart(runId: string, step: any, options?: any): void {}
    public onEvent(event: any): void {}
    public onStepEnd(runId: string, step: any, options?: any): void {}
    public onRunEnd(runId: string, result: any): void {}
}

export class NoOpTracer extends Tracer {}

export class CompositeTracer extends Tracer {
    private tracers: Tracer[];

    constructor(tracers: Tracer[]) {
        super();
        this.tracers = tracers;
    }

    public onRunStart(runId: string, name?: string, options?: any): void {
        this.tracers.forEach(t => {
            try { t.onRunStart(runId, name, options); } catch (_) {}
        });
    }

    public onStepStart(runId: string, step: any, options?: any): void {
        this.tracers.forEach(t => {
            try { t.onStepStart(runId, step, options); } catch (_) {}
        });
    }

    public onEvent(event: any): void {
        this.tracers.forEach(t => {
            try { t.onEvent(event); } catch (_) {}
        });
    }

    public onStepEnd(runId: string, step: any, options?: any): void {
        this.tracers.forEach(t => {
            try { t.onStepEnd(runId, step, options); } catch (_) {}
        });
    }

    public onRunEnd(runId: string, result: any): void {
        this.tracers.forEach(t => {
            try { t.onRunEnd(runId, result); } catch (_) {}
        });
    }
}
