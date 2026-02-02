import { toast } from 'vue-sonner';

/**
 * Interface for a Synthetic AI Guest persona.
 */
export interface AIGuestPersona {
    id: string;
    name: string;
    avatarUrl: string;
    voiceId: string;
    systemPrompt: string;
}

/**
 * Service to manage virtual AI guests (NPCs) in the Studio.
 */
export class SyntheticGuestManager {
    private activeGuests: Map<string, { persona: AIGuestPersona, isSpeaking: boolean, isThinking: boolean }> = new Map();

    private personaLibrary: AIGuestPersona[] = [
        {
            id: 'tech_expert',
            name: 'Dr. Nexus',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=nexus',
            voiceId: 'en-US-Neural2-F',
            systemPrompt: 'You are a highly technical AI expert. Answer complex questions with precision.'
        },
        {
            id: 'hype_man',
            name: 'Sparky',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=sparky',
            voiceId: 'en-US-Neural2-A',
            systemPrompt: 'You are a hype man. Your goal is to keep the energy high and the audience engaged!'
        },
        {
            id: 'comedian',
            name: 'Giggles',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=giggles',
            voiceId: 'en-US-Neural2-D',
            systemPrompt: 'You are a stand-up comedian. Add humor and witty remarks to the conversation.'
        }
    ];

    public getPersonaLibrary() {
        return this.personaLibrary;
    }

    public async summonGuest(persona: AIGuestPersona) {
        if (this.activeGuests.has(persona.id)) return;

        this.activeGuests.set(persona.id, { persona, isSpeaking: false, isThinking: false });
        toast.success(`AI Orchestrator: Summoned ${persona.name} to the Studio.`);
    }

    public removeGuest(id: string) {
        this.activeGuests.delete(id);
    }

    /**
     * Triggers a synthetic guest response based on a prompt.
     */
    public async generateResponse(guestId: string, prompt: string): Promise<{ text: string, audioUrl: string } | null> {
        const guest = this.activeGuests.get(guestId);
        if (!guest) return null;

        guest.isThinking = true;
        try {
            // Mocking the AI interaction call
            await new Promise(r => setTimeout(r, 2000));

            let responseText = "";
            if (guest.persona.id === 'hype_man') {
                responseText = `ABSOLUTELY AMAZING! 🚀 Everyone in the chat, show some love for that point! We are CRUSHING IT today!`;
            } else if (guest.persona.id === 'tech_expert') {
                responseText = `From a technical standpoint, the ${prompt.substring(0, 15)} architecture suggests a highly decoupled modular system. Interesting choice.`;
            } else {
                responseText = `That's a fascinating point about the ${prompt.substring(0, 10)}... As an AI, I believe we are entering a new era of synthetic collaboration.`;
            }

            // Generate Neural Voice URL
            const audioUrl = `https://s3.antflow.ai/synth/voice_${guestId}_${Date.now()}.mp3`;

            guest.isThinking = false;
            return { text: responseText, audioUrl };

        } catch (error) {
            guest.isThinking = false;
            console.error("[SyntheticGuest] Dialogue failed:", error);
            return null;
        }
    }

    public getGuests() {
        return Array.from(this.activeGuests.values());
    }

    public setSpeaking(id: string, speaking: boolean) {
        const guest = this.activeGuests.get(id);
        if (guest) guest.isSpeaking = speaking;
    }
}

export const syntheticGuestManager = new SyntheticGuestManager();
