import { syntheticGuestManager } from './SyntheticGuestManager';

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
    }

    public setTopic(topic: string) {
        this.currentTopic = topic;
        console.log(`[Orchestrator] Topic updated to: ${topic}`);
    }

    /**
     * Main Tick Loop called by StudioDirector
     */
    public tick(context: { voiceLevel: number, activeGuests: number, vibe?: any, vision?: string, autoEmotionEnabled?: boolean }) {
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
        const historyText = this.conversationHistory.map(h => `${h.speaker}: ${h.text}`).join('\n');
        
        const host = guests.find(g => g.persona.role === 'host');
        const activeAIs = guests.filter(g => !g.isThinking && !g.isSpeaking);
        
        if (activeAIs.length === 0) return;

        // 2. Turn Selection Logic
        let selectedAI = null;
        let instruction = "";

        // Strategy: 40% Host lead, 60% Random interaction
        if (host && Math.random() < 0.4 && lastSpeaker !== host.persona.name) {
            selectedAI = host;
            instruction = `facilitate the conversation. Mention the current topic "${this.currentTopic}" and maybe ask a specific guest (from: ${otherAIs}) for their opinion.`;
        } else {
            // Pick an AI that didn't just speak
            const candidates = activeAIs.filter(g => g.persona.name !== lastSpeaker);
            selectedAI = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : activeAIs[0];
            
            // Randomly decide to address another AI or just chime in
            if (guests.length > 2 && Math.random() > 0.5) {
                const target = guests.find(g => g.persona.uuid !== selectedAI.persona.uuid);
                instruction = `react to what was just said by ${lastSpeaker}. If appropriate, address ${target.persona.name} directly to get their thoughts.`;
            } else {
                instruction = `provide a brief, personality-driven thought on the current topic "${this.currentTopic}". Keep it natural and conversational.`;
            }
        }

        if (selectedAI) {
            console.log(`[Orchestrator] ${selectedAI.persona.name} taking the floor: ${instruction}`);
            
            const vibeLead = this.vibe ? `[Environment Vibe: ${this.vibe.mood}] ` : '';
            const visionContext = this.vision ? `[Visual Context: ${this.vision}] ` : '';
            
            const prompt = `
${vibeLead}${visionContext}
CONVERSATION HISTORY:
${historyText}

INSTRUCTION: 
As ${selectedAI.persona.name}, ${instruction}
Keep your response short (15-30 words).
            `.trim();
            
            const contextualVibe = this.vibe ? `Vibe: ${this.vibe.mood}` : 'Neutral';
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
