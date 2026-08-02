import { intentAnalyzer } from './IntentAnalyzer';

export interface AudienceSignal {
    type: 'intent_spike' | 'velocity_surge' | 'sentiment_shift';
    context: string;
    score: number;
    triggerText?: string;
    reason: string;
}

/**
 * Aggregates all audience signals (chat velocity, intent, vibe)
 * and fires events to trigger autonomous show pivots.
 */
export class AudienceIntelligenceService {
    private static instance: AudienceIntelligenceService;
    
    private chatBuffer: { text: string, timestamp: number }[] = [];
    private lastPivotTime = 0;
    private pivotCooldownMs = 60000; // At most 1 pivot per minute
    private listeners: ((signal: AudienceSignal) => void)[] = [];
    private ticker: ReturnType<typeof setInterval> | null = null;

    private constructor() {}

    public static getInstance(): AudienceIntelligenceService {
        if (!AudienceIntelligenceService.instance) {
            AudienceIntelligenceService.instance = new AudienceIntelligenceService();
        }
        return AudienceIntelligenceService.instance;
    }

    public start() {
        if (this.ticker) return;
        // Analyze signals every 5 seconds
        this.ticker = setInterval(() => this.analyzeSignals(), 5000);
        console.log('[AudienceIntelligence] Active. Monitoring audience signals.');
    }

    public stop() {
        if (this.ticker) {
            clearInterval(this.ticker);
            this.ticker = null;
        }
    }

    /**
     * Feed incoming chat messages into the buffer.
     */
    public ingestChatMessage(text: string) {
        this.chatBuffer.push({ text, timestamp: Date.now() });
        // Keep only the last 60 seconds of messages
        const cutoff = Date.now() - 60000;
        this.chatBuffer = this.chatBuffer.filter(m => m.timestamp > cutoff);
    }

    /**
     * Subscribe to significant audience signal events.
     */
    public onSignal(callback: (signal: AudienceSignal) => void) {
        this.listeners.push(callback);
    }

    private async analyzeSignals() {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const ctx = studioStore.streamingContext || 'general';

        const now = Date.now();

        // 1. Chat Velocity: messages in the last 10 seconds
        const recentMessages = this.chatBuffer.filter(m => now - m.timestamp < 10000);
        const velocity = recentMessages.length; // msgs in last 10s

        // 2. Intent Score: aggregate from recent chat
        const combinedText = recentMessages.map(m => m.text).join(' ');
        const intentScore = intentAnalyzer.analyzeContextSignal(combinedText, ctx);
        const sensitivity = intentAnalyzer.getContextSensitivity(ctx);

        // 3. Detect velocity surge (>8 messages in 10s = surge)
        if (velocity >= 8) {
            const trendingKeyword = this.extractTrendingKeyword(recentMessages.map(m => m.text));
            this.fireSignal({
                type: 'velocity_surge',
                context: ctx,
                score: Math.min(1, velocity / 15),
                triggerText: trendingKeyword,
                reason: `Chat velocity surge: ${velocity} messages in 10s`
            });
        }

        // 4. Detect intent spike
        if (intentScore >= sensitivity.threshold && now - this.lastPivotTime > this.pivotCooldownMs) {
            this.lastPivotTime = now;
            this.fireSignal({
                type: 'intent_spike',
                context: ctx,
                score: intentScore,
                triggerText: combinedText.substring(0, 100),
                reason: sensitivity.pivotReason
            });
        }
    }

    private extractTrendingKeyword(texts: string[]): string {
        const wordCounts: Record<string, number> = {};
        texts.join(' ').toLowerCase().split(/\s+/).forEach(word => {
            if (word.length > 3) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
        const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || 'trending topic';
    }

    private fireSignal(signal: AudienceSignal) {
        console.log(`[AudienceIntelligence] SIGNAL FIRED: ${signal.type} (${signal.reason})`);
        this.listeners.forEach(cb => cb(signal));
        window.dispatchEvent(new CustomEvent('audience:signal', { detail: signal }));
    }
}

export const audienceIntelligenceService = AudienceIntelligenceService.getInstance();
