import { syntheticGuestManager } from './SyntheticGuestManager.js';
import { conversationOrchestrator } from './ConversationOrchestrator.js';

/**
 * Agentic service for autonomous live production management.
 * Handles automatic scene switching, overlay triggering, and guest coordination.
 */
export class StudioDirector {
    private isActive = false;
    private lastSwitchTime = 0;
    private cooldownMs = 8000; // Faster response for God Mode
    private vibe: any = null;
    private aiRequestQueue: { action: string, payload: any, priority?: number }[] = [];

    public async tick(context: {
        voiceLevel: number,
        faceDetected?: boolean,
        activeGuests: number,
        chatVelocity: number,
        currentSceneId: string,
        guestLevels?: number[],
        isTransitioning?: boolean,
        vibe?: any
    }): Promise<{ action: 'switch_scene' | 'show_overlay' | 'trigger_guest' | 'trigger_product' | 'capture_highlight' | 'trigger_celebration' | 'show_lower_third' | 'none', payload?: any }> {
        if (!this.isActive || context.isTransitioning) return { action: 'none' };

        const now = Date.now();
        
        // 0. Process AI-Initiated Requests (Priority)
        if (this.aiRequestQueue.length > 0 && now - this.lastSwitchTime > 5000) {
            const req = this.aiRequestQueue.shift();
            console.log(`[StudioDirector] Fulfilling AI Request: ${req?.action}`);
            this.lastSwitchTime = now;
            return { action: req?.action as any, payload: req?.payload };
        }
        const { voiceLevel, activeGuests, chatVelocity, currentSceneId, guestLevels = [] } = context;

        // 1. Viral Detection (Chat Spike)
        if (chatVelocity > 25 && now - this.lastSwitchTime > 30000) {
            this.lastSwitchTime = now;
            return { action: 'trigger_celebration', payload: { type: 'hype_burst', score: chatVelocity } };
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

        // 4. Automatic Lower Thirds (Contextual Info)
        if (activeGuests > 0 && now - this.lastSwitchTime > 20000 && Math.random() < 0.2) {
            return { action: 'show_lower_third', payload: { type: 'guest_info' } };
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


        return { action: 'none' };
    }

    public setActive(active: boolean) {
        this.isActive = active;
        console.log(`[StudioDirector] God Mode: ${active ? 'ENGAGED' : 'DISENGAGED'}`);
    }

    public isGodMode(): boolean {
        return this.isActive;
    }

    public updateSettings(settings: { cooldown?: number, vibe?: any }) {
        if (settings.cooldown) this.cooldownMs = settings.cooldown;
        if (settings.vibe) this.vibe = settings.vibe;
    }

    /**
     * Allows AI Agents (Producer, Guests) to request a studio action.
     * Actions are queued and processed by the director.
     */
    public requestAction(action: string, payload: any, priority: number = 1) {
        if (action === 'none') return;
        
        console.log(`[StudioDirector] AI Requested action: ${action}`);
        this.aiRequestQueue.push({ action, payload, priority });
        
        // Limit queue size
        if (this.aiRequestQueue.length > 5) this.aiRequestQueue.shift();
    }
}

export const studioDirector = new StudioDirector();
