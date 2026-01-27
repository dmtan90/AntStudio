import { syntheticGuestManager } from './SyntheticGuestManager.js';

/**
 * Agentic service for autonomous live production management.
 */
export class StudioDirector {
    private isActive = false;
    private state: 'idle' | 'intro' | 'talk' | 'interaction' = 'idle';
    private lastSwitchTime = 0;
    private cooldownMs = 15000;
    private guestReplyTimer: any = null;

    public async tick(context: {
        voiceLevel: number,
        faceDetected: boolean,
        activeGuests: number,
        chatVelocity: number,
        currentScene: string,
        lastSaidText?: string,
        commerceIntent?: { productId: string | null, intent: string }
    }): Promise<{ action: 'switch_scene' | 'show_overlay' | 'trigger_guest' | 'trigger_product' | 'capture_highlight' | 'none', payload?: any }> {
        if (!this.isActive) return { action: 'none' };

        const now = Date.now();

        // 1. Autonomous Commerce: Trigger Product Overlay if host mentions it
        if (context.commerceIntent?.productId && context.commerceIntent.intent !== 'none') {
            return { action: 'trigger_product', payload: { productId: context.commerceIntent.productId } };
        }

        // 2. High Engagement: Capture Viral Highlight
        if (context.chatVelocity > 15 && now - this.lastSwitchTime > 60000) { // Max once per min
            this.lastSwitchTime = now;
            return { action: 'capture_highlight', payload: { type: 'hype_burst', score: context.chatVelocity } };
        }

        // 3. Turn-taking logic: If host is silent and guests are present
        if (context.voiceLevel < 0.05 && context.activeGuests > 0 && !this.guestReplyTimer) {
            console.log("[StudioDirector] Host is silent. Orchestrating AI response...");
            const guests = syntheticGuestManager.getGuests();
            if (guests.length > 0) {
                this.guestReplyTimer = setTimeout(() => { this.guestReplyTimer = null; }, 5000);
                return { action: 'trigger_guest', payload: { guestId: guests[0].persona.id } };
            }
        }

        // 4. Scene Switching Logic (Autonomous Director)
        if (now - this.lastSwitchTime > this.cooldownMs) {
            // Logic: If guest is speaking and host is silent -> Switch to Side-by-Side or Guest-Focus
            if (context.activeGuests > 0 && context.voiceLevel < 0.1) {
                this.lastSwitchTime = now;
                return { action: 'switch_scene', payload: 'interview' };
            }

            // Logic: If host is speaking and high engagement -> Switch to Full Screen Speaker
            if (context.voiceLevel > 0.3 && context.currentScene !== 'standard') {
                this.lastSwitchTime = now;
                return { action: 'switch_scene', payload: 'standard' };
            }
        }

        // 5. Automated Engagement (Hype-man)
        if (context.chatVelocity > 10) {
            return { action: 'show_overlay', payload: { type: 'particles', effect: 'celebration' } };
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
}

export const studioDirector = new StudioDirector();
