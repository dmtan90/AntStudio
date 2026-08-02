import { reactive } from 'vue';

export interface NeuralLearning {
    topic: string;
    keyTakeaway: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'controversial';
    timestamp: number;
    mentions: number;
}

export interface GuestRelationship {
    guestA: string;
    guestB: string;
    affinity: number; // -100 to 100
    lastInteraction: string;
}

/**
 * Service to handle long-term persistence of AI "Learnings" and character history.
 */
export class NeuralMemoryService {
    private STORAGE_KEY = 'antstudio_neural_memory';
    
    public state = reactive({
        learnings: [] as NeuralLearning[],
        relationships: [] as GuestRelationship[],
        hasLoaded: false
    });

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Records a new piece of knowledge learned during a live session.
     */
    public recordLearning(topic: string, takeaway: string, sentiment: any = 'neutral') {
        if (typeof topic !== 'string') {
            console.warn('[NeuralMemory] Attempted to record non-string topic:', topic);
            return;
        }
        
        const existing = this.state.learnings.find(l => l.topic.toLowerCase() === topic.toLowerCase());
        
        if (existing) {
            existing.mentions++;
            existing.keyTakeaway = takeaway; // Update with latest
            existing.timestamp = Date.now();
        } else {
            this.state.learnings.push({
                topic,
                keyTakeaway: takeaway,
                sentiment,
                timestamp: Date.now(),
                mentions: 1
            });
        }
        
        this.saveToStorage();
    }

    /**
     * Records major production events for AI awareness.
     */
    public recordEvent(type: string, description: string) {
        console.log(`[NeuralMemory] RECORDING EVENT: ${type} - ${description}`);
        this.recordLearning(`Production: ${type}`, description, 'neutral');
    }

    /**
     * Updates affinity between two guests.
     */
    public updateRelationship(idA: string, idB: string, delta: number, lastInteraction: string) {
        const key = [idA, idB].sort().join('_');
        let rel = this.state.relationships.find(r => [r.guestA, r.guestB].sort().join('_') === key);
        
        if (!rel) {
            rel = { guestA: idA, guestB: idB, affinity: 0, lastInteraction: '' };
            this.state.relationships.push(rel);
        }
        
        rel.affinity = Math.max(-100, Math.min(100, rel.affinity + delta));
        rel.lastInteraction = lastInteraction;
        this.saveToStorage();
    }

    /**
     * Search memory for a specific topic.
     */
    public recall(topic: string): NeuralLearning | undefined {
        if (typeof topic !== 'string') return undefined;
        
        const lowerTopic = topic.toLowerCase();
        return this.state.learnings.find(l => {
            if (typeof l.topic !== 'string') return false;
            const lowerLTopic = l.topic.toLowerCase();
            return lowerTopic.includes(lowerLTopic) || lowerLTopic.includes(lowerTopic);
        });
    }

    /**
     * Synthesizes a context-aware memory string for AI Directive injection.
     * Looks for 2-3 most relevant past learnings.
     */
    public getDeepRecallContext(currentTopic: string): string | null {
        if (typeof currentTopic !== 'string' || this.state.learnings.length === 0) return null;

        const lowerCurrent = currentTopic.toLowerCase();
        const related = this.state.learnings
            .filter(l => {
                if (typeof l.topic !== 'string') return false;
                const lowerLTopic = l.topic.toLowerCase();
                return lowerCurrent.includes(lowerLTopic) || lowerLTopic.includes(lowerCurrent);
            })
            .sort((a, b) => b.mentions - a.mentions)
            .slice(0, 2);

        if (related.length === 0) return null;

        return `Recall from past sessions: ${related.map(r => `${r.topic} (${r.keyTakeaway})`).join('. ')}`;
    }

    private saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                learnings: this.state.learnings,
                relationships: this.state.relationships
            }));
        } catch (e) {
            console.error('[NeuralMemory] Save failed:', e);
        }
    }

    private loadFromStorage() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.state.learnings = parsed.learnings || [];
                this.state.relationships = parsed.relationships || [];
            }
        } catch (e) {
            console.warn('[NeuralMemory] Load failed or empty.');
        } finally {
            this.state.hasLoaded = true;
        }
    }
}

export const neuralMemoryService = new NeuralMemoryService();
