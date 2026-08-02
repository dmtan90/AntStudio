/**
 * ModelRegistry — layered, thread-safe store of ModelSpec entries.
 * 1:1 port of providers/model_registry.py
 */

import { ModelSpec } from './spec.js';
import { ModelFamily } from './family.js';
import { ValidationResult, ValidationSource, ValidationOutcome } from './validation.js';

export interface ModelRegistryOptions {
    providerFamilies?: ModelFamily[];
    fallbackSpec?: ModelSpec;
}

export class ModelRegistry {
    private userSpecs = new Map<string, ModelSpec>();
    private userFamilies: ModelFamily[] = [];
    private providerFamilies: ModelFamily[];
    private fallbackSpec: ModelSpec;

    constructor(options: ModelRegistryOptions = {}) {
        this.providerFamilies = options.providerFamilies ?? [];
        this.fallbackSpec = options.fallbackSpec ?? new ModelSpec({ modelId: '*' });
    }

    register(spec: ModelSpec): void {
        this.userSpecs.set(spec.modelId, spec);
    }

    registerFamily(family: ModelFamily): void {
        this.userFamilies.unshift(family);
    }

    getSpec(modelId: string): ModelSpec {
        // 1. User specs
        if (this.userSpecs.has(modelId)) {
            return this.userSpecs.get(modelId)!;
        }

        // 2. User families
        for (const fam of this.userFamilies) {
            if (fam.matches(modelId)) {
                return fam.createSpec(modelId);
            }
        }

        // 3. Provider families
        for (const fam of this.providerFamilies) {
            if (fam.matches(modelId)) {
                return fam.createSpec(modelId);
            }
        }

        // 4. Fallback spec
        return this.fallbackSpec;
    }

    validateModel(modelId: string): ValidationResult {
        if (this.userSpecs.has(modelId)) {
            return {
                modelId,
                outcome: ValidationOutcome.OK_AUTHORITATIVE,
                source: ValidationSource.USER,
                spec: this.userSpecs.get(modelId)
            };
        }

        for (const fam of this.userFamilies) {
            if (fam.matches(modelId)) {
                return {
                    modelId,
                    outcome: ValidationOutcome.OK_PROVISIONAL,
                    source: ValidationSource.FAMILY,
                    spec: fam.createSpec(modelId)
                };
            }
        }

        for (const fam of this.providerFamilies) {
            if (fam.matches(modelId)) {
                return {
                    modelId,
                    outcome: ValidationOutcome.OK_PROVISIONAL,
                    source: ValidationSource.FAMILY,
                    spec: fam.createSpec(modelId)
                };
            }
        }

        return {
            modelId,
            outcome: ValidationOutcome.UNKNOWN_PERMISSIVE,
            source: ValidationSource.FALLBACK,
            spec: this.fallbackSpec
        };
    }
}
