/** Fluent builder for Step models. 1:1 port of builders/step_builder.py */

import { Step, createStep } from '../models/step.js';
import { Asset, createAsset } from '../models/asset.js';
import { Modality, PromptVisibility, StepStatus, StepType } from '../models/enums.js';

export class StepBuilder {
    private data: Record<string, any>;

    constructor(provider: string, model: string) {
        this.data = { provider, model };
    }

    prompt(text: string): this {
        this.data.prompt = text;
        return this;
    }

    negativePrompt(text: string): this {
        this.data.negativePrompt = text;
        return this;
    }

    modality(m: Modality): this {
        this.data.modality = m;
        return this;
    }

    visibility(v: PromptVisibility): this {
        this.data.promptVisibility = v;
        return this;
    }

    stepType(t: StepType): this {
        this.data.stepType = t;
        return this;
    }

    seed(s: number): this {
        this.data.seed = s;
        return this;
    }

    modelVersion(v: string): this {
        this.data.modelVersion = v;
        return this;
    }

    modelHash(h: string): this {
        this.data.modelHash = h;
        return this;
    }

    inputAsset(url: string, mediaType: string, extra: Partial<Asset> = {}): this {
        if (!this.data.inputs) this.data.inputs = [];
        this.data.inputs.push(createAsset({ url, mediaType, ...extra }));
        return this;
    }

    params(extra: Record<string, any>): this {
        this.data.params = { ...this.data.params, ...extra };
        return this;
    }

    status(s: StepStatus): this {
        this.data.status = s;
        return this;
    }

    asset(url: string, mediaType: string, extra: Partial<Asset> = {}): this {
        if (!this.data.assets) this.data.assets = [];
        this.data.assets.push(createAsset({ url, mediaType, ...extra }));
        return this;
    }

    meta(extra: Record<string, any>): this {
        this.data.metadata = { ...this.data.metadata, ...extra };
        return this;
    }

    build(): Step {
        return createStep(this.data as Parameters<typeof createStep>[0]);
    }
}
