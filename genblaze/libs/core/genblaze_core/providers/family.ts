/**
 * ModelFamily — pattern-keyed param-shape rule.
 * 1:1 port of providers/family.py
 */

import { ModelSpec } from './spec.js';

export enum LiveProbeResult {
    LIVE = 'live',
    DEAD = 'dead',
    UNKNOWN = 'unknown'
}

export type FamilyProbe = (...args: any[]) => Promise<LiveProbeResult> | LiveProbeResult;

export interface ModelFamilyOptions {
    name: string;
    pattern: RegExp | string;
    specTemplate: ModelSpec;
    probe?: FamilyProbe;
    description?: string;
    exampleSlugs?: string[];
}

export class ModelFamily {
    readonly name: string;
    readonly pattern: RegExp;
    readonly specTemplate: ModelSpec;
    readonly probe?: FamilyProbe;
    readonly description?: string;
    readonly exampleSlugs: string[];

    constructor(options: ModelFamilyOptions) {
        this.name = options.name;
        this.pattern = typeof options.pattern === 'string' ? new RegExp(options.pattern) : options.pattern;
        this.specTemplate = options.specTemplate;
        this.probe = options.probe;
        this.description = options.description;
        this.exampleSlugs = options.exampleSlugs ?? [];
    }

    matches(modelId: string): boolean {
        return this.pattern.test(modelId);
    }

    createSpec(modelId: string): ModelSpec {
        return new ModelSpec({
            modelId,
            modality: this.specTemplate.modality,
            paramSchemas: this.specTemplate.paramSchemas,
            paramCoercers: this.specTemplate.paramCoercers,
            inputMapping: this.specTemplate.inputMapping,
            pricing: this.specTemplate.pricing,
            description: this.description ?? this.specTemplate.description
        });
    }
}
