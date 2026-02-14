import { reactive, markRaw } from 'vue';
import api, { getFileUrl } from '@/utils/api';
import { aiAudioAnalyzer } from './AIAudioAnalyzer';
import { connections } from '@/composables/studio/useLiveChatManager';
import { ActionSyncService } from './ActionSyncService';
import { generateUUID } from '@/utils/uuid';
import { toast } from 'vue-sonner';

/**
 * Relationship Manager for tracking guest-to-guest and guest-to-viewer relationships
 */
class RelationshipManager {
    private guestAffinities: Map<string, Map<string, number>> = new Map(); // guestId -> guestId -> affinity
    private viewerAffinities: Map<string, number> = new Map(); // viewerName -> affinity

    recordGuestInteraction(guestA: string, guestB: string, type: 'friendly' | 'rivalry') {
        if (!this.guestAffinities.has(guestA)) this.guestAffinities.set(guestA, new Map());
        const current = this.guestAffinities.get(guestA)!.get(guestB) || 0;
        const delta = type === 'friendly' ? 0.1 : -0.1;
        this.guestAffinities.get(guestA)!.set(guestB, Math.max(-1, Math.min(1, current + delta)));
    }

    getGuestAffinity(guestA: string, guestB: string): number {
        return this.guestAffinities.get(guestA)?.get(guestB) || 0;
    }

    recordViewerInteraction(viewerName: string, type: 'chat' | 'gift', value: number = 1) {
        const current = this.viewerAffinities.get(viewerName) || 0;
        const delta = type === 'gift' ? value * 0.05 : 0.02;
        this.viewerAffinities.set(viewerName, Math.min(1, current + delta));
    }

    getViewerAffinity(viewerName: string): number {
        return this.viewerAffinities.get(viewerName) || 0;
    }
}

/**
 * Interface for a Synthetic AI Guest persona (VTuber).
 * Supports full VTuber schema with backward compatibility.
 */
export interface AIGuestPersona {
    // Primary identifier
    uuid: string; // Primary unique identifier (generated on creation)
    
    // New VTuber Schema
    entityId?: string;
    identity?: {
        name: string;
        description: string;
        backstory?: string;
        role?: 'host' | 'guest' | 'moderator';
        traits?: string[];
    };
    visual?: {
        modelType?: 'vrm' | 'live2d' | 'image' | 'static' | '3d';
        modelUrl?: string;
        backgroundUrl?: string;
        thumbnailUrl?: string;
        activePropId?: string;
        live2dConfig?: {
            zoom?: number;
            offset?: { x: number; y: number };
            idleMotion?: string;
            talkMotion?: string;
            scale?: number;
            position?: { x: number; y: number };
        };
    };
    meta?: {
        voiceConfig?: {
            provider: 'gemini' | 'google' | string;
            voiceId: string;
            language?: string;
        };
        loras?: Array<{ id: string; weight: number }>;
    };
    performanceConfig?: {
        auraEnabled?: boolean;
        auraColor?: string;
        particleType?: 'sakura' | 'snow' | 'glitter' | null;
        particleDensity?: number;
        lightingPreset?: 'studio' | 'neon' | 'dramatic' | 'vocal_orange';
        dynamicLighting?: boolean;
        lightingIntensity?: number;
        activeCameraPath?: 'orbit' | 'slow_zoom' | 'side_sweep' | 'dramatic_low' | null;
        cameraIntensity?: number;
        autoDirectorEnabled?: boolean;
        lyricsEnabled?: boolean;
        lyricsStyle?: 'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale';
        lyricsPosition?: 'top' | 'center' | 'bottom';
        backgroundMusic?: any;
        lyrics?: any[];
    };
    animationConfig?: {
        gestureIntensity?: number;
        headTiltRange?: number;
        nodIntensity?: number;
    };
    memory?: {
        knowledgeEntries?: Array<{ title: string; content: string }>;
    };
    social?: {
        relationships?: Array<{ targetName: string; type: string; level: number }>;
    };

    // Legacy fields for backward compatibility (display only)
    name?: string; // Maps to identity.name
    avatarId?: string;
    voiceId?: string;
    voiceConfig?: {
        provider: string;
        voiceId: string;
        language?: string;
    };
    description?: string; // Maps to identity.description
    traits?: string[]; // Maps to identity.traits
    role?: 'host' | 'guest' | 'moderator'; // Maps to identity.role
    avatarUrl?: string; // Maps to visual.thumbnailUrl
    
    // Runtime state (not persisted)
    emotion?: string;
    gesture?: string;
    active?: boolean;
    isSpeaking?: boolean;
    isThinking?: boolean;
    isLiveVoiceActive?: boolean;
    isVisionActive?: boolean;
    isMaster?: boolean;
    personality?: string;
    customization?: any;
}

/**
 * Service to manage virtual AI guests (VTubers) in the Studio.
 */
export class SyntheticGuestManager {
    private activeGuests = reactive(new Map<string, { 
        persona: AIGuestPersona, 
        isSpeaking: boolean, 
        isThinking: boolean,
        emotion?: string,
        gesture?: string
    }>());
    private audioAnalysers: Map<string, { stop: () => void }> = new Map();
    // Reactive state for Vue components
    public reactiveGuests: any = null; // Will be set by useSyntheticGuests hook
    private conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [];
    private readonly MAX_HISTORY = 10;
    private relationshipManager: RelationshipManager;
    private studioStore: any = null;
    private activeArchiveId: string | null = null;
    private dialogueLock: string | null = null; // ID of the guest currently speaking

    constructor() {
        this.relationshipManager = new RelationshipManager();
        this.setupSocketListeners();
    }

    private banterTimer: any = null;
    private lastActivityTimestamp: number = Date.now();
    private chatHypeScore: number = 0;
    private recentChatSentiment: string[] = [];
    private hypeDecayTimer: any = null;

    private setupSocketListeners() {
        const socket = ActionSyncService.getSocket();
        if (socket) {
            socket.on('economy:gift_received', (data: any) => {
                this.resetBanterTimer();
                this.relationshipManager.recordViewerInteraction(data.userName, 'gift', data.item.cost);
                this.handleGlobalGiftReaction(data);
            });
            socket.on('comment:new', (data: any) => {
                this.resetBanterTimer();
                this.relationshipManager.recordViewerInteraction(data.userName || data.author, 'chat');
                this.handleGlobalChatReaction(data);
            });
            socket.on('studio:viral_peak', (data: any) => {
                this.resetBanterTimer();
                this.handleViralPeakReaction(data);
            });
        }
        this.resetBanterTimer();
        this.startHypeDecay();
    }

    public init(studioStore: any) {
        this.studioStore = studioStore;
        console.log('[VTuberManager] Initialized with StudioStore');
    }

    private startHypeDecay() {
        if (this.hypeDecayTimer) clearInterval(this.hypeDecayTimer);
        this.hypeDecayTimer = setInterval(() => {
            if (this.chatHypeScore > 0) {
                this.chatHypeScore = Math.max(0, this.chatHypeScore - 0.05);
                this.notifyWorker('update-hype-level', { level: this.chatHypeScore });
            }
        }, 2000);
    }

    private isHost(): boolean {
        // Simple role check based on URL, or could use studio store
        return !window.location.search.includes('role=guest');
    }

    public resetBanterTimer() {
        this.lastActivityTimestamp = Date.now();
        if (this.banterTimer) clearTimeout(this.banterTimer);
        
        if (!this.isHost()) return;

        // Autonomous banter every 45-90 seconds of silence
        const delay = 45000 + Math.random() * 45000;
        this.banterTimer = setTimeout(() => {
            this.triggerRandomBanter();
        }, delay);
    }

    private pollForSilence(guestId: string, callback: () => void) {
        const check = () => {
            const guest = this.activeGuests.get(guestId);
            if (guest && !guest.isSpeaking && !guest.isThinking) {
                setTimeout(callback, 1000); // Small pause between speakers
            } else {
                setTimeout(check, 500);
            }
        };
        setTimeout(check, 1000);
    }

    private async triggerRandomBanter() {
        if (this.isAnyGuestSpeaking()) {
            this.resetBanterTimer();
            return;
        }

        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length < 2) {
             this.resetBanterTimer();
             return;
        }

        // Pick two guests for a quick exchange
        const idA = activeIds[Math.floor(Math.random() * activeIds.length)];
        let idB = activeIds[Math.floor(Math.random() * activeIds.length)];
        while (idA === idB) {
            idB = activeIds[Math.floor(Math.random() * activeIds.length)];
        }

        const guestA = this.activeGuests.get(idA)!;
        const guestB = this.activeGuests.get(idB)!;

        // Phase 93: Relationship-aware banter
        const affinity = this.relationshipManager.getGuestAffinity(idA, idB);
        let socialContext = 'casual';
        if (affinity < -0.5) socialContext = 'rivalry';
        else if (affinity > 0.5) socialContext = 'friendship';

        console.log(`[VTuberBanter] Social Dialogue (${socialContext}): ${guestA.persona.name} -> ${guestB.persona.name}`);

        const resA = await this.generateResponse(idA, `Say something to ${guestB.persona.name}. (Relationship: ${socialContext}).`, {
            vibe: socialContext,
            targetGuest: guestB.persona.name
        } as any);

        if (resA) {
            // Update relationship after interaction
            this.relationshipManager.recordGuestInteraction(idA, idB, 'friendly');
            
            this.pollForSilence(idA, async () => {
                await this.generateResponse(idB, `${guestA.persona.name} said: "${resA.text}". Reply to them. (Relationship: ${socialContext}).`, {
                    vibe: socialContext,
                    targetGuest: guestA.persona.name
                } as any);
                this.relationshipManager.recordGuestInteraction(idB, idA, 'friendly');
                this.resetBanterTimer();
            });
        } else {
            this.resetBanterTimer();
        }
    }

    private async handleGlobalChatReaction(data: any) {
        const text = data.text.toLowerCase();
        const userName = data.userName || data.author || 'Viewer';
        
        // Phase 93: Recognise Frequent Viewers
        const viewerAffinity = this.relationshipManager.getViewerAffinity(userName);
        let socialNote = '';
        if (viewerAffinity > 0.8) socialNote = `(This is a legendary fan!)`;
        else if (viewerAffinity > 0.4) socialNote = `(This is a regular viewer.)`;

        // 1. Update Hype Score (Poggers Detection)
        
        // 1. Update Hype Score (Poggers Detection)
        const hypeKeywords = ['lol', 'lmfao', 'pog', 'wow', 'gg', 'hype', 'lfg', 'omg', 'holy', 'fire'];
        const trollKeywords = ['stfu', 'bad', 'suck', 'dumb', 'fake', 'scam', 'hate', 'ratio', 'garbage'];
        
        let hypeInc = 0;
        hypeKeywords.forEach(k => { if (text.includes(k)) hypeInc += 0.2; });
        if (data.text === data.text.toUpperCase() && data.text.length > 5) hypeInc += 0.3; // All caps
        
        this.chatHypeScore = Math.min(2.0, this.chatHypeScore + hypeInc);
        this.notifyWorker('update-hype-level', { level: this.chatHypeScore });

        // 2. Troll Management (Deflection)
        const isTroll = trollKeywords.some(k => text.includes(k));
        if (isTroll && Math.random() > 0.5 && !this.isAnyGuestSpeaking()) {
             const activeIds = Array.from(this.activeGuests.keys());
             if (activeIds.length > 0) {
                 const speakerId = activeIds[Math.floor(Math.random() * activeIds.length)];
                 console.log(`[VTuberManager] Troll detected, ${speakerId} deflecting: "${data.text}"`);
                 this.generateResponse(speakerId, `(Someone is being negative in chat: "${data.text}"). Deflect them with humor or kill them with kindness. Stay in character but don't let it ruin the vibe.`, {
                     vibe: 'witty',
                     isTrollDeflection: true
                 } as any);
                 return;
             }
        }

        // 3. Autonomous Interjection (Hype Response)
        if (this.chatHypeScore > 1.2 && Math.random() > 0.7 && !this.isAnyGuestSpeaking()) {
             const activeIds = Array.from(this.activeGuests.keys());
             if (activeIds.length > 0) {
                 const speakerId = activeIds[Math.floor(Math.random() * activeIds.length)];
                 console.log(`[VTuberManager] Hype detected! ${speakerId} interjecting.`);
                 this.generateResponse(speakerId, `${socialNote} The chat is going wild! Join the hype! React to: "${data.text}"`, {
                     vibe: 'excited',
                     isHypeInterjection: true,
                     viewerName: userName
                 } as any);
                 return;
             }
        }

        // 4. Probabilistic standard response (Existing)
        if (Math.random() > 0.2) return;
        if (this.isAnyGuestSpeaking()) return;

        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        const speakingId = activeIds[Math.floor(Math.random() * activeIds.length)];
        this.generateResponse(speakingId, `${socialNote} Answer chat: "${data.text}"`, {
            type: 'chat',
            userName: userName,
            content: data.text
        } as any);
    }

    private personaLibrary: AIGuestPersona[] = reactive([
        {
            uuid: 'sh_nexus_uuid',
            id: 'sh_nexus', // Legacy support if needed, or remove if interface strict
            name: 'Nexus Prime',
            avatarId: 'nexus',
            voiceId: 'en-US-Neural2-F',
            description: 'You are a highly technical AI expert.',
            traits: ['analytical', 'direct', 'brilliant'],
            role: 'guest',
            visual: { modelUrl: '/assets/models/ai_guest_base.glb', modelType: '3d' }
        }
    ]);

    /**
     * Set persona library from VTuber data array.
     */
    public setLibrary(vtubers: any[]) {
        console.log(`[VTuberManager] Setting library with ${vtubers.length} items...`);
        try {
            const synced = vtubers.map((vtuber: any) => this.mapVTuberToPersona(vtuber));
            
            // Clear and update reactive array
            this.personaLibrary.length = 0;
            this.personaLibrary.push(...synced);
            console.log(`[VTuberManager] Successfully set ${this.personaLibrary.length} VTubers.`);
        } catch (e) {
            console.error('[VTuberManager] Failed to set library:', e);
        }
    }

    /**
     * Synchronize library with VTuber Library API
     */
    public async syncLibrary() {
        console.log('[VTuberManager] Synchronizing library via API...');
        try {
            const response = await api.get('/vtuber/list');
            const data = response.data;
            console.log('[VTuberManager] Raw API response:', data);
            
            const list = data.data || (Array.isArray(data) ? data : []);
            
            if (Array.isArray(list)) {
                this.setLibrary(list);
            } else {
                console.warn('[VTuberManager] API returned non-array data:', list);
            }
        } catch (e) {
            console.error('[VTuberManager] Failed to sync library:', e);
        }
    }

    private mapVTuberToPersona(vtuber: any): AIGuestPersona {
        console.log('[VTuberManager] Mapping VTuber:', vtuber.name || vtuber.identity?.name);
        // Helper to safely get nested values
        const getName = () => vtuber.identity?.name || vtuber.name || 'Unnamed VTuber';
        const getDescription = () => vtuber.identity?.description || vtuber.description || '';
        const getTraits = () => vtuber.identity?.traits || vtuber.traits || [];
        const getRole = () => vtuber.identity?.role || vtuber.role || 'guest';
        const getVoiceConfig = () => vtuber.meta?.voiceConfig || vtuber.voiceConfig || {
            provider: 'gemini',
            voiceId: vtuber.meta?.voiceId || vtuber.voiceId || 'en-US-Neural2-F',
            language: 'en-US'
        };

        // Generate UUID for this persona
        const uuid = vtuber.uuid || generateUUID();
        const entityId = vtuber.entityId || vtuber._id || uuid;

        return {
            // Primary identifier
            uuid: uuid,
            
            // New VTuber Schema
            entityId: entityId,
            identity: {
                name: getName(),
                description: getDescription(),
                backstory: vtuber.identity?.backstory,
                role: getRole() as 'host' | 'guest' | 'moderator',
                traits: getTraits()
            },
            visual: {
                modelType: vtuber.visual?.modelType || (vtuber.visual?.modelUrl?.endsWith('.vrm') || vtuber.visual?.modelUrl?.endsWith('.glb') ? 'vrm' : (vtuber.visual?.modelUrl?.endsWith('.zip') || vtuber.visual?.modelUrl?.endsWith('.json') ? 'live2d' : 'image')),
                modelUrl: vtuber.visual?.modelUrl || '/assets/models/ai_guest_base.glb',
                backgroundUrl: vtuber.visual?.backgroundUrl,
                thumbnailUrl: vtuber.visual?.thumbnailUrl,
                activePropId: vtuber.visual?.activePropId,
                live2dConfig: vtuber.visual?.live2dConfig || {}
            },
            // Added for VirtualStudioStage compatibility (Phase 64)
            visualIdentity: {
                live2dModelUrl: vtuber.visual?.modelUrl,
                thumbnailUrl: vtuber.visual?.thumbnailUrl
            },
            meta: {
                voiceConfig: getVoiceConfig(),
                loras: vtuber.meta?.loras || []
            },
            performanceConfig: vtuber.performanceConfig || {
                auraEnabled: false,
                auraColor: '#00f2ff',
                particleType: null,
                particleDensity: 0.4,
                lightingPreset: 'studio',
                dynamicLighting: false,
                lightingIntensity: 1.0,
                activeCameraPath: null,
                cameraIntensity: 1.0,
                autoDirectorEnabled: false,
                lyricsEnabled: false,
                lyricsStyle: 'neon'
            },
            animationConfig: vtuber.animationConfig || {
                gestureIntensity: 0.5,
                headTiltRange: 0.5,
                nodIntensity: 0.5
            },
            memory: vtuber.memory || { knowledgeEntries: [] },
            social: vtuber.social || { relationships: [] },

            // Legacy compatibility fields (display only)
            name: getName(),
            avatarId: uuid,
            voiceId: getVoiceConfig().voiceId,
            voiceConfig: getVoiceConfig(),
            description: getDescription(),
            traits: getTraits(),
            role: getRole() as 'host' | 'guest' | 'moderator',
            avatarUrl: vtuber.visual?.thumbnailUrl,

            // Runtime state (default values)
            emotion: 'neutral',
            gesture: undefined,
            active: false,
            isSpeaking: false,
            isThinking: false,
            isLiveVoiceActive: false,
            isVisionActive: false,
            isMaster: false
        } as AIGuestPersona;
    }

    public getPersonaLibrary() {
        return this.personaLibrary;
    }

    public async summonGuest(persona: AIGuestPersona) {
        // Generate UUID if not present
        if (!persona.uuid) {
            persona.uuid = generateUUID();
        }
        
        if (this.activeGuests.has(persona.uuid)) return;

        this.activeGuests.set(persona.uuid, { persona, isSpeaking: false, isThinking: false });
        
        // Sync with StudioStore for layout rendering
        if (this.studioStore) {
            this.studioStore.addGuest({
                uuid: persona.uuid,
                name: persona.name || persona.identity?.name || 'AI Guest',
                type: 'ai',
                status: 'live',
                audioEnabled: true,
                videoEnabled: true,
                avatar: persona.visual?.thumbnailUrl
            });
            
            // Auto-switch layout for better visibility
            this.studioStore.setCameraFocus('wide');
        }

        toast.success(`AI Orchestrator: Summoned ${persona.name || persona.identity?.name} to the Studio.`);
        console.log('[VTuberManager] Summoning guest visual state:', persona.visual);

        // Notify rendering worker to add 3D model ONLY if it is a 3D type (VRM)
        if (persona.visual?.modelType === 'vrm' || persona.visual?.modelType === '3d') {
            this.notifyWorker('add-3d-guest', {
                id: persona.uuid,
                modelUrl: persona.visual?.modelUrl ? getFileUrl(persona.visual.modelUrl) : undefined,
                textureUrl: persona.visual?.thumbnailUrl ? getFileUrl(persona.visual.thumbnailUrl) : undefined
            });
        }
    }

    public removeGuest(id: string) {
        this.stopSpeaking(id);
        this.activeGuests.delete(id);
        if (this.studioStore) {
            this.studioStore.removeGuest(id);
        }

        // Notify rendering worker to clean up 3D model resources
        this.notifyWorker('remove-stream', { id });
    }

    /**
     * Stop the guest from speaking immediately (Interruption)
     */
    public interrupt(id: string) {
        this.stopSpeaking(id);
        const guest = this.activeGuests.get(id);
        if (guest) {
             guest.isThinking = false;
             // Also notify worker to stop any ongoing viseme animations if possible
             this.notifyWorker('update-3d-audio', { id: `guest_${id}`, audioLevel: 0 });
        }
    }

    /**
     * Triggers a synthetic guest response based on a prompt.
     * Unified with talk() to use pure WebSocket transport.
     */
    public async generateResponse(guestId: string, prompt: string, context?: any): Promise<{ text: string, audioUrl: string, action?: string, actionPayload?: any } | null> {
        return this.talk(guestId, prompt, context);
    }

    /**
     * Core dialogue generation logic via WebSocket (Unified Transport)
     */
    public async talk(guestId: string, prompt: string, context?: any): Promise<{ text: string, audioUrl: string, action?: string, actionPayload?: any } | null> {
        const guest = this.activeGuests.get(guestId);
        if (!guest) return null;

        guest.isThinking = true;
        this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: true });

        const enrichedContext = {
            ...context,
            history: this.conversationHistory,
            guestId,
            guestName: guest.persona.identity?.name || guest.persona.name || 'AI'
        };

        try {
            // Use WebSocket for Unified Transport
            const { connections } = await import('../../composables/studio/useLiveChatManager');
            const connection = connections[guestId];

            if (connection && connection.isConnected) {
                console.log(`[SyntheticGuest] Using WebSocket transport for ${guestId}`);
                
                const originalCallback = (connection.geminiLive as any).textResponseCallback;
                
                return new Promise((resolve) => {
                    connection.geminiLive.setTextResponseCallback((text: string, metadata?: any) => {
                        console.log(`[SyntheticGuest] Received WS response for ${guestId}:`, text.substring(0, 30));
                        
                        // Update Memory
                        this.conversationHistory.push({ role: 'user', content: prompt });
                        this.conversationHistory.push({ role: 'assistant', content: text });
                        if (this.conversationHistory.length > this.MAX_HISTORY * 2) {
                            this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY * 2);
                        }

                        // Update State & Worker
                        guest.isThinking = false;
                        this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: false });

                        // Handle Metadata (Emotions/Gestures)
                        if (metadata?.isConsolidated) {
                            const { emotion, gesture } = metadata;
                            if (emotion) {
                                guest.emotion = emotion;
                                this.notifyWorker('update-3d-expression', { 
                                    id: `guest_${guestId}`, 
                                    emotion, 
                                    gesture: gesture || 'normal' 
                                });
                                if (['excited', 'happy', 'angry', 'surprised'].includes(emotion)) {
                                    this.broadcastGroupMood(guestId, emotion);
                                }
                            }
                            if (gesture) guest.gesture = gesture;
                        }

                        // Restore original callback
                        if (typeof originalCallback === 'function') originalCallback(text, metadata);
                        
                        // Release lock after a short delay to allow audio to finish 
                        // Actually, isAudioPlaying will handle the "is speaking" check next time
                        if (this.dialogueLock === guestId) {
                            setTimeout(() => {
                                if (this.dialogueLock === guestId) this.dialogueLock = null;
                            }, 5000); // 5s buffer or wait for audio?
                        }

                        resolve({ 
                            text, 
                            audioUrl: '', 
                            action: 'none'
                        });
                    });

                    this.dialogueLock = guestId;
                    connection.geminiLive.sendPrompt(prompt, enrichedContext);
                });
            } else {
                console.warn(`[SyntheticGuest] WebSocket connection not available for ${guestId}. Skipping dialogue generation.`);
                guest.isThinking = false;
                this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: false });
                return { text: "...", audioUrl: '', action: 'none' };
            }
        } catch (error: any) {
            console.error(`[SyntheticGuest] Talk failed for ${guestId}:`, error.message);
            if (this.dialogueLock === guestId) this.dialogueLock = null;
            guest.isThinking = false;
            this.notifyWorker('update-3d-thinking', { id: `guest_${guestId}`, isThinking: false });
            return null;
        }
    }

    /**
     * Directly trigger a gesture animation for a guest.
     */
    public triggerGesture(id: string, gesture: string) {
        this.manualGesture(id, gesture);
    }

    public manualGesture(id: string, gesture: string) {
        const guest = this.activeGuests.get(id);
        if (guest) {
            guest.gesture = gesture;
            this.notifyWorker('update-3d-expression', { id: `guest_${id}`, gesture });
            
            // Auto-clear gesture after a few seconds or keep it until next interaction
            setTimeout(() => {
                if (guest.gesture === gesture) guest.gesture = '';
            }, 5000);
        }
    }

    /**
     * Quick emotion update for live performance
     */
    public setEmotion(id: string, emotion: string) {
        const guest = this.activeGuests.get(id);
        if (guest) {
            guest.emotion = emotion;
            guest.persona.emotion = emotion;
            this.notifyWorker('update-3d-expression', { id: `guest_${id}`, emotion });
        }
    }

    /**
     * Update animation config for a guest
     */
    public updateAnimation(id: string, config: any) {
        const guest = this.activeGuests.get(id);
        if (guest && guest.persona.animationConfig) {
            guest.persona.animationConfig = { ...guest.persona.animationConfig, ...config };
            this.notifyWorker('update-3d-animation', { 
                id: `guest_${id}`, 
                config: guest.persona.animationConfig 
            });
        }
    }

    /**
     * Update performance config for a guest
     */
    public updatePerformance(id: string, config: any) {
        const guest = this.activeGuests.get(id);
        if (guest && guest.persona.performanceConfig) {
            guest.persona.performanceConfig = { ...guest.persona.performanceConfig, ...config };
            this.notifyWorker('update-3d-performance', { 
                id: `guest_${id}`, 
                config: guest.persona.performanceConfig 
            });
        }
    }

    /**
     * Set background for a guest
     */
    public setBackground(id: string, backgroundUrl: string) {
        const guest = this.activeGuests.get(id);
        if (guest && guest.persona.visual) {
            guest.persona.visual.backgroundUrl = backgroundUrl;
            this.notifyWorker('update-3d-background', { 
                id: `guest_${id}`, 
                backgroundUrl 
            });
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

    public isAnyGuestSpeaking(): boolean {
        // 1. Check thinking/local speaking states
        const anyActiveState = Array.from(this.activeGuests.values()).some(g => g.isSpeaking || g.isThinking);
        if (anyActiveState || this.dialogueLock) return true;

        // 2. Check WebSocket audio playback states from shared connections
        if (connections) {
            return Object.values(connections).some((conn: any) => 
                conn.isConnected && (conn.isSpeaking || conn.isAudioPlaying)
            );
        }

        return false;
    }

    private handleGlobalGiftReaction(data: any) {
        // 1. All guests celebrate visually
        for (const guestId of this.activeGuests.keys()) {
            this.triggerVisualGiftEffect(guestId, data.item);
        }

        // 2. Pick ONE guest to react vocally if nobody is speaking
        if (!this.isAnyGuestSpeaking()) {
            const activeIds = Array.from(this.activeGuests.keys());
            if (activeIds.length > 0) {
                // Prioritize Master/Host if available
                const masterId = activeIds.find(id => this.activeGuests.get(id)?.persona.isMaster);
                const speakingId = masterId || activeIds[Math.floor(Math.random() * activeIds.length)];
                
                const affinity = this.relationshipManager.getViewerAffinity(data.userName);
                let socialPrompt = `Thank you for the ${data.item.name}!`;
                if (affinity > 0.7) socialPrompt = `Our legendary fan ${data.userName} just sent a ${data.item.name}! Give them a massive special shoutout!`;

                this.generateResponse(speakingId, socialPrompt, {
                    type: 'gift',
                    userName: data.userName,
                    giftName: data.item.name,
                    amount: data.item.cost
                } as any);
            }
        }
    }

    private triggerVisualGiftEffect(guestId: string, item: any) {
        const guest = this.activeGuests.get(guestId);
        if (!guest) return;

        let emotion = 'happy';
        let gesture = 'nod';
        let particleType: any = null;

        switch(item.id) {
            case 'gift_rose':
                emotion = 'love';
                particleType = 'sakura';
                gesture = 'bashful';
                break;
            case 'gift_rocket':
                emotion = 'excited';
                particleType = 'glitter';
                gesture = 'victory';
                break;
            case 'gift_coffee':
                emotion = 'happy';
                gesture = 'nod';
                break;
            case 'sticker_fire':
                emotion = 'surprised';
                particleType = 'glitter';
                break;
        }

        this.setEmotion(guestId, emotion);
        if (gesture) this.triggerGesture(guestId, gesture);
        
        if (particleType) {
            this.updatePerformance(guestId, { 
                particleType,
                particleDensity: 0.8 
            });

            setTimeout(() => {
                this.updatePerformance(guestId, { 
                    particleType: guest.persona.performanceConfig?.particleType || null,
                    particleDensity: guest.persona.performanceConfig?.particleDensity || 0.4
                });
            }, 6000);
        }
    }

    /**
     * Legacy method kept for backward compatibility if called directly
     */
    private triggerGiftEffect(guestId: string, item: any) {
        this.triggerVisualGiftEffect(guestId, item);
    }

    private async handleViralPeakReaction(data: any) {
        if (this.isAnyGuestSpeaking()) return;

        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        // Pick the master guest if available, else random
        const speakerId = activeIds.find(id => this.activeGuests.get(id)?.persona.isMaster) || activeIds[0];
        const guest = this.activeGuests.get(speakerId)!;

        console.log(`[VTuberProducer] Reaction to Peak: ${data.reason}`);

        // AI Producer Vocal Response
        const prompt = `That was an incredible moment! People are saying: "${data.reason}". announce that you are clipping this for the highlights! Be energetic and excited.`;
        
        await this.generateResponse(speakerId, prompt, { 
            vibe: 'excited',
            peakReason: data.reason
        } as any);
    }

    public async handleManualHighlight() {
        if (this.isAnyGuestSpeaking()) return;

        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        const speakerId = activeIds[Math.floor(Math.random() * activeIds.length)];
        const prompt = `The host just marked a highlight! Confirm that you've got the clip saved and express excitement. Say something like "Captured!" or "That's going in the reel!"`;
        
        await this.generateResponse(speakerId, prompt, { vibe: 'happy' } as any);

        // Phase 93: Synchronized Reaction
        activeIds.forEach(id => {
            if (id !== speakerId) {
                this.setEmotion(id, 'happy');
                this.triggerGesture(id, 'nod');
            }
        });
    }

    /**
     * Phase 93: Group Mood Influencing
     * If one guest is very emotional, others catch the vibe.
     */
    private broadcastGroupMood(sourceId: string, emotion: string) {
        for (const [id, guest] of this.activeGuests.entries()) {
            if (id === sourceId || guest.isSpeaking) continue;
            
            // 30% chance to catch the vibe
            if (Math.random() > 0.7) {
                console.log(`[VTuberSocial] ${guest.persona.name} caught the ${emotion} vibe from ${sourceId}`);
                this.setEmotion(id, emotion);
            }
        }
    }

    /**
     * Proactively request a vision snapshot of the studio.
     */
    public requestVisionSnapshot(guestId: string) {
        this.notifyWorker('vision:request_snapshot', { id: `guest_${guestId}` });
    }
}



export const syntheticGuestManager = new SyntheticGuestManager();
