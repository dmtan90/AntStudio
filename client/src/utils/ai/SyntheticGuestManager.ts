import { toast } from 'vue-sonner';
import api from './api';
import { aiAudioAnalyzer } from './AIAudioAnalyzer';

/**
 * Interface for a Synthetic AI Guest persona.
 */
export interface AIGuestPersona {
    id: string; // This maps to entityId in NeuralArchive
    name: string;
    avatarUrl: string;
    voiceId: string;
    systemPrompt: string;
    visualIdentity?: {
        glbUrl: string;
        textureMapUrl?: string;
    };
}

/**
 * Service to manage virtual AI guests (NPCs) in the Studio.
 */
export class SyntheticGuestManager {
    private activeGuests: Map<string, { persona: AIGuestPersona, isSpeaking: boolean, isThinking: boolean }> = new Map();
    private audioAnalysers: Map<string, { stop: () => void }> = new Map();

    private personaLibrary: AIGuestPersona[] = [
        {
            id: 'sh_nexus',
            name: 'Nexus Prime',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=nexus',
            voiceId: 'en-US-Neural2-F',
            systemPrompt: 'You are a highly technical AI expert.',
            visualIdentity: { glbUrl: '/assets/models/ai_guest_base.glb' }
        }
    ];

    /**
     * Synchronize library with Neural Archive (Souls)
     */
    public async syncLibrary() {
        try {
            const { data } = await api.get('/neural/list');
            if (data?.data && Array.isArray(data.data)) {
                this.personaLibrary = data.data.map((soul: any) => ({
                    id: soul.entityId,
                    name: soul.identity.name,
                    avatarUrl: soul.visualIdentity?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${soul.entityId}`,
                    voiceId: soul.customization?.voiceId || 'en-US-Neural2-F',
                    systemPrompt: soul.identity.description,
                    visualIdentity: soul.visualIdentity || { glbUrl: '/assets/models/ai_guest_base.glb' }
                }));
                console.log(`[SyntheticGuest] Synced ${this.personaLibrary.length} souls from archive.`);
            }
        } catch (e) {
            console.warn('[SyntheticGuest] Failed to sync library, using defaults');
        }
    }

    public getPersonaLibrary() {
        return this.personaLibrary;
    }

    public async summonGuest(persona: AIGuestPersona) {
        if (this.activeGuests.has(persona.id)) return;

        this.activeGuests.set(persona.id, { persona, isSpeaking: false, isThinking: false });
        toast.success(`AI Orchestrator: Summoned ${persona.name} to the Studio.`);

        // Notify rendering worker to add 3D model
        this.notifyWorker('add-3d-guest', {
            id: `guest_${persona.id}`,
            glbUrl: persona.visualIdentity?.glbUrl,
            textureUrl: persona.visualIdentity?.textureMapUrl
        });
    }

    public removeGuest(id: string) {
        this.stopSpeaking(id);
        this.activeGuests.delete(id);
    }

    /**
     * Triggers a synthetic guest response based on a prompt.
     */
    public async generateResponse(guestId: string, prompt: string): Promise<{ text: string, audioUrl: string } | null> {
        const guest = this.activeGuests.get(guestId);
        if (!guest) return null;

        guest.isThinking = true;
        this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: true });

        try {
            // 1. Generate Dialogue Text
            const talkRes = await api.post('/ai/guest/talk', { entityId: guestId, prompt });
            const responseText = talkRes.data.text;

            // 2. Generate TTS Audio
            const ttsRes = await api.post('/ai/guest/tts', { text: responseText, voiceId: guest.persona.voiceId });
            const audioUrl = ttsRes.data.url;

            guest.isThinking = false;
            this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: false });

            // 3. Start Audio Analysis for Lip-sync
            this.startSpeaking(guestId, audioUrl);

            return { text: responseText, audioUrl };

        } catch (error) {
            guest.isThinking = false;
            this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: false });
            console.error("[SyntheticGuest] Dialogue failed:", error);
            return null;
        }
    }

    private startSpeaking(id: string, audioUrl: string) {
        this.stopSpeaking(id);

        const guest = this.activeGuests.get(id);
        if (guest) guest.isSpeaking = true;

        const analysis = aiAudioAnalyzer.analyze(audioUrl, (level: number) => {
            this.notifyWorker('update-3d-audio', {
                id: `guest_${id}`,
                audioLevel: level
            });
        });

        if (analysis) {
            this.audioAnalysers.set(id, analysis);
        }
    }

    private stopSpeaking(id: string) {
        const analysis = this.audioAnalysers.get(id);
        if (analysis) {
            analysis.stop();
            this.audioAnalysers.delete(id);
        }
        const guest = this.activeGuests.get(id);
        if (guest) guest.isSpeaking = false;
    }

    private notifyWorker(type: string, payload: any) {
        window.dispatchEvent(new CustomEvent('studio-worker-command', { detail: { type, payload } }));
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
