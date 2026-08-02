/** Evaluator — pluggable quality-gate for pipeline outputs. 1:1 port of agents/evaluator.py */

export interface EvaluationResult {
    passed: boolean;
    score?: number | null;
    feedback?: string | null;
    metadata: Record<string, any>;
}

export abstract class Evaluator {
    /** Judge a completed pipeline result. Must return an EvaluationResult. */
    abstract evaluate(result: any): EvaluationResult | Promise<EvaluationResult>;

    async aevaluate(result: any): Promise<EvaluationResult> {
        return this.evaluate(result);
    }
}

export class CallableEvaluator extends Evaluator {
    private fn: (result: any) => EvaluationResult | boolean | Promise<EvaluationResult | boolean>;

    constructor(fn: (result: any) => EvaluationResult | boolean | Promise<EvaluationResult | boolean>) {
        super();
        this.fn = fn;
    }

    async evaluate(result: any): Promise<EvaluationResult> {
        const out = await this.fn(result);
        if (typeof out === 'object' && out !== null && 'passed' in out) {
            return out as EvaluationResult;
        }
        return { passed: Boolean(out), metadata: {} };
    }
}

export class ThresholdEvaluator extends Evaluator {
    private scoreFn: (result: any) => number | Promise<number>;
    private threshold: number;
    private higherIsBetter: boolean;
    private feedbackFn?: (result: any, score: number) => string;

    constructor(
        scoreFn: (result: any) => number | Promise<number>,
        threshold: number,
        options: { higherIsBetter?: boolean; feedbackFn?: (result: any, score: number) => string } = {}
    ) {
        super();
        this.scoreFn = scoreFn;
        this.threshold = threshold;
        this.higherIsBetter = options.higherIsBetter ?? true;
        this.feedbackFn = options.feedbackFn;
    }

    async evaluate(result: any): Promise<EvaluationResult> {
        const score = Number(await this.scoreFn(result));
        const passed = this.higherIsBetter ? score >= this.threshold : score <= this.threshold;
        const feedback = this.feedbackFn ? this.feedbackFn(result, score) : null;
        return {
            passed,
            score,
            feedback,
            metadata: { threshold: this.threshold, higherIsBetter: this.higherIsBetter }
        };
    }
}
