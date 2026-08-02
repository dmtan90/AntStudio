/** AgentLoop — iterative generate → evaluate → refine. 1:1 port of agents/loop.py */

import { EvaluationResult, Evaluator } from './evaluator.js';
import { Tracer, NoOpTracer } from '../observability/tracer.js';

export interface AgentContext {
    iteration: number;
    priorResults: any[];
    lastEvaluation: EvaluationResult | null;
}

export interface AgentIteration {
    index: number;
    result: any;
    evaluation: EvaluationResult;
}

export interface AgentResult {
    iterations: AgentIteration[];
    final: any;
    passed: boolean;
    totalCostUsd: number;
}

export class AgentLoop {
    private pipelineFactory: (ctx: AgentContext) => any;
    private evaluator: Evaluator;
    private maxIterations: number;
    private tracer: Tracer;
    private stopOnPipelineFailure: boolean;

    constructor(
        pipelineFactory: (ctx: AgentContext) => any,
        evaluator: Evaluator,
        options: {
            maxIterations?: number;
            tracer?: Tracer;
            stopOnPipelineFailure?: boolean;
        } = {}
    ) {
        this.pipelineFactory = pipelineFactory;
        this.evaluator = evaluator;
        this.maxIterations = options.maxIterations ?? 3;
        this.tracer = options.tracer ?? new NoOpTracer();
        this.stopOnPipelineFailure = options.stopOnPipelineFailure ?? true;
    }

    async run(sink?: any): Promise<AgentResult> {
        const iterations: AgentIteration[] = [];
        const priorResults: any[] = [];
        let lastEvaluation: EvaluationResult | null = null;
        let totalCostUsd = 0;

        for (let i = 0; i < this.maxIterations; i++) {
            const ctx: AgentContext = {
                iteration: i,
                priorResults: [...priorResults],
                lastEvaluation
            };

            const pipeline = this.pipelineFactory(ctx);

            let pipelineResult: any;
            try {
                pipelineResult = await pipeline.run(sink);
            } catch (err: any) {
                if (this.stopOnPipelineFailure) {
                    const failedEval: EvaluationResult = {
                        passed: false,
                        feedback: `Pipeline error: ${err.message}`,
                        metadata: {}
                    };
                    iterations.push({ index: i, result: null, evaluation: failedEval });
                    return {
                        iterations,
                        final: null,
                        passed: false,
                        totalCostUsd
                    };
                }
                continue;
            }

            const evalResult = await this.evaluator.aevaluate(pipelineResult);
            lastEvaluation = evalResult;
            priorResults.push(pipelineResult);
            iterations.push({ index: i, result: pipelineResult, evaluation: evalResult });

            if (evalResult.passed) {
                return {
                    iterations,
                    final: pipelineResult,
                    passed: true,
                    totalCostUsd
                };
            }
        }

        const last = iterations[iterations.length - 1];
        return {
            iterations,
            final: last?.result ?? null,
            passed: last?.evaluation.passed ?? false,
            totalCostUsd
        };
    }
}
