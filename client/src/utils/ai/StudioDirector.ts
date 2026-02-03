import { syntheticGuestManager } from './SyntheticGuestManager.js';

/**
 * Agentic service for autonomous live production management.
 * Handles automatic scene switching, overlay triggering, and guest coordination.
 */
export class StudioDirector {
    private isActive = false;
    private lastSwitchTime = 0;
    private cooldownMs = 8000; // Faster response for God Mode
    private guestReplyTimer: any = null;

    public async tick(context: {
        voiceLevel: number,
        faceDetected?: boolean,
        activeGuests: number,
        chatVelocity: number,
        currentSceneId: string,
        guestLevels?: number[],
        isTransitioning?: boolean
    }): Promise<{ action: 'switch_scene' | 'show_overlay' | 'trigger_guest' | 'trigger_product' | 'capture_highlight' | 'none', payload?: any }> {
        if (!this.isActive || context.isTransitioning) return { action: 'none' };

        const now = Date.now();
        const { voiceLevel, activeGuests, chatVelocity, currentSceneId, guestLevels = [] } = context;

        // 1. Viral Detection (Chat Spike)
        if (chatVelocity > 20 && now - this.lastSwitchTime > 30000) {
            this.lastSwitchTime = now;
            return { action: 'capture_highlight', payload: { type: 'hype_burst', score: chatVelocity } };
        }

        // 2. High Engagement Visuals
        if (chatVelocity > 12) {
            return { action: 'show_overlay', payload: { type: 'particles', effect: 'celebration' } };
        }

        // 3. Product Recommendation (Context-Aware Sales)
        if (voiceLevel > 0.15 && chatVelocity > 5 && now - this.lastSwitchTime > 45000) {
            this.lastSwitchTime = now;
            return { action: 'trigger_product', payload: { reason: 'high_engagement_pitch' } };
        }

        // 3. Autonomous Scene Switching (Director Core)
        if (now - this.lastSwitchTime > this.cooldownMs) {

            // IF: Host is talking loud and not centered
            if (voiceLevel > 0.25 && currentSceneId !== 'standard' && currentSceneId !== 'fullscreen') {
                this.lastSwitchTime = now;
                return { action: 'switch_scene', payload: 'standard' };
            }

            // IF: A guest is speaking and host is silent
            if (activeGuests > 0 && voiceLevel < 0.05) {
                const loudestGuestIndex = guestLevels.findIndex(lvl => lvl > 0.15);
                if (loudestGuestIndex !== -1 && currentSceneId !== 'shoutout') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'shoutout' };
                }

                // If multiple people speaking or just general discussion
                if (currentSceneId !== 'sidebyside' && currentSceneId !== 'interview') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'interview' };
                }
            }

            // IF: Silence/Quiet (Reaction/Wide Shot)
            if (voiceLevel < 0.02 && (activeGuests === 0 || guestLevels.every(l => l < 0.02))) {
                if (currentSceneId !== 'fullscreen' && currentSceneId !== 'grid') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'fullscreen' };
                }
            }
        }

        // 4. Guest Coordination (Synthetic interactions / Auto-Chime)
        if (!this.guestReplyTimer) {
            const guests = syntheticGuestManager.getGuests();
            if (guests.length > 0) {

                // IF: Chat is exploding, trigger a reaction
                if (chatVelocity > 15) {
                    this.guestReplyTimer = setTimeout(() => { this.guestReplyTimer = null; }, 15000);
                    return { action: 'trigger_guest', payload: { guestId: guests[0].persona.id, prompt: "React with excitement to the chat activity!" } };
                }

                // IF: Long silence, guest should chime in
                if (voiceLevel < 0.05 && now - this.lastSwitchTime > 12000) {
                    this.guestReplyTimer = setTimeout(() => { this.guestReplyTimer = null; }, 20000);
                    return { action: 'trigger_guest', payload: { guestId: guests[0].persona.id, prompt: "The studio is a bit quiet, start a conversation or offer a thought." } };
                }
            }
        }

        return { action: 'none' };
    }

    public setActive(active: boolean) {
        this.isActive = active;
        console.log(`[StudioDirector] God Mode: ${active ? 'ENGAGED' : 'DISENGAGED'}`);
    }

    public isGodMode(): boolean {
        return this.isActive;
    }

    public updateSettings(settings: { cooldown?: number }) {
        if (settings.cooldown) this.cooldownMs = settings.cooldown;
    }
}

export const studioDirector = new StudioDirector();
