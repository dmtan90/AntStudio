import api from '@/utils/api';
import { syntheticGuestManager } from './SyntheticGuestManager';
import { neuralShowrunner } from './NeuralShowrunner';

/**
 * Manages the "Floor" (who is speaking) and orchestrates conversation flow.
 */
export class ConversationOrchestrator {
    private floorHolder: string | 'human' | null = null;
    private silenceStart = 0;
    private conversationHistory: { speaker: string, text: string }[] = [];
    private lastAgentTurn = 0;
    private currentTopic = "General Conversation";
    private vibe: any = null;
    private vision: string = "";
    
    // Config
    private SILENCE_THRESHOLD = 2500; // ms before AI considers speaking
    private INTERRUPTION_THRESHOLD = 0.15; // Voice level to trigger interruption

    constructor() {
        this.silenceStart = Date.now();

        // Listen for ShowRunner directives to shift segments proactively
        if (typeof window !== 'undefined') {
            window.addEventListener('showrunner:directive', async (e: Event) => {
                const detail = (e as CustomEvent).detail;
                console.log(`[Orchestrator] RECEIVED SHOWRUNNER DIRECTIVE: [${detail.type}]`);
                
                const { useStudioStore } = await import('@/stores/studio');
                const studioStore = useStudioStore();

                this.setTopic(detail.directive);
                if (detail.vibe) this.vibe = { mood: detail.vibe };
                
                // Auto-highlight product if provided in directive
                if (detail.productContext && studioStore) {
                    console.log(`[Orchestrator] Auto-highlighting product from directive: ${detail.productContext.name}`);
                    studioStore.highlightProduct(detail.productContext.id || detail.productContext._id);
                }
                
                // Proactively trigger a turn if we aren't currently speaking
                const guests = syntheticGuestManager.getGuests();
                const isAnyoneSpeaking = guests.some(g => g.isSpeaking || g.isThinking) || this.floorHolder === 'human';
                
                // SaleRunner handles directives exclusively in sales context
                if (studioStore.streamingContext === 'sales') {
                    console.log('[Orchestrator] Sales context: Skipping proactive turn trigger (delegated to SaleRunner)');
                    return;
                }

                if (!isAnyoneSpeaking) {
                    console.log(`[Orchestrator] Proactively triggering turn for new segment: ${detail.type}`);
                    this.decideNextTurn(guests, true);
                    this.silenceStart = Date.now() + 5000; // Cooldown
                }
            });

            // Listen for audience intelligence signals to shift topic
            window.addEventListener('audience:signal', (e: Event) => {
                const signal = (e as CustomEvent).detail;
                this.handleAudienceSignal(signal);
            });
        }
    }

    private handleAudienceSignal(signal: any) {
        if (signal.type === 'velocity_surge' && signal.triggerText) {
            const newTopic = `What the audience is talking about: "${signal.triggerText}"`;
            this.setTopic(newTopic);
            console.log(`[Orchestrator] AUDIENCE PIVOT: Topic shifted to "${signal.triggerText}"`);
        } else if (signal.type === 'intent_spike') {
            const newTopic = `High audience intent detected: ${signal.reason}`;
            this.setTopic(newTopic);
            console.log(`[Orchestrator] INTENT PIVOT: Forcing ShowRunner segment pivot due to: ${signal.reason}`);
            // Force the ShowRunner to pivot the narrative segment
            neuralShowrunner.pivotSegment(signal.reason);
        }
    }

    public setTopic(topic: string) {
        this.currentTopic = topic;
        console.log(`[Orchestrator] Topic updated to: ${topic}`);
    }

    /**
     * Main Tick Loop called by StudioDirector
     */
    public async tick(context: { voiceLevel: number, activeGuests: number, vibe?: any, vision?: string, autoEmotionEnabled?: boolean }) {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        if (!studioStore.isLive) {
            this.silenceStart = Date.now();
            return;
        }

        const now = Date.now();
        if (context.vibe) this.vibe = context.vibe;
        if (context.vision) this.vision = context.vision;

        // 1. Detection: Is Human Speaking?
        if (context.voiceLevel > this.INTERRUPTION_THRESHOLD) {
            // INTERRUPTION LOGIC
            if (this.floorHolder && this.floorHolder !== 'human') {
                console.log(`[Orchestrator] Human interrupted ${this.floorHolder}!`);
                syntheticGuestManager.interrupt(this.floorHolder);
            }
            
            this.floorHolder = 'human';
            this.silenceStart = now; // Reset silence timer
            return;
        }

        // 2. Detection: Is AI Speaking?
        const guests = syntheticGuestManager.getGuests();
        const speakingGuest = guests.find(g => g.isSpeaking);

        if (speakingGuest) {
            this.floorHolder = speakingGuest.persona.uuid;
            this.silenceStart = now;
            return;
        }

        // 3. Silence Logic
        if (!speakingGuest && context.voiceLevel < 0.05) {
            if (this.floorHolder !== null) {
                // Determine if we just finished a turn
                this.floorHolder = null;
                this.silenceStart = now;
            }

            const silenceDuration = now - this.silenceStart;

            // IF Silence is long enough, decide next turn
            if (silenceDuration > this.SILENCE_THRESHOLD) {
                this.decideNextTurn(guests, context.autoEmotionEnabled ?? true);
                // Reset silence to avoid spamming decisions
                this.silenceStart = now + 5000; // Cooldown
            }
        }
    }

    /**
     * AI Logic to decide who speaks next (Multi-Agent aware)
     */
    private async decideNextTurn(guests: any[], autoEmotionEnabled: boolean = true) {
        if (guests.length === 0) return;

        // 1. Build Social Context
        const lastSpeaker = this.conversationHistory[this.conversationHistory.length - 1]?.speaker || 'No one';
        const otherAIs = guests.map(g => g.persona.name).join(', ');
        
        // Sanitize history by stripping reasoning/planning blocks (**...)
        const historyText = this.conversationHistory
            .map(h => {
                // Remove reasoning headers like **Crafting...** or **Initiating...**
                const sanitizedText = h.text
                    .split('\n')
                    // Filter out lines that look like planning headers
                    .filter(line => !line.trim().startsWith('**') && !line.includes('**'))
                    .join('\n')
                    .trim();
                return sanitizedText ? `${h.speaker}: ${sanitizedText}` : '';
            })
            .filter(Boolean)
            .join('\n');
        
        const host = guests.find(g => g.persona.role === 'host');
        const activeAIs = guests.filter(g => !g.isThinking && !g.isSpeaking);
        
        if (activeAIs.length === 0) return;

        // 2. Turn Selection Logic
        let selectedAI = null;
        let instruction = "";

        // Context-Aware Topic Enforcement
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const isSalesMode = studioStore.streamingContext === 'sales';
        const productName = studioStore.highlightedProduct?.name || 'the current product';

        // Strategy: 40% Host lead, 60% Random interaction
        if (host && Math.random() < 0.4 && lastSpeaker !== host.persona.name) {
            selectedAI = host;
            if (isSalesMode) {
                instruction = `facilitate the sales pitch. Emphasize the urgency to buy ${productName} and maybe ask a specific guest (from: ${otherAIs}) to share a quick benefit.`;
            } else {
                instruction = `facilitate the conversation. Mention the current topic "${this.currentTopic}" and maybe ask a specific guest (from: ${otherAIs}) for their opinion.`;
            }
        } else {
            // Pick an AI that didn't just speak
            const candidates = activeAIs.filter(g => g.persona.name !== lastSpeaker);
            selectedAI = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : activeAIs[0];
            
            // Randomly decide to address another AI or just chime in
            if (guests.length > 2 && Math.random() > 0.5) {
                const target = guests.find(g => g.persona.uuid !== selectedAI.persona.uuid);
                if (isSalesMode) {
                    instruction = `react to what was just said by ${lastSpeaker} about ${productName}. Agree and add another strong selling point. If appropriate, address ${target.persona.name} directly to get their thoughts.`;
                } else {
                    instruction = `react to what was just said by ${lastSpeaker}. If appropriate, address ${target.persona.name} directly to get their thoughts.`;
                }
            } else {
                if (isSalesMode) {
                    instruction = `provide a brief, high-energy sales pitch about ${productName}. Keep it natural and urgency-driven.`;
                } else {
                    instruction = `provide a brief, personality-driven thought on the current topic "${this.currentTopic}". Keep it natural and conversational.`;
                }
            }
        }

        if (selectedAI) {
            console.log(`[Orchestrator] ${selectedAI.persona.name} taking the floor: ${instruction}`);
            
            const contextualVibe = this.vibe ? `Vibe: ${this.vibe.mood}` : 'Neutral';
            
            let prompt = '';
            try {
                const promptRes = await api.post('/prompts/studio', {
                    type: 'orchestrator_turn',
                    data: {
                        name: selectedAI.persona.name,
                        instruction,
                        history: historyText,
                        vibeMood: this.vibe?.mood,
                        vision: this.vision
                    }
                });
                prompt = promptRes.data?.prompt || promptRes.data?.data?.prompt || '';
            } catch (error) {
                console.error('[Orchestrator] Failed to fetch prompt from server', error);
                // Fallback
                prompt = `As ${selectedAI.persona.name}, ${instruction}. Keep it short.`;
            }
            
            const res = await syntheticGuestManager.generateResponse(
                selectedAI.persona.uuid, 
                prompt, 
                { vibe: contextualVibe, vision: this.vision, autoEmotionEnabled }
            );
            
            if (res) {
                this.recordInteraction(selectedAI.persona.name, res.text);
            }
            this.lastAgentTurn = Date.now();
        }
    }
    
    public recordInteraction(speaker: string, text: string) {
        this.conversationHistory.push({ speaker, text });
        if (this.conversationHistory.length > 15) this.conversationHistory.shift();
    }
}

export const conversationOrchestrator = new ConversationOrchestrator();
