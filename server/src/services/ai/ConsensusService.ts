import { privateLLMClient } from '../../utils/ai/PrivateLLMClient.js';
import { systemLogger } from '../../utils/systemLogger.js';

export interface AgentDecision {
    agentId: string;
    persona: string;
    vote: 'approve' | 'reject' | 'abstain';
    reason: string;
    weight: number;
}

/**
 * Service for multi-agent consensus in Director decisions.
 */
export class ConsensusService {
    private agentMatrix = [
        { id: 'creative_01', name: 'Creative Director', persona: 'Focus on aesthetics, visual drama, and narrative flow.', weight: 1.5 },
        { id: 'tech_01', name: 'Technical Producer', persona: 'Focus on system stability, low latency, and efficient resource use.', weight: 1.0 },
        { id: 'revenue_01', name: 'Commercial Analyst', persona: 'Focus on viewer retention, product visibility, and conversion triggers.', weight: 1.2 }
    ];

    /**
     * Reaches a consensus on a proposed orchestration change.
     */
    public async reachConsensus(projectId: string, proposal: string): Promise<{ result: 'approved' | 'rejected', debrief: string }> {
        systemLogger.info(`⚖️ [Consensus] Evaluating proposal for ${projectId}: ${proposal}`, 'ConsensusService');

        const votes: AgentDecision[] = await Promise.all(this.agentMatrix.map(async (agent) => {
            const prompt = `
                PROPOSAL: ${proposal}
                YOUR ROLE: ${agent.name} (${agent.persona})
                
                Evaluate this proposal. Should we approve it? 
                Return JSON: { vote: "approve" | "reject" | "abstain", reason: "Short explanation" }
            `;

            // Use Private LLM for decentralized voting logic
            const response = await privateLLMClient.chat(prompt, { system: `You are ${agent.name}. ${agent.persona}` });
            try {
                const data = JSON.parse(response.match(/\{.*\}/s)?.[0] || '{"vote": "abstain", "reason": "Failed to parse"}');
                return { agentId: agent.id, persona: agent.name, ...data, weight: agent.weight };
            } catch {
                return { agentId: agent.id, persona: agent.name, vote: 'abstain', reason: 'Error in reasoning', weight: agent.weight };
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

        systemLogger.info(`✅ [Consensus] Final Decision: ${result.toUpperCase()} (Score: ${score})`, 'ConsensusService');

        return { result, debrief };
    }
}

export const consensusService = new ConsensusService();
