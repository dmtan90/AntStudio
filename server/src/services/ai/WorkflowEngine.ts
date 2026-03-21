import { Logger } from '../../utils/Logger.js';

export type WorkflowNode<TContext> = (context: TContext) => Promise<{
    next: string | null;
    updates?: Partial<TContext>;
    logs?: string[];
}>;

export interface WorkflowConfig<TContext> {
    nodes: Record<string, WorkflowNode<TContext>>;
    initialNode: string;
}

/**
 * A lightweight Graph-based engine for AI orchestration.
 * Inspired by LangGraph principles: nodes, edges, and shared state (context).
 */
export class WorkflowEngine<TContext> {
    private nodes: Record<string, WorkflowNode<TContext>>;
    private initialNode: string;

    constructor(config: WorkflowConfig<TContext>) {
        this.nodes = config.nodes;
        this.initialNode = config.initialNode;
    }

    /**
     * Executes the workflow.
     * @param initialContext The starting context/state
     * @param startNode Optional node to start from (overrides engine default)
     * @param onStep Callback for step logs
     */
    public async execute(initialContext: TContext, startNode?: string, onStep?: (nodeName: string, logs: string[]) => void): Promise<TContext> {
        let currentNodeName: string | null = startNode || this.initialNode;
        let context = { ...initialContext };

        Logger.info(`[WorkflowEngine] Starting workflow at node: ${currentNodeName}`, 'WorkflowEngine');

        while (currentNodeName) {
            const node: WorkflowNode<TContext> = this.nodes[currentNodeName];
            if (!node) {
                throw new Error(`[WorkflowEngine] Node not found: ${currentNodeName}`);
            }

            try {
                const result = await node(context);
                
                // Update shared context
                if (result.updates) {
                    context = { ...context, ...result.updates };
                }

                // Callback for UI updates/logs
                if (onStep) {
                    onStep(currentNodeName, result.logs || []);
                }

                Logger.info(`[WorkflowEngine] Node ${currentNodeName} completed. Next: ${result.next}`, 'WorkflowEngine');
                currentNodeName = result.next;
            } catch (error: any) {
                Logger.error(`[WorkflowEngine] Error in node ${currentNodeName}: ${error.message}`, 'WorkflowEngine', error);
                throw error;
            }
        }

        Logger.info(`[WorkflowEngine] Workflow completed.`, 'WorkflowEngine');
        return context;
    }
}
