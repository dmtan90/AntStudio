import { syntheticGuestManager } from './SyntheticGuestManager.js';
import { conversationOrchestrator } from './ConversationOrchestrator.js';
import { neuralShowrunner } from './NeuralShowrunner.js';
import { ActionSyncService } from './ActionSyncService.js';
import { useStudioStore } from '@/stores/studio';
import { contextDataOrchestrator } from './ContextDataOrchestrator';
import api from '@/utils/api';

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

        // Phase 40 & Phase 34: Media Integration priority
        if (this.aiRequestQueue.length > 0 && this.aiRequestQueue[0].action === 'show_overlay' && this.aiRequestQueue[0].payload.type === 'b_roll_generated') {
             const highPriorityReq = this.aiRequestQueue.shift();
             this.lastSwitchTime = now;

             // Phase 34: Overwrite generated B-Roll with real Stock Video if applicable
             const query = highPriorityReq?.payload.topic || highPriorityReq?.payload.prompt || 'live stream';
             this.fetchStockMedia('video', query).then(stockMedia => {
                 if (stockMedia && stockMedia.url) {
                    highPriorityReq!.payload.url = stockMedia.url;
                    highPriorityReq!.payload.source = 'pexels';
                 }
                 // Dispatch via event so the render worker can pick up the B-Roll URL
                 if (typeof window !== 'undefined') {
                     window.dispatchEvent(new CustomEvent('studio:broll_ready', {
                         detail: { id: `broll_${Date.now()}`, url: highPriorityReq!.payload.url, topic: query }
                     }));
                 }
                 console.log(`[StudioDirector] B-Roll dispatched: ${highPriorityReq!.payload.url || 'no URL'} (source: ${highPriorityReq!.payload.source || 'ai-generated'})`);
             });

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
            // Chance to trigger a cinematic camera path or atmosphere change
            if (chatVelocity > 15 || voiceLevel > 0.3) {
                this.lastSwitchTime = now;
                return this.triggerCinematicPath(context);
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
                if (segmentType === 'product_showcase' && currentSceneId !== 'pip') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'pip' };
                }
                if (segmentType === 'closing' && currentSceneId !== 'standard') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'standard' };
                }
            }

            // Context-Aware Overrides (Phase 21)
            const studioStore = useStudioStore();
            const ctx = studioStore.streamingContext;

            switch(ctx) {
                case 'game_streaming':
                case 'sport':
                case 'commentary':
                    // Prefer PiP to keep the visual content dominant
                    if (voiceLevel > 0.15 && currentSceneId !== 'pip') {
                        this.lastSwitchTime = now;
                        return { action: 'switch_scene', payload: 'pip' };
                    }
                    break;
                case 'sales':
                case 'education':
                    // Focus on the presenter or the slides/product
                    if (voiceLevel > 0.3 && currentSceneId !== studioStore.getAutoBaseScene() && currentSceneId !== 'pip') {
                        this.lastSwitchTime = now;
                        return { action: 'switch_scene', payload: studioStore.getAutoBaseScene() };
                    }
                    break;
                case 'talkshow':
                    // Prefer side-by-side or interview for guests
                    if (activeGuests > 0 && currentSceneId !== 'interview' && currentSceneId !== 'sidebyside') {
                        this.lastSwitchTime = now;
                        return { action: 'switch_scene', payload: 'interview' };
                    }
                    break;
                case 'news':
                case 'gameshow':
                    // Professional center shot or full graphics
                    if (voiceLevel > 0.25 && currentSceneId !== studioStore.getAutoBaseScene()) {
                        this.lastSwitchTime = now;
                        return { action: 'switch_scene', payload: studioStore.getAutoBaseScene() };
                    }
                    break;
            }

            // IF: Host is talking loud and not centered
            if (voiceLevel > 0.25 && currentSceneId !== studioStore.getAutoBaseScene() && currentSceneId !== 'fullscreen') {
                this.lastSwitchTime = now;
                return { action: 'switch_scene', payload: studioStore.getAutoBaseScene() };
            }

            // IF: A guest is speaking and host is silent
            if (activeGuests > 0 && voiceLevel < 0.05) {
                const loudestGuestIndex = guestLevels.findIndex(lvl => lvl > 0.15);
                if (loudestGuestIndex !== -1 && currentSceneId !== 'shoutout') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: 'shoutout' };
                }

                // If multiple people speaking or just general discussion
                if (currentSceneId !== 'sidebyside' && currentSceneId !== 'interview' && currentSceneId !== 'sale_duo') {
                    this.lastSwitchTime = now;
                    return { action: 'switch_scene', payload: studioStore.getAutoBaseScene() };
                }
            }

            // IF: Silence/Quiet (Reaction/Wide Shot)
            if (voiceLevel < 0.02 && (activeGuests === 0 || guestLevels.every(l => l < 0.02))) {
                const base = studioStore.getAutoBaseScene();
                if (currentSceneId !== 'fullscreen' && currentSceneId !== base) {
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

    /**
     * Phase 33: Autonomous Cinematic Camera Orchestration.
     * Selects a dramatic camera path based on performance metrics and narrative context.
     */
    private triggerCinematicPath(context: any): { action: any, payload?: any } {
        const paths: any[] = ['orbit', 'slow_zoom', 'side_sweep', 'dramatic_low'];
        const vibe = this.vibe || 'neutral';
        
        // Weighting logic: Certain paths fit certain vibes better
        let selectedPath = paths[Math.floor(Math.random() * paths.length)];
        
        if (vibe === 'hype') selectedPath = Math.random() > 0.5 ? 'orbit' : 'side_sweep';
        if (vibe === 'dramatic') selectedPath = 'dramatic_low';
        if (vibe === 'chill') selectedPath = 'slow_zoom';

        // Identify target (most active speaker)
        const loudestIdx = (context.guestLevels || []).findIndex((l: number) => l > 0.1);
        const targetId = loudestIdx !== -1 ? `guest${loudestIdx + 1}` : 'host';

        console.log(`[StudioDirector] Cinematic Orchestration: [${selectedPath}] on [${targetId}] for vibe [${vibe}]`);

        // Variety choice: Either a camera path or a targeted atmosphere effect
        if (Math.random() > 0.3) {
            return { action: 'trigger_celebration', payload: { type: 'camera_path', path: selectedPath, target: targetId } };
        } else {
            const atmospheres = ['sakura', 'snow', 'glitter', 'fireflies'];
            const effect = atmospheres[Math.floor(Math.random() * atmospheres.length)];
            return { action: 'trigger_celebration', payload: { type: 'atmosphere', effect, target: targetId } };
        }
    }

    public setActive(active: boolean) {
        this.isActive = active;
        if (active) {
            contextDataOrchestrator.initialize();
        }
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

    /**
     * Phase 34: Fetches real stock media from integrated APIs to save AI generation costs.
     */
    public async fetchStockMedia(type: 'image' | 'video' | 'gif' | 'sound', query: string): Promise<any> {
        try {
            let endpoint = '';
            if (type === 'video') endpoint = `/media/pexels/videos?query=${encodeURIComponent(query)}&per_page=1`;
            else if (type === 'image') endpoint = `/media/unsplash/images?query=${encodeURIComponent(query)}&per_page=1`;
            else if (type === 'gif') endpoint = `/media/giphy/gifs?query=${encodeURIComponent(query)}&per_page=1`;
            
            if (endpoint) {
                const res = await api.get(endpoint);
                const items = res.data?.photos || [];
                if (items && items.length > 0) {
                    const item = items[0];
                    return {
                        id: item.id,
                        url: item.details.src,
                        preview: item.preview
                    };
                }
            }
            return null;
        } catch (err) {
            console.error('[StudioDirector] Fallback: Failed to fetch stock media', err);
            return null;
        }
    }

    /**
     * Phase 51: Applies a thematic visual layout based on the streaming context.
     * Moves guests to specific "thematic" slots instead of standard grid.
     */
    public applyThematicLayout(context: string) {
        const studioStore = useStudioStore();
        console.log(`[StudioDirector] Applying THEMATIC LAYOUT for: ${context}`);

        switch(context) {
            case 'news':
                // Anchor Desk: Host center, Guests in sidebar/circles
                studioStore.switchScene('standard');
                break;
            case 'sport':
                // Match Focus: Screen main, Commentators (Host+AI) in sidebar
                studioStore.switchScene('screen_focus');
                break;
            case 'sales':
                // Product Spotlight: Product/Screen center, Host side-by-side
                studioStore.switchScene('pip'); 
                break;
            case 'talkshow':
                // Circular layout (interview/grid)
                studioStore.switchScene('interview');
                break;
            case 'education':
                // Slide focus
                studioStore.switchScene('screen_focus');
                break;
            case 'gameshow':
                // High-energy grid
                studioStore.switchScene('supergrid');
                break;
            default:
                studioStore.switchScene('standard');
        }

        // Phase 51: Auto-assign slots for active guests to match the theme
        const activeGuests = studioStore.liveGuests;
        activeGuests.forEach((guest, index) => {
            // Logic to position guests based on their role or importance could go here
            studioStore.assignGuestToSlot(guest.uuid, index);
        });
    }
}

export const studioDirector = new StudioDirector();
