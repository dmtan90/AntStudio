import { Modality } from './models/enums.js';

export interface ModelSpec {
    provider: string;
    modelId: string;
    modality: Modality;
    maxContextTokens?: number;
    supportedFormats?: string[];
}

export class ModelRegistry {
    private static models: Map<string, ModelSpec> = new Map();

    public static register(spec: ModelSpec): void {
        const key = `${spec.provider}:${spec.modelId}`;
        this.models.set(key, spec);
    }

    public static get(provider: string, modelId: string): ModelSpec | undefined {
        return this.models.get(`${provider}:${modelId}`);
    }
}
