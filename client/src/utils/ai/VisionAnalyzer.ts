import api from '@/utils/api';
import { useStudioStore } from '@/stores/studio';

export class VisionAnalyzer {
    private static instance: VisionAnalyzer;
    private analysisInterval: any = null;
    private isAnalyzing = false;
    private captureIntervalValue = 30000; // 30 seconds default

    private constructor() {}

    public static getInstance(): VisionAnalyzer {
        if (!VisionAnalyzer.instance) {
            VisionAnalyzer.instance = new VisionAnalyzer();
        }
        return VisionAnalyzer.instance;
    }

    /**
     * Starts the periodic vision analysis loop.
     * @param canvas The canvas element to capture frames from.
     */
    public start(canvas: HTMLCanvasElement | null) {
        if (this.analysisInterval || !canvas) return;

        console.log('[VisionAnalyzer] Starting V2C Analysis loop...');
        this.analysisInterval = setInterval(() => {
            this.performAnalysis(canvas);
        }, this.captureIntervalValue);
    }

    public stop() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
    }

    private async performAnalysis(canvas: HTMLCanvasElement) {
        if (this.isAnalyzing) return;
        
        try {
            this.isAnalyzing = true;

            // 1. Capture Frame as Base64
            const snapshot = canvas.toDataURL('image/jpeg', 0.7);

            // 2. Send to Backend Vision API
            const studioStore = useStudioStore();
            const context = studioStore.streamingContext;

            let prompt = "Analyze this live stream frame. Identify any products being shown or held by the host. Return a JSON list of identified objects with names and short descriptions.";
            
            if (context === 'game_streaming') {
                prompt = "Analyze this gameplay frame. Identify the game, key items on screen, current score or status, and any notable events. Focus on reacting to the game state.";
            } else if (context === 'sport') {
                prompt = "Analyze this sports broadcast frame. Identify the sport, teams/players, current score, and game clock. Focus on providing tactical commentary.";
            } else if (context === 'sales') {
                prompt = "Analyze this shopping stream. Identify products, prices, and host gestures towards items. Focus on sales conversion opportunities.";
            } else if (context === 'talkshow' || context === 'commentary') {
                prompt = "Analyze the people and their expressions in this frame. Identify the emotional vibe and topics being discussed visually.";
            }
            
            const res = await api.post('/ai/vision/analyze', {
                image: snapshot,
                prompt: prompt
            });

            if (res.data) {
                console.log('[VisionAnalyzer] Detected:', res.data);
                
                // Dispatch event for VisionCommerceService to handle matching
                window.dispatchEvent(new CustomEvent('vision:detection_result', {
                    detail: { 
                        raw: res.data,
                        timestamp: Date.now()
                    }
                }));
            }

        } catch (error) {
            console.error('[VisionAnalyzer] Analysis failed:', error);
        } finally {
            this.isAnalyzing = false;
        }
    }
    
    public setCaptureInterval(ms: number) {
        this.captureIntervalValue = ms;
        // Restart if running
        if (this.analysisInterval) {
            this.stop();
            // We need the canvas reference, so this is just helper for next cycle
        }
    }
}

export const visionAnalyzer = VisionAnalyzer.getInstance();
