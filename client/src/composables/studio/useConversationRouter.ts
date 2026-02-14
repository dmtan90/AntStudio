import { ref, reactive, computed } from 'vue';
import { LiveChatConnection } from './useLiveChatManager';

export interface RouteDecision {
    targetId: string;
    confidence: number;
    reason: 'direct_address' | 'topic_match' | 'turn_taking' | 'random';
}

export function useConversationRouter() {
    // Configuration
    const config = reactive({
        directAddressConfidence: 1.0,
        topicMatchConfidence: 0.7,
        turnTakingConfidence: 0.5,
        minConfidenceThreshold: 0.4
    });

    /**
     * Parse message to find direct addressing patterns
     */
    const detectDirectAddressing = (message: string, connections: Record<string, LiveChatConnection>): string | null => {
        const lowerMsg = message.toLowerCase();
        
        for (const [id, connection] of Object.entries(connections)) {
            const name = connection.persona.name.toLowerCase();
            
            // Patterns: "Hey Pachan", "@Pachan", "Pachan, what do you think?"
            const patterns = [
                `hey ${name}`,
                `hi ${name}`,
                `hello ${name}`,
                `@${name}`,
                `${name},`,
                `${name}?`,
                ` ${name} `
            ];

            if (patterns.some(p => lowerMsg.includes(p))) {
                return id;
            }
        }
        return null;
    };

    /**
     * Analyze message content to match with VTuber expertise/personality
     * (Placeholder for more advanced NLP or keyword matching)
     */
    const detectTopicMatch = (message: string, connections: Record<string, LiveChatConnection>): string | null => {
        const lowerMsg = message.toLowerCase();
        let bestMatchId: string | null = null;
        let maxKeywords = 0;

        for (const [id, connection] of Object.entries(connections)) {
            const keywords = connection.persona.meta?.keywords || []; // Assuming persona has keywords
            let matchCount = 0;
            
            keywords.forEach((kw: string) => {
                if (lowerMsg.includes(kw.toLowerCase())) {
                    matchCount++;
                }
            });

            if (matchCount > maxKeywords) {
                maxKeywords = matchCount;
                bestMatchId = id;
            }
        }

        return maxKeywords > 0 ? bestMatchId : null;
    };

    /**
     * Decide which VTuber should respond to a message
     */
    const routeMessage = (
        message: string, 
        connections: Record<string, LiveChatConnection>,
        lastSpeakerId?: string
    ): RouteDecision[] => {
        const decisions: RouteDecision[] = [];
        const connectedIds = Object.keys(connections).filter(id => connections[id].isConnected);

        if (connectedIds.length === 0) return [];

        // 1. Direct Addressing (Highest Priority)
        const addressedId = detectDirectAddressing(message, connections);
        if (addressedId && connections[addressedId]?.isConnected) {
            decisions.push({
                targetId: addressedId,
                confidence: config.directAddressConfidence,
                reason: 'direct_address'
            });
            // If directly addressed, we might stop here or allow others to chip in later
            return decisions; 
        }

        // 2. Topic Matching
        const topicId = detectTopicMatch(message, connections);
        if (topicId && connections[topicId]?.isConnected && topicId !== lastSpeakerId) {
            decisions.push({
                targetId: topicId,
                confidence: config.topicMatchConfidence,
                reason: 'topic_match'
            });
        }

        // 3. Round Robin / Turn Taking (Fallback)
        // If no one is addressed and no topic match, pick someone who hasn't spoken recently
        // For now, simple random excluding last speaker if possible
        if (decisions.length === 0) {
            const candidates = connectedIds.filter(id => id !== lastSpeakerId);
            const target = candidates.length > 0 
                ? candidates[Math.floor(Math.random() * candidates.length)] 
                : connectedIds[Math.floor(Math.random() * connectedIds.length)]; // Fallback to anyone
            
            if (target) {
                decisions.push({
                    targetId: target,
                    confidence: config.turnTakingConfidence,
                    reason: 'turn_taking'
                });
            }
        }

        return decisions;
    };

    /**
     * Determine if a message implies a multi-party response
     */
    const isMultiResponseTrigger = (message: string): boolean => {
        const patterns = [
            /what do you (all|guys) think/i,
            /everyone/i,
            /any of you/i,
            /thoughts\?/i
        ];
        return patterns.some(p => p.test(message));
    };

    return {
        routeMessage,
        isMultiResponseTrigger
    };
}
