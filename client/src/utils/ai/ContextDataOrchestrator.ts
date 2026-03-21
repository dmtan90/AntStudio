import { useStudioStore } from '@/stores/studio';

/**
 * ContextDataOrchestrator: Centralized logic to map live transcripts and events 
 * to context-specific overlay data (scores, tickers, prices, etc).
 */
export class ContextDataOrchestrator {
    private static instance: ContextDataOrchestrator;
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): ContextDataOrchestrator {
        if (!ContextDataOrchestrator.instance) {
            ContextDataOrchestrator.instance = new ContextDataOrchestrator();
        }
        return ContextDataOrchestrator.instance;
    }

    /**
     * Initializes the orchestrator and listens for transcription events.
     */
    public async initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log('[ContextOrchestrator] Initialized and listening for transcript pulses.');

        window.addEventListener('ai:transcription', (e: any) => {
            const { text } = e.detail;
            if (text) this.processTranscript(text);
        });
        
        // Listen for specific autonomous events that might update data
        window.addEventListener('studio:context_update', (e: any) => {
           this.handleDirectUpdate(e.detail);
        });

        // Phase 37: Listen for verified facts from FactCheckingService
        const { factCheckingService } = await import('./FactCheckingService');
        factCheckingService.on('fact:verified', (result: any) => {
            const studioStore = useStudioStore();
            if (studioStore.streamingContext === 'news') {
                studioStore.contextData.news.lastFactCheck = result;
            }
        });
    }

    /**
     * Parses the transcript for keywords and patterns relevant to the current context.
     */
    private processTranscript(text: string) {
        const studioStore = useStudioStore();
        const ctx = studioStore.streamingContext;
        if (!ctx) return;

        const lowerText = text.toLowerCase();

        switch (ctx) {
            case 'sport':
                this.extractSportData(lowerText);
                break;
            case 'news':
                this.extractNewsTicker(text); // Use raw text for news to preserve casing
                break;
            case 'sales':
                this.extractSalesIntent(lowerText);
                break;
            case 'education':
                this.extractEducationMetrics(lowerText);
                break;
            case 'commentary':
                this.extractCommentaryPulse(lowerText);
                break;
            case 'gaming':
                this.extractGamingData(lowerText);
                break;
            case 'talkshow':
                this.extractTalkShowScript(text);
                break;
            case 'gameshow':
                this.extractGameShowData(text);
                break;
            case 'music':
                this.extractMusicData(lowerText);
                break;
        }
    }

    private extractSportData(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.sport;

        // Pattern matching for scores: "3 to 1", "3 - 1", "Goal for LIV"
        const scoreMatch = text.match(/(\d+)\s*[-|to|:]\s*(\d+)/);
        if (scoreMatch) {
            data.homeScore = parseInt(scoreMatch[1]);
            data.awayScore = parseInt(scoreMatch[2]);
        }

        if (text.includes('possession')) {
            const posMatch = text.match(/possession\s*(?:is|at)?\s*(\d+)/);
            if (posMatch) data.possessionA = parseInt(posMatch[1]);
        }

        if (text.includes('goal') || text.includes('scored')) {
            // Logic to identify player or team could be added here
            data.time = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
        }
    }

    private async extractNewsTicker(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.news;

        // If a sentence looks like a news headline (long enough, ending in period/exclamation)
        if (text.length > 30 && (text.includes('BREAKING') || text.includes('Breaking') || text.includes('Update'))) {
            data.breaking = "LIVE UPDATE";
            if (!data.ticker.includes(text)) {
                data.ticker.unshift(text);
                if (data.ticker.length > 5) data.ticker.pop();
            }
        }

        // Phase 37: Trigger fact-check for substantial claims in news context
        if (text.length > 40 && !text.includes('?')) {
            const { factCheckingService } = await import('./FactCheckingService');
            factCheckingService.analyzeStatement(text, 'News Broadcast');
        }

        // Phase 38: Reactive Research Pulse for News Ticker
        if (text.includes('latest') || text.includes('trending') || text.includes('what is happening')) {
            const { neuralResearchService } = await import('./NeuralResearchService');
            neuralResearchService.performResearchPulse();
        }
    }

    private extractSalesIntent(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.sales;

        if (text.includes('sold out') || text.includes('gone')) {
            data.stockLeft = Math.max(0, data.stockLeft - 1);
        }
        
        if (text.includes('next product') || text.includes('coming up')) {
            data.nextProductIn = 60; // Reset countdown
        }
    }

    private extractEducationMetrics(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.education;

        if (text.includes('next slide') || text.includes('moving on')) {
            data.activeSlide++;
        }

        if (text.includes('new student') || text.includes('joined')) {
            data.studentCount++;
        }
    }

    private extractCommentaryPulse(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.commentary;
        
        if (text.includes('wow') || text.includes('incredible') || text.includes('crazy')) {
            data.momentum = Math.min(100, data.momentum + 10);
            data.reactions.push(text);
            if (data.reactions.length > 3) data.reactions.shift();
        }
    }

    private extractGamingData(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.gaming;
        
        if (text.includes('hype') || text.includes('insane') || text.includes('clutch')) {
            data.excitement = Math.min(100, data.excitement + 5);
        }
        if (text.includes('lag') || text.includes('fps')) {
            data.fps = 120 + Math.floor(Math.random() * 24);
        }
    }

    private extractTalkShowScript(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.talkshow;
        
        // Push to script feed
        if (text.length > 20) {
            data.script.push({ speaker: 'HOST', text });
            if (data.script.length > 5) data.script.shift();
        }
    }

    private extractGameShowData(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.gameshow;
        
        if (text.includes('question') || text.includes('next')) {
            data.timer = 30;
            data.currentQuestion = text;
        }
        if (text.includes('congratulations') || text.includes('prize')) {
            data.prize += 500;
        }
    }

    private extractMusicData(text: string) {
        const studioStore = useStudioStore();
        const data = studioStore.contextData.music;
        
        if (text.includes('next track') || text.includes('play')) {
            const nextMatch = text.match(/play\s+(.+)/);
            if (nextMatch) {
                data.upNext = nextMatch[1].toUpperCase();
            }
        }
    }

    private handleDirectUpdate(payload: any) {
        const studioStore = useStudioStore();
        const { context, key, value } = payload;
        
        if (studioStore.contextData[context]) {
            studioStore.contextData[context][key] = value;
        }
    }
}

export const contextDataOrchestrator = ContextDataOrchestrator.getInstance();
