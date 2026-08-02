import { generateJSON } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from './PromptService.js';

export interface AgentDecision {
    agentId: string;
    persona: string;
    vote: 'approve' | 'reject' | 'abstain';
    reason: string;
    weight: number;
}

/**
 * ConsensusService: Handles agent decision-making.
 * Uses Gemini 2.0 Flash to reach a final decision from multiple internal agents.
 */
export class ConsensusService {
    private agentMatrix = [
        { id: 'vision', name: 'Vision Agent', template: 'ai/consensus_vision', weight: 2 },
        { id: 'commerce', name: 'Commerce Agent', template: 'ai/consensus_commerce', weight: 3 },
        { id: 'retention', name: 'Retention Agent', template: 'ai/consensus_retention', weight: 2 },
        { id: 'safety', name: 'Safety Agent', template: 'ai/consensus_safety', weight: 5 }
    ];

    constructor() {}

    /**
     * Synthesizes agent outputs into a final consensus action.
     */
    public async reachConsensus(projectId: string, proposal: string): Promise<{ result: 'approved' | 'rejected', debrief: string, votes: AgentDecision[] }> {
        Logger.info(`⚖️ [Consensus] Evaluating proposal for ${projectId}: ${proposal}`, 'ConsensusService');

        const votes: AgentDecision[] = await Promise.all(this.agentMatrix.map(async (agent) => {
            const prompt = await promptService.get(agent.template, { proposal });

            try {
                const data = await generateJSON(prompt, undefined, {
                    systemPrompt: `You are ${agent.name}.`
            });

                return { agentId: agent.id, persona: agent.name, ...data, weight: agent.weight };
        } catch (error: any) {
                Logger.error(`[Consensus] Agent ${agent.name} failed:`, error.message);
                return { agentId: agent.id, persona: agent.name, vote: 'abstain' as const, reason: 'Error in reasoning', weight: agent.weight };
            }
        }));

        // Calculate weighted result
        let score = 0;
        votes.forEach(v => {
            if (v.vote === 'approve') score += v.weight;
            else if (v.vote === 'reject') score -= v.weight;
        });

        const result = score > 0 ? 'approved' : 'rejected';
        const debrief = votes.map(v => `[${v.persona}] ${v.vote.toUpperCase()}: ${v.reason}`).join('\n');

        Logger.info(`✅ [Consensus] Final Decision: ${result.toUpperCase()} (Score: ${score})`, 'ConsensusService');

        return { result, debrief, votes };
    }
}

export const consensusService = new ConsensusService();
