import { guestKnowledgeService } from './GuestKnowledgeService';
import { neuralFactChecker } from './NeuralFactChecker';
import { useStudioStore } from '@/stores/studio';

export interface ResearchInsight {
    topic: string;
    fact: string;
    confidence: number;
    source?: string;
    visualData?: any;
    timestamp: number;
}

/**
 * NeuralResearchService: Specialized service for autonomous research pulses
 * and real-time knowledge synthesis across all streaming contexts.
 */
export class NeuralResearchService {
    private static instance: NeuralResearchService;
    private activeResearch: ResearchInsight[] = [];

    private constructor() {}

    public static getInstance(): NeuralResearchService {
        if (!NeuralResearchService.instance) {
            NeuralResearchService.instance = new NeuralResearchService();
        }
        return NeuralResearchService.instance;
    }

    /**
     * Triggers a focused research pulse. 
     * If topic is provided, researches that specifically. 
     * Otherwise, fetches trending topics relative to the session context.
     */
    public async performResearchPulse(specificTopic?: string): Promise<ResearchInsight | null> {
        const studioStore = useStudioStore();
        const targetTopic = specificTopic || (await this.getTrendingTopic());
        
        if (!targetTopic) return null;

        console.log(`[NeuralResearch] Starting pulse for: ${targetTopic}`);

        try {
            const { fact, visualData } = await guestKnowledgeService.retrieveKnowledge(targetTopic);
            const verification = await neuralFactChecker.verifyClaim(fact, targetTopic);

            if (!verification.isValid || verification.confidence < 0.7) {
                console.warn(`[NeuralResearch] Verification failed for topic: ${targetTopic}`);
                return null;
            }

            const insight: ResearchInsight = {
                topic: targetTopic,
                fact,
                confidence: verification.confidence,
                source: verification.source,
                visualData,
                timestamp: Date.now()
            };

            this.activeResearch.unshift(insight);
            if (this.activeResearch.length > 10) this.activeResearch.pop();

            // Broadcast the insight to the UI (Overlays like News Ticker)
            this.broadcastInsight(insight);

            return insight;
        } catch (error) {
            console.error('[NeuralResearch] Pulse failed:', error);
            return null;
        }
    }

    private async getTrendingTopic(): Promise<string | null> {
        const topics = await guestKnowledgeService.retrieveTrendingTopics();
        if (!topics || topics.length === 0) return null;
        return topics[Math.floor(Math.random() * topics.length)];
    }

    private broadcastInsight(insight: ResearchInsight) {
        const studioStore = useStudioStore();

        // 1. Update News Ticker if in News mode
        if (studioStore.streamingContext === 'news') {
            const newsData = studioStore.contextData.news;
            const tickerItem = `${insight.topic.toUpperCase()}: ${insight.fact}`;
            if (!newsData.ticker.includes(tickerItem)) {
                newsData.ticker.unshift(tickerItem);
                if (newsData.ticker.length > 5) newsData.ticker.pop();
            }
        }

        // 2. Dispatch event for other services (Showrunner, Director)
        window.dispatchEvent(new CustomEvent('neural:research_insight', { detail: insight }));
    }

    public getLatestInsights() {
        return this.activeResearch;
    }
}

export const neuralResearchService = NeuralResearchService.getInstance();
