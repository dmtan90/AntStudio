/**
 * Agent loop example — generate, evaluate, retry with refinement.
 * 1:1 port of examples/agent_loop_local.py
 */

import { AgentLoop, AgentContext, CallableEvaluator, EvaluationResult, MockProvider, Pipeline, Modality } from '../libs/core/genblaze_core/index.js';

const provider = new MockProvider({ costUsd: 0.04 });

function buildPipeline(ctx: AgentContext): Pipeline {
    const basePrompt = 'a serene mountain lake at sunrise';
    const prompt = ctx.lastEvaluation?.feedback
        ? `${basePrompt} — ${ctx.lastEvaluation.feedback}`
        : basePrompt;

    const pipe = new Pipeline(`hero-iter-${ctx.iteration}`);
    pipe.step(provider as any, {
        model: 'mock-v1',
        prompt,
        modality: Modality.TEXT,
        params: { _attempt: ctx.iteration }
    });
    return pipe;
}

function judgeByIteration(result: any): EvaluationResult {
    const attempt = result.run.steps[result.run.steps.length - 1]?.params?._attempt ?? 0;
    const passed = attempt >= 2;
    return {
        passed,
        score: 0.3 + 0.3 * attempt,
        feedback: !passed ? 'try with warmer lighting' : null,
        metadata: {}
    };
}

async function main() {
    console.log('🤖 Running Agent Loop Local Example...');
    const loop = new AgentLoop(buildPipeline, new CallableEvaluator(judgeByIteration), { maxIterations: 3 });
    const result = await loop.run();
    console.log('Agent loop completed iterations:', result.iterations.length);
}

main().catch(console.error);
