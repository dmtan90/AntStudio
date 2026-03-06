import { reactive } from 'vue';
import { neuralShowrunner } from './NeuralShowrunner';

export interface ViralMoment {
    id: string;
    timestamp: number;
    segmentTitle: string;
    reason: string;
    hypeScore: number;
    transcriptSnippet: string;
}

export interface SessionRecap {
    id: string;
    title: string;
    summary: string;
    highlights: string[];
    performanceScore: number;
    timestamp: number;
}

/**
 * Orchestrates autonomous session recaps and highlight extraction.
 */
export class RecapOrchestrator {
    public state = reactive({
        moments: [] as ViralMoment[],
        currentRecap: null as SessionRecap | null,
        isRecapping: false
    });

    /**
     * Records a significant moment during the stream for later recap.
     */
    public recordMoment(reason: string, hypeScore: number, snippet: string) {
        const moment: ViralMoment = {
            id: `moment_${Date.now()}`,
            timestamp: Date.now(),
            segmentTitle: neuralShowrunner.active.segments[neuralShowrunner.active.currentSegmentIndex]?.title || 'Unknown',
            reason,
            hypeScore,
            transcriptSnippet: snippet
        };

        this.state.moments.push(moment);
        console.log(`[RecapOrchestrator] Recorded viral moment: ${reason} (Hype: ${hypeScore})`);
        
        // Trigger auto-highlight if hype is exceptionally high
        if (hypeScore > 0.9) {
            this.triggerAutoHighlight(moment);
        }
    }

    /**
     * Triggers a Gemini-powered session recap.
     */
    public async generateFullRecap() {
        if (this.state.moments.length === 0) return;

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
                this.state.currentRecap = {
                    id: `recap_${Date.now()}`,
                    title: res.data.title || 'Session Deep Dive',
                    summary: res.data.summary || 'A fascinating journey through AI-driven debates.',
                    highlights: res.data.highlights || [],
                    performanceScore: res.data.performanceScore || 85,
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            console.warn('[RecapOrchestrator] Recap generation failed.');
        } finally {
            this.state.isRecapping = false;
        }
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
