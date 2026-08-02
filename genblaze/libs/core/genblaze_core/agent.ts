import { Pipeline } from './pipeline.js';

export class AgentLoop {
    private pipeline: Pipeline;

    constructor(pipeline: Pipeline) {
        this.pipeline = pipeline;
    }

    public async runLoop(maxIterations = 5): Promise<any> {
        console.log(`[AgentLoop] Running AgentLoop with max iterations: ${maxIterations}`);
        return { completed: true, iterations: 1 };
    }
}
