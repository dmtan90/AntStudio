import { reactive } from 'vue';

export interface EvidenceCard {
    id: string;
    type: 'stat' | 'chart' | 'table' | 'website';
    title: string;
    description: string;
    data?: any; // For charts: { labels: [], values: [] }, For stats: { value: string, unit: string }
    sourceUrl?: string;
    timestamp: number;
    confidence: number;
}

/**
 * Service to manage real-time data visualizations (Infographics) on the stream.
 */
export class EvidenceOverlayService {
    public state = reactive({
        activeCards: [] as EvidenceCard[]
    });

    /**
     * Triggers a new evidence card to be shown on the stream.
     */
    public triggerEvidence(card: Partial<EvidenceCard>) {
        const newCard: EvidenceCard = {
            id: `ev_${Date.now()}`,
            type: card.type || 'stat',
            title: card.title || 'Data Insight',
            description: card.description || '',
            data: card.data,
            sourceUrl: card.sourceUrl,
            timestamp: Date.now(),
            confidence: card.confidence || 1.0
        };

        this.state.activeCards.push(newCard);
        
        // Emit event for StudioDirector/Compositor
        window.dispatchEvent(new CustomEvent('neural:evidence_pulse', { detail: newCard }));

        // Auto-clear after 25 seconds
        setTimeout(() => {
            this.clearCard(newCard.id);
        }, 25000);
    }

    public clearCard(id: string) {
        const idx = this.state.activeCards.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.state.activeCards.splice(idx, 1);
        }
    }
}

export const evidenceOverlayService = new EvidenceOverlayService();
