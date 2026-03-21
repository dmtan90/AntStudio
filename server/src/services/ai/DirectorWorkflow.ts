import { WorkflowEngine, WorkflowNode } from './WorkflowEngine.js';
import { promptService } from '../PromptService.js';
import { generateJSON } from '../../utils/AIGenerator.js';
import { consensusService } from './ConsensusService.js';
import { Logger } from '../../utils/Logger.js';

export interface DirectorContext {
    userId: string;
    projectId?: string;
    influencerId?: string;
    studioState: {
        vibe: any;
        engagement: any;
        chatSummary: string;
        activeScene: string;
        vision?: string;
        predictiveContext?: string;
        memoryContext?: string;
    };
    
    // Result State
    proposal?: any;
    consensus?: any;
    finalDecision?: any;
    
    // Workflow State
    logs: string[];
}

/**
 * Node 1: Generate Proposal
 */
const proposalNode: WorkflowNode<DirectorContext> = async (context) => {
    const logs = ['[Producer] Analyzing studio state...'];
    
    // Fetch Influencer Config
    let jobContext = '';
    let personaName = 'KOL';
    let coHostsInfo = '';

    if (context.influencerId) {
        const { Influencer } = await import('../../models/Influencer.js');
        const influencer = await Influencer.findOne({ entityId: context.influencerId });
        
        if (influencer) {
            personaName = influencer.identity.name;
            jobContext = `Role: ${influencer.jobRole || 'Influencer'}. Description: ${influencer.identity.description}`;
            
            // Multi-Agent: Fetch Co-Hosts if any
            if (influencer.activeSession?.coHosts?.length) {
                const coHosts = await Influencer.find({ entityId: { $in: influencer.activeSession.coHosts } });
                coHostsInfo = coHosts.map(ch => 
                    `- ${ch.identity.name} (${ch.jobRole || 'Guest'}: ${ch.identity.traits.join(', ')})`
                ).join('\n');
                logs.push(`[Producer] Multi-Agent Session detected. Co-Hosts: ${coHosts.length}`);
            }

            // Special handling for Sales role
            if (influencer.jobRole === 'Sales' && context.projectId) {
                const { Project } = await import('../../models/Project.js');
                const project = await Project.findById(context.projectId);
                if (project && project.metadata?.catalogId) {
                    jobContext += ` | Sales Catalog: Active. Targeting conversions.`;
                }
            }
            
            // Special handling for News role
            if (influencer.jobRole === 'News Anchor') {
                jobContext += ` | News Context: Delivering updates with authority.`;
            }

            logs.push(`[Producer] Job Role acknowledged: ${influencer.jobRole}`);
        }
    }

    const prompt = await promptService.get('studio/director_base', {
        predictiveContext: context.studioState.predictiveContext || 'Stable trends predicted.',
        memoryContext: context.studioState.memoryContext || 'No relevant historical memories found.',
        jobContext,
        personaName,
        coHostsInfo, // New field for multi-agent
        vibe: JSON.stringify(context.studioState.vibe),
        engagement: JSON.stringify(context.studioState.engagement),
        activeScene: context.studioState.activeScene,
        vision: context.studioState.vision || 'Normal stage setup',
        chatSummary: context.studioState.chatSummary
    });

    try {
        const result = await generateJSON<any>(prompt, undefined);
        logs.push(`[Producer] Proposal generated: ${result.title} (${result.priority})`);
        
        // Decide whether to go to consensus
        const next = (result.priority === 'high' && context.projectId) ? 'consensus' : 'finalize';
        
        return {
            next,
            updates: { proposal: result },
            logs
        };
    } catch (error) {
        logs.push(`[Producer] Error generating proposal: ${error}`);
        return {
            next: 'finalize',
            updates: { 
                proposal: {
                    title: "Quality Check",
                    description: "Broadcast looks stable. Keep up the energy!",
                    priority: "low"
                }
            },
            logs
        };
    }
};

/**
 * Node 2: Board Consensus (Specialist Review)
 */
const consensusNode: WorkflowNode<DirectorContext> = async (context) => {
    const logs = ['[Board] High-priority proposal detected. Convening AI Board...'];
    
    if (!context.projectId || !context.proposal) {
        return { next: 'finalize', updates: {}, logs: ['[Board] Invalid context for consensus.'] };
    }

    const boardDecision = await consensusService.reachConsensus(
        context.projectId, 
        `Producer suggests: ${context.proposal.title}. ${context.proposal.description}`
    );

    context.proposal.logs = boardDecision.votes.map((v: any) => `[${v.persona}] ${v.vote.toUpperCase()}: ${v.reason}`);
    logs.push(...context.proposal.logs);

    if (boardDecision.result === 'rejected') {
        logs.push('[Board] Proposal REJECTED. Moving to Refinement.');
        return {
            next: 'refine', // Move to refinement instead of finalize
            updates: {
                consensus: boardDecision
            },
            logs
        };
    }

    logs.push('[Board] Proposal APPROVED.');
    context.proposal.title = `[Board Approved] ${context.proposal.title}`;
    
    return {
        next: 'finalize',
        updates: {
            consensus: boardDecision,
            finalDecision: context.proposal
        },
        logs
    };
};

/**
 * Node 2.5: Director Refinement
 */
const refineNode: WorkflowNode<DirectorContext> = async (context) => {
    const logs = ['[Director] Refining proposal based on Board feedback...'];
    
    const prompt = await promptService.get('studio/director_refine', {
        proposal: JSON.stringify(context.proposal),
        feedback: context.consensus?.debrief || 'Board suggested generic improvements.'
    });

    try {
        const refinedProposal = await generateJSON<any>(prompt, undefined);
        logs.push(`[Director] Refined proposal ready: ${refinedProposal.title}`);
        
        return {
            next: 'finalize',
            updates: {
                proposal: refinedProposal,
                finalDecision: refinedProposal
            },
            logs
        };
    } catch (error) {
        logs.push(`[Director] Refinement failed: ${error}. Using fallback.`);
        return { next: 'finalize', updates: {}, logs };
    }
};

/**
 * Node 3: Finalize
 */
const finalizeNode: WorkflowNode<DirectorContext> = async (context) => {
    const decision = context.finalDecision || context.proposal;
    return {
        next: null,
        updates: { finalDecision: decision },
        logs: ['[Director] Decision locked. Streaming to Producer.']
    };
};

/**
 * Director Workflow Orchestrator
 */
export class DirectorWorkflow {
    private engine: WorkflowEngine<DirectorContext>;

    constructor() {
        this.engine = new WorkflowEngine<DirectorContext>({
            nodes: {
                proposal: proposalNode,
                consensus: consensusNode,
                refine: refineNode,
                finalize: finalizeNode
            },
            initialNode: 'proposal'
        });
    }

    public async run(initialContext: Partial<DirectorContext>): Promise<DirectorContext> {
        const fullContext: DirectorContext = {
            userId: '',
            studioState: {
                vibe: {},
                engagement: {},
                chatSummary: '',
                activeScene: 'Main'
            },
            logs: [],
            ...initialContext
        } as DirectorContext;

        return await this.engine.execute(fullContext);
    }
}

export const directorWorkflow = new DirectorWorkflow();
