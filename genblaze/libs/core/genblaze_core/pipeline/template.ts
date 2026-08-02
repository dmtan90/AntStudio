/**
 * Pipeline templates — serializable, reusable pipeline definitions.
 * 1:1 port of pipeline/template.py
 */

import fs from 'fs';
import path from 'path';
import { Modality, StepType } from '../models/enums.js';

export interface StepTemplate {
    providerName: string;
    model: string;
    prompt?: string | null;
    params: Record<string, any>;
    modality: Modality;
    stepType: StepType;
    fallbackModels: string[];
    inputFrom?: number[] | null;
}

export interface PipelineTemplateData {
    name?: string | null;
    steps: StepTemplate[];
    chain?: boolean;
    maxConcurrency?: number | null;
    description?: string | null;
    version?: string | null;
    tags?: string[];
}

function renderTemplateValue(value: any, variables: Record<string, string>): any {
    if (typeof value === 'string') {
        return value.replace(/\{([^}]+)\}/g, (_, key) => {
            if (key in variables) return variables[key];
            throw new Error(`Missing template variable: ${key}`);
        });
    }
    if (Array.isArray(value)) return value.map(v => renderTemplateValue(v, variables));
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, renderTemplateValue(v, variables)])
        );
    }
    return value;
}

export class PipelineTemplate {
    name?: string | null;
    steps: StepTemplate[];
    chain: boolean;
    maxConcurrency?: number | null;
    description?: string | null;
    version?: string | null;
    tags: string[];

    constructor(data: PipelineTemplateData) {
        this.name = data.name;
        this.steps = data.steps;
        this.chain = data.chain ?? false;
        this.maxConcurrency = data.maxConcurrency;
        this.description = data.description;
        this.version = data.version;
        this.tags = data.tags ?? [];
    }

    toJson(indent = 2): string {
        return JSON.stringify(this.toDict(), null, indent);
    }

    toDict(): Record<string, any> {
        return {
            name: this.name,
            steps: this.steps.map(s => ({
                providerName: s.providerName,
                model: s.model,
                prompt: s.prompt,
                params: s.params,
                modality: s.modality,
                stepType: s.stepType,
                fallbackModels: s.fallbackModels,
                inputFrom: s.inputFrom
            })),
            chain: this.chain,
            maxConcurrency: this.maxConcurrency,
            description: this.description,
            version: this.version,
            tags: this.tags
        };
    }

    static fromJson(jsonStr: string): PipelineTemplate {
        const data = JSON.parse(jsonStr);
        return new PipelineTemplate(data);
    }

    static fromDict(data: Record<string, any>): PipelineTemplate {
        return new PipelineTemplate(data as PipelineTemplateData);
    }

    static fromFile(filePath: string): PipelineTemplate {
        const content = fs.readFileSync(filePath, 'utf-8');
        return PipelineTemplate.fromJson(content);
    }

    save(filePath: string): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, this.toJson(), 'utf-8');
    }

    instantiate(
        providers?: Record<string, any> | null,
        options: {
            variables?: Record<string, string> | null;
            tenantId?: string | null;
            projectId?: string | null;
            pipelineFactory?: (name: string | null | undefined, opts: Record<string, any>) => any;
        } = {}
    ): any {
        if (!this.steps.length) {
            throw new Error('Template has no steps');
        }

        if (!options.pipelineFactory) {
            throw new Error(
                'PipelineTemplate.instantiate() requires a `pipelineFactory` option. ' +
                'Pass pipelineFactory: (name, opts) => new Pipeline(name, opts) from your application code.'
            );
        }

        const pipe = options.pipelineFactory(this.name, {
            tenantId: options.tenantId,
            projectId: options.projectId,
            chain: this.chain,
            maxConcurrency: this.maxConcurrency
        });


        const { variables } = options;

        for (const st of this.steps) {
            const provider = providers?.[st.providerName];
            if (!provider) {
                const available = Object.keys(providers ?? {}).sort().join(', ');
                throw new Error(
                    `Provider '${st.providerName}' not found. Available: [${available}]`
                );
            }

            let prompt = st.prompt ?? undefined;
            if (prompt && variables) {
                prompt = renderTemplateValue(prompt, variables) as string;
            }

            let params = st.params;
            if (params && variables) {
                params = renderTemplateValue(params, variables) as Record<string, any>;
            }

            pipe.step(provider, {
                model: st.model,
                prompt,
                modality: st.modality,
                stepType: st.stepType,
                fallbackModels: st.fallbackModels,
                inputFrom: st.inputFrom,
                ...params
            });
        }

        return pipe;
    }
}
