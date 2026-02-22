import { EventEmitter } from 'events';
import { GeminiClient } from '../../integrations/ai/GeminiClient.js';
import { socketServer } from '../SocketServer.js';
import { SHOW_PROFILES, ShowProfileType, ShowProfile } from '../../constants/ShowProfiles.js';
import { EmotionAnalysisService } from './EmotionAnalysisService.js';
import { TrendFetchService } from './TrendFetchService.js';

export interface ScriptStep {
    id: string;
    timestamp: number;
    description: string;
    agentId?: string; // Who is speaking/acting
    dialogue?: string;
    action?: string; // e.g. 'show_product', 'switch_scene'
    actionParams?: any;
    durationSeconds: number;
    status: 'pending' | 'active' | 'completed';
}

export interface LiveScript {
    id: string;
    profileId: ShowProfileType;
    title: string;
    steps: ScriptStep[];
    currentIndex: number;
    isRunning: boolean;
    createdAt: number;
}

class ShowRunnerService extends EventEmitter {
    private gemini: GeminiClient;
    private activeScript: LiveScript | null = null;
    private timer: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.gemini = new GeminiClient({});
    }

    public getProfiles(): ShowProfile[] {
        return Object.values(SHOW_PROFILES);
    }

    public getActiveScript(): LiveScript | null {
        return this.activeScript;
    }

    private detectVisualFX(text: string): string | undefined {
        const textLow = text.toLowerCase();
        if (textLow.includes('congratulations') || textLow.includes('win') || textLow.includes('celebrate') || textLow.includes('wow')) return 'confetti';
        if (textLow.includes('fire') || textLow.includes('hot') || textLow.includes('burn')) return 'fire';
        if (textLow.includes('ghost') || textLow.includes('scary') || textLow.includes('glitch')) return 'glitch';
        if (textLow.includes('money') || textLow.includes('cash') || textLow.includes('rich') || textLow.includes('coin')) return 'cash';
        if (textLow.includes('snow') || textLow.includes('cold') || textLow.includes('ice')) return 'snow';
        if (textLow.includes('heart') || textLow.includes('love')) return 'hearts';
        if (textLow.includes('party')) return 'balloons';
        if (textLow.includes('rocket') || textLow.includes('moon') || textLow.includes('launch')) return 'rocket';
        if (textLow.includes('coffee') || textLow.includes('drink') || textLow.includes('morning')) return 'coffee';
        if (textLow.includes('rose') || textLow.includes('flower') || textLow.includes('beautiful')) return 'rose';
        return undefined;
    }

    private getLayoutForProfile(profileId: ShowProfileType): string {
        switch (profileId) {
            case 'ecommerce': return 'showcase_pinned';
            case 'talk_show': return 'interview_split';
            case 'game_show': return 'grid_compact';
            case 'education': return 'lecture_pip';
            case 'horror_story': return 'cinematic_focus';
            default: return 'stage_wide';
        }
    }

    /**
     * Generate a new script using Gemini based on the selected profile and user inputs.
     */
    public async generateScript(profileId: ShowProfileType, inputs: Record<string, string>): Promise<LiveScript> {
        const profile = SHOW_PROFILES[profileId];
        if (!profile) throw new Error('Invalid profile ID');

        const systemPrompt = `
        You are an expert TV Showrunner. 
        ${profile.basePrompt}
        
        AVAILABLE ACTIONS:
        - "trigger_sponsorship": Show a brand sponsorship overlay. Params: { sponsorName: string, slogan: string, logoUrl?: string }
        - "assemble_highlights": Trigger an AI-driven recap of the session. 
        - "trigger_visual_fx": Trigger a special visual effect. Params: { type: "confetti" | "fire" | "glitch" | "cash" | "snow" | "hearts" | "balloons" | "rocket" | "coffee" | "rose" }
        - "trigger_data_overlay": Show a graphic overlay. Params:
            - type: "stat_card" | "table" | "chart" | "media"
            - data: 
                - For "stat_card": { label: "Revenue", value: "$10M", trend: 5.2 }
                - For "table": { columns: ["Item", "Price"], rows: [["A", "$10"], ["B", "$20"]] }
                - For "chart": { points: [{ label: "Q1", value: 50 }, { label: "Q2", value: 80 }] }
                - For "media": { mediaType: "image" | "video", url: "https..." }
            - duration: number (seconds to show)
        - "show_product": Show a product card. Params: { id: "product_id" }
        - "switch_scene": Switch layout. Params: { actionPayload: "grid" | "fullscreen" | "interview" | "showcase_pinned" | "interview_split" | "lecture_pip" | "cinematic_focus" }
        - "set_camera_transform": Adjust camera. Params: { zoom: number, panX: number, panY: number }
        - "request_vision": AI Guest asks to see the stage.
        - "trigger_ad_break": Start a commercial break.
        
        TOPICAL TRENDS (Incorporate into dialogue if relevant):
        {{trends}}

        SOCIAL CONTEXT (Relationship dynamics):
        {{socialContext}}
        
        OUTPUT FORMAT (JSON Array of Steps):
        [
            {
                "description": "Short direction for the director",
                "agentId": "host" | "guest_1" | "guest_2", 
                "dialogue": "Spoken text (keep it natural)",
                "action": "One of the available actions",
                "actionParams": { ... },
                "durationSeconds": 10
            }
        ]

        USER INPUTS:
        ${Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join('\n')}
        `
        .replace('{{trends}}', (await TrendFetchService.getTopTrends(profileId === 'ecommerce' ? 'tech' : 'general')).join(', '))
        .replace('{{socialContext}}', inputs['social_context'] || 'Standard professional relationships.');

        const userPrompt = "Generate the full run-of-show script now.";

        try {
            const result = await this.gemini.generateContent([{ text: userPrompt }], 'gemini-2.5-flash', { 
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json' 
            });
            let steps = [];
            try {
                steps = JSON.parse(result.text || '[]');
            } catch (e) {
                console.warn('[ShowRunner] Failed to parse script JSON:', e);
            }

            // Validate and sanitized steps while enriching with emotions and visual FX
            const sanitizedSteps: ScriptStep[] = await Promise.all((Array.isArray(steps) ? steps : []).map(async (s: any, i: number) => {
                let emotion = undefined;
                let visualFX = undefined;

                if (s.dialogue) {
                    try {
                        emotion = await EmotionAnalysisService.analyzeText(s.dialogue);
                        visualFX = this.detectVisualFX(s.dialogue);
                    } catch (e) {
                        console.warn('[ShowRunner] Enrichment failed for step:', i);
                    }
                }

                // If s.action is already trigger_visual_fx, don't overwrite it unless visualFX is found
                let action = s.action;
                let actionParams = s.actionParams;

                if (visualFX && !action) {
                    action = 'trigger_visual_fx';
                    actionParams = { type: visualFX };
                }

                // Phase 81: Automated Camera Emphasis
                if (!action && emotion && (emotion.emotion === 'surprised')) {
                    action = 'set_camera_transform';
                    actionParams = { zoom: 1.5, panX: 0, panY: -10 }; // Zoom into face
                }

                return {
                    id: `step_${i}`,
                    timestamp: Date.now(),
                    description: s.description || 'No description',
                    agentId: s.agentId,
                    dialogue: s.dialogue,
                    emotion: emotion,
                    visualFX: visualFX,
                    action: action,
                    actionParams: actionParams,
                    durationSeconds: s.durationSeconds || 10,
                    status: 'pending' as const
                };
            }));

            this.activeScript = {
                id: `script_${Date.now()}`,
                profileId,
                title: inputs['title'] || profile.name,
                steps: sanitizedSteps,
                currentIndex: -1,
                isRunning: false,
                createdAt: Date.now()
            };

            // Phase 91: Inject initial layout switch for the profile if no action exists at start
            if (this.activeScript.steps.length > 0 && !this.activeScript.steps[0].action) {
                this.activeScript.steps[0].action = 'switch_scene';
                this.activeScript.steps[0].actionParams = { actionPayload: this.getLayoutForProfile(profileId) };
                this.activeScript.steps[0].description = `[AUTO] Setup ${profileId} layout`;
            }

            // Phase 92: Automated Ad Break Management
            // Inject an ad break around the middle if script is long enough (> 5 steps)
            if (this.activeScript.steps.length > 5) {
                const midIndex = Math.floor(this.activeScript.steps.length / 2);
                const adStep: ScriptStep = {
                    id: `ad_${Date.now()}`,
                    timestamp: Date.now(),
                    description: '[AUTO] Commercial Break',
                    agentId: 'host',
                    dialogue: 'We will be right back after a short break! Stay tuned.',
                    action: 'switch_scene',
                    actionParams: { actionPayload: 'fullscreen' },
                    durationSeconds: 15,
                    status: 'pending'
                };
                this.activeScript.steps.splice(midIndex, 0, adStep);
            }

            this.broadcastState();
            return this.activeScript;
        } catch (error) {
            console.error('[ShowRunner] Script generation failed:', error);
            throw new Error('Failed to generate script');
        }
    }

    public startShow() {
        if (!this.activeScript) return;
        this.activeScript.isRunning = true;
        this.activeScript.currentIndex = -1;
        this.nextStep(); // Start immediately
    }

    public pauseShow() {
        if (!this.activeScript) return;
        this.activeScript.isRunning = false;
        if (this.timer) clearTimeout(this.timer);
        this.broadcastState();
    }

    public stopShow() {
        if (!this.activeScript) return;
        this.activeScript.isRunning = false;
        this.activeScript = null;
        if (this.timer) clearTimeout(this.timer);
        this.broadcastState();
    }

    public async handlePollResult(actionType: string, winner: string) {
        console.log(`[ShowRunner] Handling poll result: ${actionType} -> ${winner}`);
        
        if (this.activeScript && this.activeScript.isRunning) {
            // Find if there's a placeholder or just append a new step
            // For now, let's inject a new script step based on the winner
            const newStep: ScriptStep = {
                id: `step_${Date.now()}`,
                timestamp: Date.now(),
                description: `Audience voted for: ${winner}`,
                agentId: 'host', // Default to host acknowledging
                dialogue: `(React to audience vote: ${winner})`,
                action: 'trigger_data_overlay',
                actionParams: {
                    type: 'stat_card',
                    data: {
                        title: 'Poll Winner',
                        value: winner,
                        trend: 'up'
                    },
                    duration: 5
                },
                durationSeconds: 10,
                status: 'pending'
            };
            
            // Insert after current step (next up)
            if (this.activeScript.currentIndex >= 0) {
                 this.activeScript.steps.splice(this.activeScript.currentIndex + 1, 0, newStep);
                 console.log('[ShowRunner] Injected new step from poll result');
                 this.broadcastState();
            }
        }
    }

    public injectEvent(type: string, payload: any) {
        console.log(`[ShowRunner] Injecting event: ${type}`, payload);
        // Emitting event to studio clients for immediate reaction
        socketServer.getIO()?.emit('show:event', { type, payload });
    }

    public nextStep() {
        if (!this.activeScript || !this.activeScript.isRunning) return;

        // Mark current as completed
        if (this.activeScript.currentIndex >= 0 && this.activeScript.currentIndex < this.activeScript.steps.length) {
            this.activeScript.steps[this.activeScript.currentIndex].status = 'completed';
        }

        this.activeScript.currentIndex++;

        // Check if finished
        if (this.activeScript.currentIndex >= this.activeScript.steps.length) {
            this.activeScript.isRunning = false;
            this.broadcastState();
            return;
        }

        const currentStep = this.activeScript.steps[this.activeScript.currentIndex];
        currentStep.status = 'active';
        
        // Execute Action
        this.broadcastState();
        this.broadcastState();
        socketServer.getIO()?.emit('show:execution_step', currentStep);

        // Auto-advance timer?

        // Auto-advance timer?
        // Ideally, we wait for the duration OR a manual trigger. 
        // For 'Auto-Pilot', we use the duration.
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.nextStep();
        }, currentStep.durationSeconds * 1000);
    }

    private broadcastState() {
        socketServer.getIO()?.emit('show:state_update', this.activeScript);
    }
}

export const showRunnerService = new ShowRunnerService();
