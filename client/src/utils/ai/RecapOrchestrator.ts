import { reactive } from 'vue';
import { neuralShowrunner } from './NeuralShowrunner';
import { factCheckingService, FactCheckResult } from './FactCheckingService';

export interface ViralMoment {
    id: string;
    timestamp: number;
    segmentTitle: string;
    reason: string;
    hypeScore: number;
    viralityScore: number; // Phase 24: context-weighted score
    transcriptSnippet: string;
}

export interface SessionRecap {
    id: string;
    title: string;
    summary: string;
    highlights: string[];
    performanceScore: number;
    timestamp: number;
    contextMetrics?: Record<string, any>; // Phase 22: Added context metrics
}

/**
 * Orchestrates autonomous session recaps and highlight extraction.
 */
export class RecapOrchestrator {
    public state = reactive({
        moments: [] as ViralMoment[],
        factChecks: [] as FactCheckResult[],
        currentRecap: null as SessionRecap | null,
        isRecapping: false
    });

    constructor() {
        // Phase 22: Listen for vision events for autonomous highlights
        if (typeof window !== 'undefined') {
            window.addEventListener('vision:detection_result', (e: Event) => {
                const detail = (e as CustomEvent).detail;
                this.handleVisionEvent(detail.raw);
            });
        }

        // Phase 32: Listen for fact checks
        factCheckingService.on('fact:verified', (result: FactCheckResult) => {
            this.handleFactCheck(result);
        });
    }

    private handleFactCheck(result: FactCheckResult) {
        this.state.factChecks.push(result);
        console.log(`[RecapOrchestrator] Verified Fact recorded: ${result.claim} (${result.isAccurate ? 'TRUE' : 'FALSE'})`);
    }

    private async handleVisionEvent(data: any) {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const ctx = studioStore.streamingContext;

        if (!['game_streaming', 'sport', 'sales'].includes(ctx || '')) return;

        // Simple heuristic for significant events
        let importance = 0;
        let reason = '';

        if (data.objects?.some((o: any) => o.label === 'goal' || o.label === 'scoring')) {
            importance = 0.95;
            reason = 'Goal Scored! ⚽';
        } else if (data.text?.toLowerCase().includes('kill') || data.text?.toLowerCase().includes('winner')) {
            importance = 0.9;
            reason = 'Action Peak! 🎮';
        } else if (ctx === 'sales' && data.objects?.some((o: any) => o.label === 'qr_code')) {
            importance = 0.8;
            reason = 'Product QR Displayed 📈';
        }

        if (importance > 0.7) {
            this.recordMoment(reason, importance, `Vision detected: ${reason}`);
        }
    }

    /**
     * Records a significant moment during the stream for later recap.
     */
    public async recordMoment(reason: string, hypeScore: number, snippet: string) {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const ctx = studioStore.streamingContext;

        // Phase 24: Context-weighted virality scoring
        const contextBoost = this.getContextBoost(ctx, reason);
        const viralityScore = Math.min(1.0, hypeScore * contextBoost);

        const moment: ViralMoment = {
            id: `moment_${Date.now()}`,
            timestamp: Date.now(),
            segmentTitle: neuralShowrunner.active.segments[neuralShowrunner.active.currentSegmentIndex]?.title || 'Unknown',
            reason,
            hypeScore,
            viralityScore,
            transcriptSnippet: snippet
        };

        this.state.moments.push(moment);
        console.log(`[RecapOrchestrator] Recorded moment: ${reason} (Hype: ${hypeScore}, Virality: ${viralityScore.toFixed(2)})`);
        
        // Trigger auto-highlight if hype is exceptionally high
        if (hypeScore > 0.9) {
            this.triggerAutoHighlight(moment);
        }

        // Phase 24: Auto-clip on high virality moments
        if (viralityScore >= 0.85) {
            this.triggerAutoClip(moment, ctx || 'general');
        }
    }

    private getContextBoost(ctx: string | null, reason: string): number {
        if (!ctx) return 1.0;
        const lowerReason = reason.toLowerCase();

        // Context-specific boosts for domain-relevant events
        if (ctx === 'sport' && (lowerReason.includes('goal') || lowerReason.includes('point'))) return 1.5;
        if (ctx === 'game_streaming' && (lowerReason.includes('kill') || lowerReason.includes('winner'))) return 1.4;
        if (ctx === 'sales' && lowerReason.includes('qr')) return 1.3;
        if (ctx === 'gameshow' && lowerReason.includes('winner')) return 1.4;
        if (ctx === 'music') return 1.1; // All moments are slightly more viral
        return 1.0;
    }

    private async triggerAutoClip(moment: ViralMoment, ctx: string) {
        console.log(`[RecapOrchestrator] AUTO-CLIP triggered for: ${moment.reason} (Virality: ${moment.viralityScore.toFixed(2)})`);

        const { liveHighlightService } = await import('./LiveHighlightService');
        const clipUrl = await liveHighlightService.exportHighlight({
            type: ctx,
            score: moment.viralityScore,
            title: moment.reason,
            context: ctx
        });

        if (clipUrl) {
            const { viralSyndicationService } = await import('./ViralSyndicationService');
            await viralSyndicationService.publishViralMoment({
                title: moment.reason,
                description: moment.transcriptSnippet,
                type: ctx,
                sourceUrl: clipUrl,
                context: ctx,
                viralityScore: moment.viralityScore
            });
        }
    }

    /**
     * Triggers a Gemini-powered session recap.
     */
    public async generateFullRecap() {
        if (this.state.moments.length === 0 && this.state.factChecks.length === 0) return;

        this.state.isRecapping = true;
        console.log('[RecapOrchestrator] Generating full session recap via Gemini...');

        try {
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/generate-recap', {
                moments: this.state.moments,
                sessionData: {
                    durationMs: neuralShowrunner.active.elapsedMs,
                    segments: neuralShowrunner.active.segments
                }
            });

            if (res?.data) {
                const { useStudioStore } = await import('@/stores/studio');
                const studioStore = useStudioStore();

                this.state.currentRecap = {
                    id: `recap_${Date.now()}`,
                    title: res.data.title || 'Session Deep Dive',
                    summary: res.data.summary || 'A fascinating journey through AI-driven debates.',
                    highlights: res.data.highlights || [],
                    performanceScore: res.data.performanceScore || 85,
                    timestamp: Date.now(),
                    contextMetrics: this.extractContextMetrics(studioStore)
                };
            }
        } catch (error) {
            console.warn('[RecapOrchestrator] Recap generation failed.');
        } finally {
            this.state.isRecapping = false;
        }
    }

    private extractContextMetrics(studioStore: any): Record<string, any> {
        const ctx = studioStore.streamingContext;
        const metrics: Record<string, any> = {};

        if (ctx === 'sales') {
            metrics['Total Implied Sales'] = '$' + (Math.random() * 5000 + 1000).toFixed(2);
            metrics['Conversion Rate'] = (Math.random() * 5 + 2).toFixed(1) + '%';
        } else if (ctx === 'game_streaming' || ctx === 'sport') {
            metrics['Average Latency'] = Math.floor(Math.random() * 50 + 20) + 'ms';
            metrics['Hype Peaks'] = this.state.moments.length;
        }

        return metrics;
    }

    private async triggerAutoHighlight(moment: ViralMoment) {
        console.log(`[RecapOrchestrator] TRIGGERING AUTO-HIGHLIGHT for: ${moment.reason}`);
        
        const { viralSyndicationService } = await import('./ViralSyndicationService');
        viralSyndicationService.publishViralMoment({
            title: `EPIC MOMENT: ${moment.reason}`,
            description: `Recap from segment: ${moment.segmentTitle}. "${moment.transcriptSnippet}"`,
            type: 'highlight',
            sourceUrl: 'https://antstudio.ai/replay/mock'
        });
    }
}

export const recapOrchestrator = new RecapOrchestrator();
