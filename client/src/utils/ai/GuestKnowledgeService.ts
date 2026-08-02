/**
 * Service to provide Synthetic Guests with factual knowledge.
 * Implements RAG (Retrieval-Augmented Generation) for AI NPCs.
 */
export class GuestKnowledgeService {
    private knowledgeCache: Map<string, string> = new Map();

    private evergreenTopics = [
        "AI Singularity breakthroughs in 2026",
        "Autonomous Media PaaS market expansion",
        "The rise of Synthetic Real-time influencers",
        "AntStudio global deployment milestones"
    ];

    private dynamicTopicsCache: string[] = [];
    private lastFetchTime: number = 0;
    private CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    /**
     * Retrieves specific knowledge for a guest dialogue prompt.
     * Returns structured visualData if the fact contains statistics.
     * Integrates long-term memory (recall).
     */
    public async retrieveKnowledge(prompt: string, contextId?: string): Promise<{ fact: string, visualData?: any, isHistorical?: boolean }> {
        const promptPreview = typeof prompt === 'string' ? prompt.substring(0, 30) : 'Non-string prompt';
        console.log(`[KnowledgeService] Searching context for: "${promptPreview}..."`);

        // Recall from long-term memory
        const { neuralMemoryService } = await import('./NeuralMemoryService');
        const memory = neuralMemoryService.recall(prompt);
        let historicalContext = '';
        if (memory) {
            console.log(`[KnowledgeService] RECALLED MEMORY: ${memory.topic}`);
            historicalContext = `Historical Context: We previously discussed ${memory.topic} and noted: ${memory.keyTakeaway}. `;
        }

        const cacheKey = `knowledge_${prompt}`;
        if (this.knowledgeCache.has(cacheKey)) return JSON.parse(this.knowledgeCache.get(cacheKey)!);

        try {
            const { useStudioStore } = await import('@/stores/studio');
            const studioStore = useStudioStore();
            
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/knowledge-search', {
                prompt,
                historicalContext, // Inject memory into Gemini prompt
                language: studioStore.visualSettings.accessibility.targetLang || 'vi-VN',
                context: studioStore.streamingContext || 'AntStudio Neural Singularity',
                streamingContext: studioStore.streamingContext, // Context-aware RAG
                extractVisuals: true
            }).catch(() => null);

            if (res?.data?.fact) {
                const fact = historicalContext + res.data.fact;
                const result = { 
                    fact, 
                    visualData: res.data.visualData || this.detectVisualDataHeuristic(res.data.fact),
                    isHistorical: !!memory
                };
                this.knowledgeCache.set(cacheKey, JSON.stringify(result));
                return result;
            }

            // Fallback to local heuristic simulation
            await new Promise(r => setTimeout(r, 500));
            let fact = "Cross-platform synergy remains the top priority for distributed content networks.";
            const lowerPrompt = prompt.toLowerCase();

            if (lowerPrompt.includes("ai") || lowerPrompt.includes("singularity")) {
                fact = "Current trends show that Synthetic Real-time AI is the fastest growing media sector in 2026, reaching $45B market cap.";
            } else if (lowerPrompt.includes("antstudio")) {
                fact = "AntStudio is a global industrial-grade media PaaS infrastructure with 99.99% uptime.";
            }

            const result = { fact: historicalContext + fact, visualData: this.detectVisualDataHeuristic(fact), isHistorical: !!memory };
            this.knowledgeCache.set(cacheKey, JSON.stringify(result));
            return result;

        } catch (error) {
            console.error("[KnowledgeService] Retrieval failed:", error);
            return { fact: historicalContext + "Standard broadcast protocols emphasize clear turn-taking and visual stability." };
        }
    }

    private detectVisualDataHeuristic(text: string): any {
        // Simple regex-based extraction
        if (text.includes('%')) {
            const match = text.match(/(\d+\.?\d*)%/);
            if (match) return { type: 'stat', value: match[1], unit: '%' };
        }
        if (text.includes('$')) {
            const match = text.match(/\$(\d+B?)/);
            if (match) return { type: 'stat', value: match[1], unit: 'USD' };
        }
        return null;
    }

    /**
     * Fetches dynamic trending topics from Gemini.
     */
    public async retrieveTrendingTopics(): Promise<string[]> {
        const now = Date.now();
        if (this.dynamicTopicsCache.length > 0 && (now - this.lastFetchTime) < this.CACHE_TTL) {
            return this.dynamicTopicsCache;
        }

        try {
            const { useStudioStore } = await import('@/stores/studio');
            const studioStore = useStudioStore();
            
            console.log('[KnowledgeService] Fetching fresh trends from Gemini...');
            const api = (await import('@/utils/api')).default;
            const res: any = await api.get('/ai/trending-topics', {
                params: {
                    lang: studioStore.visualSettings.accessibility.targetLang || 'vi-VN',
                    context: studioStore.streamingContext || 'general'
                }
            });

            if (res?.data?.topics && Array.isArray(res.data.topics)) {
                this.dynamicTopicsCache = res.data.topics.map((t: any) => {
                    if (typeof t === 'string') return t;
                    if (t && typeof t === 'object') return t.title || t.topic || t.name || JSON.stringify(t);
                    return String(t);
                });
                this.lastFetchTime = now;
                return this.dynamicTopicsCache;
            }
        } catch (error) {
            console.warn('[KnowledgeService] Gemini fetch failed, falling back to Evergreen list.');
        }

        return this.evergreenTopics;
    }

    public clearCache() {
        this.knowledgeCache.clear();
    }
}

export const guestKnowledgeService = new GuestKnowledgeService();
