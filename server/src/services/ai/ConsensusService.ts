import { geminiPool } from '../../utils/gemini.js';
import { Logger } from '../../utils/Logger.js';


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
    public async reachConsensus(projectId: string, proposal: string): Promise<{ result: 'approved' | 'rejected', debrief: string, votes: AgentDecision[] }> {
        Logger.info(`⚖️ [Consensus] Evaluating proposal for ${projectId}: ${proposal}`, 'ConsensusService');

        const modelName = 'gemini-2.5-flash';
        const { client: ai } = await geminiPool.getOptimalClient(modelName);

        const votes: AgentDecision[] = await Promise.all(this.agentMatrix.map(async (agent) => {
            const prompt = `
                PROPOSAL: ${proposal}
                YOUR ROLE: ${agent.name} (${agent.persona})
                
                Evaluate this proposal. Should we approve it? 
                Return JSON format ONLY: { "vote": "approve" | "reject" | "abstain", "reason": "Short explanation" }
            `;

            try {
                const result = await (ai as any).models.generateContent({
                    model: modelName,
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        responseMimeType: 'application/json',
                        systemInstruction: `You are ${agent.name}. ${agent.persona}`
                    }
                });

                const data = JSON.parse(result.response.text());
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
