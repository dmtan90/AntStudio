/**
 * ModelSpec and ParamSchema — declarative per-model configuration.
 * 1:1 port of providers/spec.py
 */

import { Modality, ProviderErrorCode } from '../models/enums.js';

function err(key: string, msg: string): Error {
    const error = new Error(`Invalid parameter ${JSON.stringify(key)}: ${msg}`);
    (error as any).errorCode = ProviderErrorCode.INVALID_INPUT;
    return error;
}

export class IntSchema {
    readonly min?: number;
    readonly max?: number;
    readonly enum?: Set<number>;

    constructor(options: { min?: number; max?: number; enum?: Iterable<number> } = {}) {
        this.min = options.min;
        this.max = options.max;
        this.enum = options.enum ? new Set(options.enum) : undefined;
    }

    validate(key: string, value: any): void {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            throw err(key, `expected int, got ${typeof value}`);
        }
        if (this.enum !== undefined && !this.enum.has(value)) {
            throw err(key, `must be one of ${Array.from(this.enum).sort((a, b) => a - b)}`);
        }
        if (this.min !== undefined && value < this.min) {
            throw err(key, `must be >= ${this.min}`);
        }
        if (this.max !== undefined && value > this.max) {
            throw err(key, `must be <= ${this.max}`);
        }
    }
}

export class FloatSchema {
    readonly min?: number;
    readonly max?: number;

    constructor(options: { min?: number; max?: number } = {}) {
        this.min = options.min;
        this.max = options.max;
    }

    validate(key: string, value: any): void {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw err(key, `expected number, got ${typeof value}`);
        }
        if (this.min !== undefined && value < this.min) {
            throw err(key, `must be >= ${this.min}`);
        }
        if (this.max !== undefined && value > this.max) {
            throw err(key, `must be <= ${this.max}`);
        }
    }
}

export class StringSchema {
    readonly minLen?: number;
    readonly maxLen?: number;
    readonly enum?: Set<string>;
    readonly pattern?: RegExp;

    constructor(options: { minLen?: number; maxLen?: number; enum?: Iterable<string>; pattern?: string | RegExp } = {}) {
        this.minLen = options.minLen;
        this.maxLen = options.maxLen;
        this.enum = options.enum ? new Set(options.enum) : undefined;
        this.pattern = typeof options.pattern === 'string' ? new RegExp(options.pattern) : options.pattern;
    }

    validate(key: string, value: any): void {
        if (typeof value !== 'string') {
            throw err(key, `expected string, got ${typeof value}`);
        }
        if (this.enum !== undefined && !this.enum.has(value)) {
            throw err(key, `must be one of ${Array.from(this.enum).sort()}`);
        }
        if (this.minLen !== undefined && value.length < this.minLen) {
            throw err(key, `length must be >= ${this.minLen}`);
        }
        if (this.maxLen !== undefined && value.length > this.maxLen) {
            throw err(key, `length must be <= ${this.maxLen}`);
        }
        if (this.pattern !== undefined && !this.pattern.test(value)) {
            throw err(key, `must match pattern ${this.pattern}`);
        }
    }
}

export class EnumSchema {
    readonly values: Set<any>;

    constructor(values: Iterable<any>) {
        this.values = new Set(values);
    }

    validate(key: string, value: any): void {
        if (!this.values.has(value)) {
            throw err(key, `must be one of ${Array.from(this.values).sort()}`);
        }
    }
}

export class BoolSchema {
    validate(key: string, value: any): void {
        if (typeof value !== 'boolean') {
            throw err(key, `expected boolean, got ${typeof value}`);
        }
    }
}

export type ParamSchema = IntSchema | FloatSchema | StringSchema | EnumSchema | BoolSchema;

export interface ModelSpecOptions {
    modelId: string;
    modality?: Modality;
    paramSchemas?: Record<string, ParamSchema>;
    paramCoercers?: Record<string, (val: any) => any>;
    inputMapping?: (inputs: any[]) => Record<string, any>;
    pricing?: any;
    description?: string;
}

export class ModelSpec {
    readonly modelId: string;
    readonly modality: Modality;
    readonly paramSchemas: Record<string, ParamSchema>;
    readonly paramCoercers: Record<string, (val: any) => any>;
    readonly inputMapping?: (inputs: any[]) => Record<string, any>;
    readonly pricing?: any;
    readonly description?: string;

    constructor(options: ModelSpecOptions) {
        this.modelId = options.modelId;
        this.modality = options.modality ?? Modality.IMAGE;
        this.paramSchemas = options.paramSchemas ?? {};
        this.paramCoercers = options.paramCoercers ?? {};
        this.inputMapping = options.inputMapping;
        this.pricing = options.pricing;
        this.description = options.description;
    }

    validateParams(params: Record<string, any>): Record<string, any> {
        const coerced = { ...params };
        for (const [key, coercer] of Object.entries(this.paramCoercers)) {
            if (key in coerced && coerced[key] !== null && coerced[key] !== undefined) {
                coerced[key] = coercer(coerced[key]);
            }
        }
        for (const [key, schema] of Object.entries(this.paramSchemas)) {
            if (key in coerced && coerced[key] !== null && coerced[key] !== undefined) {
                schema.validate(key, coerced[key]);
            }
        }
        return coerced;
    }
}
