export abstract class BaseSink {
    abstract writeRun(run: any, manifest: any): Promise<void>;
}
