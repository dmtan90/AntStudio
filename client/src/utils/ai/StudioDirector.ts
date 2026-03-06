import { syntheticGuestManager } from './SyntheticGuestManager.js';
import { conversationOrchestrator } from './ConversationOrchestrator.js';
import { neuralShowrunner } from './NeuralShowrunner.js';
import { ActionSyncService } from './ActionSyncService.js';

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
        vibe?: any,
        v2cMatch?: any,
        intentScore?: number,
        currentRatio?: '16:9' | '9:16' | 'both',
        hasViralMoment?: boolean
    }): Promise<{ action: 'switch_scene' | 'show_overlay' | 'trigger_guest' | 'trigger_product' | 'capture_highlight' | 'trigger_celebration' | 'show_lower_third' | 'change_global_atmosphere' | 'react_to_gift' | 'hype_boost' | 'trigger_group_action' | 'publish_viral_moment' | 'auto_reframing' | 'none', payload?: any }> {
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

        // Neural Segment Influencer (Phase 32)
        const showrunner = neuralShowrunner.active;
        let segmentType = '';
        if (showrunner.isRunning) {
            segmentType = showrunner.segments[showrunner.currentSegmentIndex]?.type || '';
        }

        // 1. Viral Detection (Chat Spike)
        if (chatVelocity > 25 && now - this.lastSwitchTime > 30000) {
            this.lastSwitchTime = now;
            
            // Autonomous Syndication: If viral moment detected, capture and potentially publish
            return { action: 'publish_viral_moment', payload: { type: 'hype_burst', score: chatVelocity, autoPublish: true } };
        }

        // 1.1 Intent-Driven Capture
        if (context.intentScore && context.intentScore > 0.95 && now - this.lastSwitchTime > 60000) {
            this.lastSwitchTime = now;
            return { action: 'publish_viral_moment', payload: { type: 'high_intent', score: context.intentScore, autoPublish: true } };
        }

        // 2. High Engagement Visuals
        if (chatVelocity > 12) {
            return { action: 'show_overlay', payload: { type: 'particles', effect: 'celebration' } };
        }

        // Phase 40: B-Roll / Visual Concept Priority
        if (this.aiRequestQueue.length > 0 && this.aiRequestQueue[0].action === 'show_overlay' && this.aiRequestQueue[0].payload.type === 'b_roll_generated') {
             const highPriorityReq = this.aiRequestQueue.shift();
             // If AI produces B-Roll, Director MUST prioritize it
             this.lastSwitchTime = now;
             return { action: 'switch_scene', payload: 'fullscreen' }; // Focus on the visual
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

        // 4.1 Vision-to-Commerce (V2C) Response
        if (context.v2cMatch && context.v2cMatch.confidence > 0.85 && now - this.lastSwitchTime > 15000) {
            this.lastSwitchTime = now;
            return { action: 'trigger_product', payload: { id: context.v2cMatch.productId, reason: 'vision_detected' } };
        }

        // 5. Dynamic Guest Camera & Atmosphere
        if (activeGuests > 0 && now - this.lastSwitchTime > 5000) {
            // Chance to trigger a camera motion or atmosphere change
            if (chatVelocity > 15 || voiceLevel > 0.3) {
                const paths: any[] = ['orbit', 'slow_zoom', 'side_sweep', 'dramatic_low'];
                const selectedPath = paths[Math.floor(Math.random() * paths.length)];
                
                // Trigger camera path on the most active guest
                const loudestIdx = guestLevels.findIndex(l => l > 0.1);
                const targetId = loudestIdx !== -1 ? `guest${loudestIdx + 1}` : 'host';

                this.lastSwitchTime = now; // Count as a "production action"
                
                if (Math.random() > 0.7) {
                    return { action: 'trigger_celebration', payload: { type: 'camera_path', path: selectedPath, target: targetId } };
                } else if (Math.random() > 0.4) {
                    const atmospheres = ['sakura', 'snow', 'glitter'];
                    const selectedAtmo = atmospheres[Math.floor(Math.random() * atmospheres.length)];
                    return { action: 'trigger_celebration', payload: { type: 'atmosphere', effect: selectedAtmo, target: targetId } };
                } else {
                    const globalAtmospheres = ['sakura', 'snow', 'glitter', 'fireflies'];
                    const selectedAtmo = globalAtmospheres[Math.floor(Math.random() * globalAtmospheres.length)];
                    return { action: 'change_global_atmosphere', payload: { effect: selectedAtmo } };
                }
            }
        }

        // 3. Autonomous Scene Switching (Director Core)
        if (now - this.lastSwitchTime > this.cooldownMs) {
            // Narrative-Driven Overrides (Phase 32)
            if (showrunner.isRunning) {
                if (segmentType === 'intro' && currentSceneId !== 'fullscreen') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'fullscreen' };
                }
                if (segmentType === 'debate' && activeGuests > 1 && currentSceneId !== 'grid') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'grid' };
                }
                if (segmentType === 'outro' && currentSceneId !== 'standard') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'standard' };
                }
            }

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

            // 0. Auto Re-framing for Vertical Platforms
            if (context.currentRatio === '16:9' && (chatVelocity > 20 || (context.intentScore && context.intentScore > 0.8))) {
                // High engagement moments deserve vertical re-framing for TikTok/shorts optimization
                this.lastSwitchTime = now;
                return { action: 'auto_reframing', payload: { ratio: '9:16' } };
            } else if (context.currentRatio === '9:16' && chatVelocity < 5 && voiceLevel < 0.05) {
                // Back to standard if calm
                this.lastSwitchTime = now;
                return { action: 'auto_reframing', payload: { ratio: '16:9' } };
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

        // Special handling for Gifts: Priority 10 for high-value gifts
        if (action === 'react_to_gift') {
            const cost = payload?.cost || 0;
            if (cost >= 1000) {
                // High-value gift: Immediate production escalation
                this.aiRequestQueue.unshift({ action: 'react_to_gift', payload, priority: 10 });
                this.lastSwitchTime = 0; // Force immediate processing
                return;
            }
        }

        this.aiRequestQueue.push({ action, payload, priority });
        
        // Limit queue size
        if (this.aiRequestQueue.length > 5) this.aiRequestQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 5);
    }
}

export const studioDirector = new StudioDirector();
