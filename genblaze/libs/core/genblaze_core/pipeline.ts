import crypto from 'crypto';
import { Buffer } from 'buffer';
import { ManifestBuilder } from './manifest.js';
import { LoggingTracer, ITracer } from './tracers.js';
import type { StepParams } from './types.js';

export type { StepParams };

export interface ProviderOutput {
    buffer: Buffer;
    mimeType: string;
    url?: string;
    metadata?: Record<string, any>;
}

export abstract class BaseProviderAdapter {
    abstract readonly name: string;
    abstract execute(params: StepParams): Promise<ProviderOutput>;
}

export class Pipeline {
    private name: string;
    private steps: { provider: BaseProviderAdapter; params: StepParams }[] = [];
    private tracer: ITracer = new LoggingTracer();

    constructor(name: string) {
        this.name = name;
    }

    public setTracer(tracer: ITracer): this {
        this.tracer = tracer;
        return this;
    }

    public step(provider: BaseProviderAdapter, params: StepParams): this {
        this.steps.push({ provider, params });
        return this;
    }

    public async run(sink?: any): Promise<{ run: any; manifest: any }> {
        const runId = crypto.randomUUID();
        const run: any = {
            runId,
            pipelineName: this.name,
            createdAt: new Date().toISOString(),
            status: 'COMPLETED',
            steps: []
        };

        this.tracer.onPipelineStart(this.name, runId);

        for (let i = 0; i < this.steps.length; i++) {
            const { provider, params } = this.steps[i];
            const startTime = Date.now();
            const stepId = `step-${i}`;

            this.tracer.onStepStart(stepId, provider.name, params.model);

            try {
                const output = await provider.execute(params);
                const durationMs = Date.now() - startTime;
                const assetId = crypto.randomUUID();

                let assetUrl = `memory://${assetId}`;
                if (sink && typeof sink.storeMedia === 'function') {
                    const saved = await sink.storeMedia(output.buffer, `${assetId}.${output.mimeType.split('/')[1] || 'bin'}`);
                    assetUrl = typeof saved === 'string' ? saved : (saved?.url || assetUrl);
                }

                const sha256 = crypto.createHash('sha256').update(output.buffer).digest('hex');

                const stepResult: any = {
                    stepId,
                    stepIndex: i,
                    provider: provider.name,
                    model: params.model,
                    prompt: params.prompt,
                    modality: params.modality,
                    durationMs,
                    status: 'COMPLETED',
                    assets: [{
                        id: assetId,
                        url: assetUrl,
                        mimeType: output.mimeType,
                        sha256,
                        size: output.buffer.length
                    }]
                };

                run.steps.push(stepResult);
                this.tracer.onStepComplete(stepId, durationMs, stepResult.assets.length);
            } catch (err: any) {
                const durationMs = Date.now() - startTime;
                run.status = 'FAILED';

                const stepResult: any = {
                    stepId,
                    stepIndex: i,
                    provider: provider.name,
                    model: params.model,
                    prompt: params.prompt,
                    modality: params.modality,
                    durationMs,
                    status: 'FAILED',
                    error: err.message,
                    assets: []
                };

                run.steps.push(stepResult);
                this.tracer.onStepError(stepId, err);
                break;
            }
        }

        const manifest = ManifestBuilder.createManifest(run);

        if (sink && typeof sink.storeManifest === 'function') {
            await sink.storeManifest(manifest);
        }

        return { run, manifest };
    }
}
