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
            // In production, this calls the Gemini backend with the guest's systemPrompt
            await new Promise(r => setTimeout(r, 2000));

            const responseText = `That's a fascinating point about the ${prompt.substring(0, 10)}... As an AI, I believe we are entering a new era of synthetic collaboration.`;

            // Generate Neural Voice URL
            const audioUrl = `https://s3.antflow.ai/synth/voice_${guestId}.mp3`;

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
