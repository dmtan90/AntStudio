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
        modelType?: 'vrm' | 'live2d' | 'image' | 'static' | '3d' | 'aidol';
        modelUrl?: string;
        backgroundUrl?: string;
        thumbnailUrl?: string;
        activePropId?: string;
        aidolClips?: Record<string, string>;
        aidolPrompts?: Record<string, string>;
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

    // Added for VirtualStudioStage compatibility (Phase 64)
    visualIdentity?: {
        modelUrl?: string;
        thumbnailUrl?: string;
    };
}

/**
 * Service to manage virtual AI guests (VTubers) in the Studio.
 */
export class SyntheticGuestManager {
    public activeGuests = reactive(new Map<string, { 
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
    
    private currentDirective: string = '';
    private currentVibe: string = 'neutral';

    private banterTimer: any = null;
    private lastActivityTimestamp: number = Date.now();
    public chatHypeScore: number = 0;
    private recentChatSentiment: string[] = [];
    private hypeDecayTimer: any = null;
    public guestEngagementScores = reactive(new Map<string, number>());
    private engagementDecayTimer: any = null;

    constructor() {
        this.relationshipManager = new RelationshipManager();
        this.setupSocketListeners();
        this.setupDirectiveListeners();
    }

    private setupDirectiveListeners() {
        window.addEventListener('showrunner:directive', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.log(`[VTuberManager] Received Neural Directive: [${detail.type}] - ${detail.directive}`);
            
            // Influence the next autonomous banter or response
            this.currentDirective = detail.directive;
            this.currentVibe = detail.vibe;

            // Immediately trigger an opening line if it's an intro
            if (detail.type === 'intro') {
                this.triggerAutonomousIntervention(detail.directive);
            }

            // Phase 35: Autonomous Product Pitch
            if (detail.type === 'product_showcase' && detail.productContext) {
                this.handleAutonomousProductPitch(detail.productContext, detail.directive);
            }

            // Phase 36: Neural Knowledge Injection
            if (detail.type === 'research_injection' && detail.knowledgeContext) {
                this.handleKnowledgeInjection(detail.knowledgeContext, detail.directive);
            }
        });
    }

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

        // --- ShowRunner Integration ---
        window.addEventListener('showrunner:dialogue', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail || !detail.text) return;

            let targetGuest: { uuid: string, persona: AIGuestPersona } | null = null;
            
            for (const [uuid, state] of this.activeGuests.entries()) {
                if (detail.agentId === 'host' && state.persona.role === 'host') {
                    targetGuest = { uuid, persona: state.persona };
                    break;
                } else if (state.persona.name?.toLowerCase().includes(detail.agentId.toLowerCase())) {
                    targetGuest = { uuid, persona: state.persona };
                    break;
                }
            }

            // Fallback to the first available guest
            if (!targetGuest && this.activeGuests.size > 0) {
                const firstKey = Array.from(this.activeGuests.keys())[0];
                targetGuest = { uuid: firstKey, persona: this.activeGuests.get(firstKey)!.persona };
            }

            if (targetGuest) {
                console.log(`[VTuberManager] ShowRunner directing ${targetGuest.persona.name} to speak: ${detail.text}`);
                this.talk(targetGuest.uuid, `[DIRECTOR INSTRUCTION: Say exactly this line, do not add anything else] "${detail.text}"`, { vibe: detail.emotion });
            }
        });

        this.resetBanterTimer();
        this.startHypeDecay();
        this.startEngagementDecay();
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
                
                // Phase 33: Autonomous Viral Peak
                if (this.chatHypeScore > 1.8) {
                    const socket = ActionSyncService.getSocket();
                    if (socket) {
                        socket.emit('studio:viral_peak', {
                            reason: 'Extreme Chat Hype! 🚀',
                            intensity: this.chatHypeScore
                        });
                        // Reset score slightly to avoid spamming
                        this.chatHypeScore = 1.2;
                    }
                }
            }
        }, 2000);
        
        this.startAutonomyLoop();
    }

    private autonomyTimer: any = null;
    private startAutonomyLoop() {
        if (this.autonomyTimer) clearInterval(this.autonomyTimer);
        this.autonomyTimer = setInterval(() => {
            this.processAutonomousImpulses();
        }, 10000); // Check every 10s
    }

    private lastActionTime: Map<string, number> = new Map();

    private async processAutonomousImpulses() {
        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        const now = Date.now();
        const anySpeaking = this.isAnyGuestSpeaking();

        // Phase 33: Autonomous Interruption Logic
        if (anySpeaking) {
            for (const guestId of activeIds) {
                const guest = this.activeGuests.get(guestId);
                if (!guest || guest.isSpeaking || guest.isThinking) continue;

                const traits = guest.persona.traits || [];
                // Only "Energetic" or "Dominant" guests interrupt
                if (traits.includes('ENERGETIC') || traits.includes('DOMINANT')) {
                    if (Math.random() < 0.05) { // 5% chance per tick to interrupt
                        console.log(`[VTuberManager] ${guest.persona.name} is INTERRUPTING!`);
                        this.generateResponse(guestId, `[INTERRUPTION] Someone else is talking, but you have something urgent to say! Jump in and take control of the conversation.`, {
                            vibe: 'assertive'
                        } as any);
                        return; // One interruption at a time
                    }
                }
            }
            return; // Don't do other impulses if someone is speaking
        }

        for (const guestId of activeIds) {
            const guest = this.activeGuests.get(guestId);
            if (!guest || guest.isSpeaking || guest.isThinking) continue;

            const traits = guest.persona.traits || [];
            const isEnergetic = traits.includes('ENERGETIC');
            const isCalm = traits.includes('CALM');
            
            const lastTime = this.lastActionTime.get(guestId) || 0;
            const cooldown = isEnergetic ? 15000 : (isCalm ? 45000 : 25000);
            
            if (now - lastTime < cooldown) continue;

            const chance = isEnergetic ? 0.4 : (isCalm ? 0.15 : 0.25);
            if (Math.random() > chance) continue;

            const actionWeights: Record<string, number> = {
                'look_around': 1.0,
                'drink': 0.5,
                'check_phone': 0.5
            };

            if (traits.includes('MYSTERIOUS')) actionWeights['look_around'] += 1.0;
            if (traits.includes('FRIENDLY')) actionWeights['look_around'] += 0.5;

            const totalWeight = Object.values(actionWeights).reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;
            let selectedAction = 'look_around';
            
            for (const [action, weight] of Object.entries(actionWeights)) {
                if (random < weight) {
                    selectedAction = action;
                    break;
                }
                random -= weight;
            }
            
            this.triggerGesture(guestId, selectedAction);
            this.lastActionTime.set(guestId, now);

            // Notify UI for logging
            const actionKeyMap: Record<string, string> = {
                'drink': 'aiGestureDrink',
                'check_phone': 'aiGesturePhone',
                'look_around': 'aiGestureLookAround'
            };

            window.dispatchEvent(new CustomEvent('producer:action', {
                detail: {
                    type: 'autonomous_gesture',
                    payload: {
                        id: guestId,
                        name: guest.persona.name,
                        action: selectedAction,
                        title: actionKeyMap[selectedAction] || 'aiAutonomyImpulse'
                    }
                }
            }));
            
            // Limit to one guest action per tick to avoid chaos
            break;
        }

        // Reactive Listening
        if (this.isAnyGuestSpeaking() || (window as any).isHostSpeaking) {
            for (const guestId of activeIds) {
                const guest = this.activeGuests.get(guestId);
                if (!guest || guest.isSpeaking || guest.isThinking) continue;
                if (Math.random() < 0.1) {
                    this.triggerGesture(guestId, 'nod_emphasis');
                }
            }
        }
    }

    private isHost(): boolean {
        return !window.location.search.includes('role=guest');
    }

    public resetBanterTimer() {
        this.lastActivityTimestamp = Date.now();
        if (this.banterTimer) clearTimeout(this.banterTimer);
        
        if (!this.isHost()) return;

        const delay = 45000 + Math.random() * 45000;
        this.banterTimer = setTimeout(() => {
            this.triggerRandomBanter();
        }, delay);
    }

    private pollForSilence(guestId: string, callback: () => void) {
        const check = () => {
            const guest = this.activeGuests.get(guestId);
            if (guest && !guest.isSpeaking && !guest.isThinking) {
                setTimeout(callback, 1000);
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

        const idA = activeIds[Math.floor(Math.random() * activeIds.length)];
        let idB = activeIds.find(id => id !== idA) || activeIds[0];

        const guestA = this.activeGuests.get(idA)!;
        const guestB = this.activeGuests.get(idB)!;

        // Relationship-aware banter
        const affinity = this.relationshipManager.getGuestAffinity(idA, idB);
        let socialContext = 'casual';
        if (affinity < -0.5) socialContext = 'rivalry';
        else if (affinity > 0.5) socialContext = 'friendship';

        const resA = await this.generateResponse(idA, `Say something to ${guestB.persona.name}. (Relationship: ${socialContext}).`, {
            vibe: socialContext,
            targetGuest: guestB.persona.name
        } as any);

        if (resA) {
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
        
        // Recognise Frequent Viewers
        const viewerAffinity = this.relationshipManager.getViewerAffinity(userName);
        let socialNote = '';
        if (viewerAffinity > 0.8) socialNote = `(This is a legendary fan!)`;
        else if (viewerAffinity > 0.4) socialNote = `(This is a regular viewer.)`;

        // Poggers Detection
        const hypeKeywords = ['lol', 'lmfao', 'pog', 'wow', 'gg', 'hype', 'lfg', 'omg', 'holy', 'fire'];
        const trollKeywords = ['stfu', 'bad', 'suck', 'dumb', 'fake', 'scam', 'hate', 'ratio', 'garbage'];
        
        let hypeInc = 0;
        hypeKeywords.forEach(k => { if (text.includes(k)) hypeInc += 0.2; });
        if (data.text === data.text.toUpperCase() && data.text.length > 5) hypeInc += 0.3; // All caps
        
        this.chatHypeScore = Math.min(2.0, this.chatHypeScore + hypeInc);
        this.notifyWorker('update-hype-level', { level: this.chatHypeScore });

        // Phase 34: Update Engagement Scores based on mentions
        for (const [guestId, guest] of this.activeGuests.entries()) {
            const name = guest.persona.name.toLowerCase();
            if (text.includes(name)) {
                const current = this.guestEngagementScores.get(guestId) || 50;
                this.guestEngagementScores.set(guestId, Math.min(100, current + 5));
                console.log(`[VTuberManager] Engagement Boost for ${guest.persona.name}: ${this.guestEngagementScores.get(guestId)}`);
            }
        }

        // Troll Management
        const isTroll = trollKeywords.some(k => text.includes(k));
        if (isTroll && Math.random() > 0.5 && !this.isAnyGuestSpeaking()) {
             const activeIds = Array.from(this.activeGuests.keys());
             if (activeIds.length > 0) {
                 const speakerId = activeIds[Math.floor(Math.random() * activeIds.length)];
                 this.generateResponse(speakerId, `(Someone is being negative in chat: "${data.text}"). Deflect them with humor. Stay in character.`, {
                     vibe: 'witty'
                 } as any);
                 return;
             }
        }

        // Autonomous Interjection
        if (this.chatHypeScore > 1.2 && Math.random() > 0.7 && !this.isAnyGuestSpeaking()) {
             const activeIds = Array.from(this.activeGuests.keys());
             if (activeIds.length > 0) {
                 const speakerId = activeIds[Math.floor(Math.random() * activeIds.length)];
                 this.generateResponse(speakerId, `${socialNote} The chat is going wild! Join the hype! React to: "${data.text}"`, {
                     vibe: 'excited'
                 } as any);
                 return;
             }
        }

        // Sentiment Analysis
        const sentiment = isTroll ? 'negative' : (hypeInc > 0 ? 'positive' : 'neutral');
        this.recentChatSentiment.push(sentiment);
        if (this.recentChatSentiment.length > 20) this.recentChatSentiment.shift();

        // Phase 33: Neural Pivot Trigger
        const negCount = this.recentChatSentiment.filter(s => s === 'negative').length;
        if (negCount > 10) {
            const { neuralShowrunner } = await import('./NeuralShowrunner');
            neuralShowrunner.pivotSegment('Negative Room Sentiment detected. 📉');
            this.recentChatSentiment = []; // Reset
        } else if (this.chatHypeScore > 1.9) {
            const { neuralShowrunner } = await import('./NeuralShowrunner');
            neuralShowrunner.pivotSegment('Extreme Hype detected! 🔥');
        }

        // Probabilistic standard response
        if (Math.random() > 0.2) return;
        if (this.isAnyGuestSpeaking()) return;

        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        const speakingId = activeIds[Math.floor(Math.random() * activeIds.length)];
        
        let responsePrompt = `${socialNote} Answer chat: "${data.text}"`;
        if (this.currentDirective) {
            responsePrompt = `${socialNote} ShowRunner Directive: ${this.currentDirective}. Context: User said "${data.text}". React while following the directive.`;
        }

        this.generateResponse(speakingId, responsePrompt, {
            type: 'chat',
            userName: userName,
            content: data.text,
            vibe: this.currentVibe
        } as any);
    }

    private async triggerAutonomousIntervention(directive: string) {
        if (this.isAnyGuestSpeaking()) return;
        
        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;
        
        const speakerId = activeIds[0];
        this.generateResponse(speakerId, `[ShowRunner Directive: ${directive}]. Start the conversation now.`, {
            vibe: this.currentVibe
        } as any);
    }

    private personaLibrary: AIGuestPersona[] = reactive([]);

    public setLibrary(vtubers: any[]) {
        try {
            const synced = vtubers.map((vtuber: any) => this.mapVTuberToPersona(vtuber));
            this.personaLibrary.length = 0;
            this.personaLibrary.push(...synced);
        } catch (e) {}
    }

    public async syncLibrary() {
        try {
            const response = await api.get('/vtuber/list');
            const data = response.data;
            const list = data.data || (Array.isArray(data) ? data : []);
            if (Array.isArray(list)) {
                this.setLibrary(list);
            }
        } catch (e) {}
    }

    private mapVTuberToPersona(vtuber: any): AIGuestPersona {
        const getName = () => vtuber.identity?.name || vtuber.name || 'Unnamed VTuber';
        const getDescription = () => vtuber.identity?.description || vtuber.description || '';
        const getTraits = () => vtuber.identity?.traits || vtuber.traits || [];
        const getRole = () => vtuber.identity?.role || vtuber.role || 'guest';
        const getVoiceConfig = () => vtuber.meta?.voiceConfig || vtuber.voiceConfig || {
            provider: 'gemini',
            voiceId: vtuber.meta?.voiceId || vtuber.voiceId || 'en-US-Neural2-F',
            language: 'en-US'
        };

        const uuid = vtuber.uuid || generateUUID();
        const entityId = vtuber.entityId || vtuber._id || uuid;

        return {
            uuid: uuid,
            entityId: entityId,
            identity: {
                name: getName(),
                description: getDescription(),
                backstory: vtuber.identity?.backstory,
                role: getRole() as any,
                traits: getTraits()
            },
            visual: {
                modelType: vtuber.visual?.modelType || '3d',
                modelUrl: vtuber.visual?.modelUrl || '/assets/models/ai_guest_base.glb',
                backgroundUrl: vtuber.visual?.backgroundUrl,
                thumbnailUrl: vtuber.visual?.thumbnailUrl,
                activePropId: vtuber.visual?.activePropId,
                live2dConfig: vtuber.visual?.live2dConfig || {}
            },
            visualIdentity: {
                modelUrl: vtuber.visual?.modelUrl,
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

            // Legacy
            name: getName(),
            avatarId: uuid,
            voiceId: getVoiceConfig().voiceId,
            voiceConfig: getVoiceConfig(),
            description: getDescription(),
            traits: getTraits(),
            role: getRole() as any,
            avatarUrl: vtuber.visual?.thumbnailUrl,

            // Runtime
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
        if (!persona.uuid) persona.uuid = generateUUID();
        if (this.activeGuests.has(persona.uuid)) return;

        this.activeGuests.set(persona.uuid, { persona, isSpeaking: false, isThinking: false });
        toast.success(`AI Orchestrator: Summoning ${persona.name || persona.identity?.name}...`);

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
        this.notifyWorker('remove-stream', { id });
    }

    public interrupt(id: string) {
        this.stopSpeaking(id);
        const guest = this.activeGuests.get(id);
        if (guest) {
             guest.isThinking = false;
             this.notifyWorker('update-3d-audio', { id: id, audioLevel: 0 });
        }
    }

    public async generateResponse(guestId: string, prompt: string, context?: any): Promise<{ text: string, audioUrl: string, action?: string, actionPayload?: any } | null> {
        return this.talk(guestId, prompt, context);
    }

    public async talk(guestId: string, prompt: string, context?: any): Promise<{ text: string, audioUrl: string, action?: string, actionPayload?: any } | null> {
        const guest = this.activeGuests.get(guestId);
        if (!guest) return null;

        guest.isThinking = true;
        this.notifyWorker('update-3d-thinking', { id: guestId, isThinking: true });

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
                const originalCallback = (connection.geminiLive as any).getTextResponseCallback 
                    ? (connection.geminiLive as any).getTextResponseCallback() 
                    : null;
                
                return new Promise((resolve) => {
                    connection.geminiLive.setTextResponseCallback((text: string, metadata?: any) => {
                        this.conversationHistory.push({ role: 'user', content: prompt });
                        this.conversationHistory.push({ role: 'assistant', content: text });
                        if (this.conversationHistory.length > this.MAX_HISTORY * 2) {
                            this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY * 2);
                        }

                        guest.isThinking = false;
                        this.notifyWorker('update-3d-thinking', { id: guestId, isThinking: false });

                        if (metadata?.isConsolidated) {
                            const { emotion, gesture } = metadata;
                            if (emotion) {
                                guest.emotion = emotion;
                                this.notifyWorker('update-3d-expression', { 
                                    id: guestId, 
                                    emotion, 
                                    gesture: gesture || 'normal' 
                                });
                                if (['excited', 'happy', 'angry', 'surprised'].includes(emotion)) {
                                    this.broadcastGroupMood(guestId, emotion);
                                }
                            }
                            if (gesture) guest.gesture = gesture;
                        }

                        if (typeof originalCallback === 'function') originalCallback(text, metadata);
                        
                        if (this.dialogueLock === guestId) {
                            setTimeout(() => {
                                if (this.dialogueLock === guestId) this.dialogueLock = null;
                            }, 5000);
                        }

                        resolve({ text, audioUrl: '', action: 'none' });
                    });

                    this.dialogueLock = guestId;
                    connection.geminiLive.sendPrompt(prompt, { ...context, history: this.conversationHistory });
                });
            } else {
                guest.isThinking = false;
                this.notifyWorker('update-3d-thinking', { id: `${guestId}`, isThinking: false });
                return { text: "...", audioUrl: '', action: 'none' };
            }
        } catch (error: any) {
            if (this.dialogueLock === guestId) this.dialogueLock = null;
            guest.isThinking = false;
            this.notifyWorker('update-3d-thinking', { id: `${guestId}`, isThinking: false });
            return null;
        }
    }

    /**
     * Directly trigger a gesture animation for a guest.
     */
    public triggerGesture(id: string, gesture: string) {
        const guest = this.activeGuests.get(id);
        if (guest) {
            guest.gesture = gesture;
            this.notifyWorker('update-3d-expression', { id, gesture });
            setTimeout(() => {
                if (guest.gesture === gesture) guest.gesture = '';
            }, 3000);
        }
    }

    public manualGesture(id: string, gesture: string) {
        this.triggerGesture(id, gesture);
    }

    /**
     * Synchronize a gesture across all active guests.
     */
    public triggerGroupGesture(gesture: string) {
        for (const guestId of this.activeGuests.keys()) {
            this.manualGesture(guestId, gesture);
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
            this.notifyWorker('update-3d-expression', { id, emotion });
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
                id: id, 
                config: guest.persona.animationConfig 
            });
        }
    }

    /**
     * Update performance config for a guest
     */
    public updatePerformance(id: string, config: any) {
        const guest = this.activeGuests.get(id);
        if (guest) {
            guest.persona.performanceConfig = { ...guest.persona.performanceConfig, ...config };
            this.notifyWorker('update-3d-performance', { id, config: guest.persona.performanceConfig });
        }
    }

    public setBackground(id: string, backgroundUrl: string) {
        const guest = this.activeGuests.get(id);
        if (guest && guest.persona.visual) {
            guest.persona.visual.backgroundUrl = backgroundUrl;
            this.notifyWorker('update-3d-background', { id, backgroundUrl });
        }
    }

    private startSpeaking(id: string, audioUrl: string) {
        this.stopSpeaking(id);

        const guest = this.activeGuests.get(id);
        if (guest) guest.isSpeaking = true;

        const analysis = aiAudioAnalyzer.analyze(audioUrl, (level: number) => {
            this.notifyWorker('update-3d-audio', {
                id: id,
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

    public setSpeaking(id: string, speaking: boolean) {
        const guest = this.activeGuests.get(id);
        if (guest) guest.isSpeaking = speaking;
    }

    public getGuests() {
        return Array.from(this.activeGuests.values());
    }

    public isAnyGuestSpeaking(): boolean {
        const anyActiveState = Array.from(this.activeGuests.values()).some(g => g.isSpeaking || g.isThinking);
        if (anyActiveState || this.dialogueLock) return true;
        if (connections) {
            return Object.values(connections).some((conn: any) => 
                conn.isConnected && (conn.isSpeaking || conn.isAudioPlaying)
            );
        }
        return false;
    }

    private async handleGlobalGiftReaction(data: any) {
        for (const guestId of this.activeGuests.keys()) {
            this.triggerVisualGiftEffect(guestId, data.item);
        }
        const director = (await import('./StudioDirector')).studioDirector;
        director.requestAction('react_to_gift', {
            userName: data.userName,
            giftName: data.item.name,
            cost: data.item.cost
        }, data.item.cost >= 1000 ? 10 : 5);

        if (!this.isAnyGuestSpeaking()) {
            const activeIds = Array.from(this.activeGuests.keys());
            if (activeIds.length > 0) {
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
        const speakerId = activeIds.find(id => this.activeGuests.get(id)?.persona.isMaster) || activeIds[0];
        const prompt = `That was an incredible moment! People are saying: "${data.reason}". announce that you are clipping this for the highlights!`;
        await this.generateResponse(speakerId, prompt, { vibe: 'excited' } as any);
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
            if (Math.random() > 0.7) {
                this.setEmotion(id, emotion);
            }
        }
    }

    /**
     * Proactively request a vision snapshot of the studio.
     */
    public requestVisionSnapshot(guestId: string) {
        this.notifyWorker('vision:request_snapshot', { id: guestId });
    }

    private notifyWorker(type: string, payload: any) {
        window.dispatchEvent(new CustomEvent('studio-worker-command', { detail: { type, payload } }));
    }

    private startEngagementDecay() {
        if (this.engagementDecayTimer) clearInterval(this.engagementDecayTimer);
        this.engagementDecayTimer = setInterval(() => {
            for (const [id, score] of this.guestEngagementScores.entries()) {
                if (score > 0) {
                    this.guestEngagementScores.set(id, Math.max(0, score - 0.5));
                }
            }
        }, 10000); // Slow decay every 10s
    }

    private async handleAutonomousProductPitch(product: any, directive: string) {
        const { ProductPitchService } = await import('./ProductPitchService');
        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        // Pick a speaker (master guest or random)
        const speakerId = activeIds.find(id => this.activeGuests.get(id)?.persona.isMaster) || activeIds[0];
        
        const pitch = ProductPitchService.generateScript({
            product,
            vibe: this.currentVibe || 'hype',
            language: 'vi-VN'
        });

        console.log(`[VTuberManager] Autonomous Product Pitch for ${product.name}`);
        await this.generateResponse(speakerId, `${directive} | SCRIPT: ${pitch}`, { vibe: 'hype' } as any);
        
        if (this.studioStore) {
            this.studioStore.highlightProduct(product.id);
        }
    }

    private async handleKnowledgeInjection(fact: string, directive: string) {
        const activeIds = Array.from(this.activeGuests.keys());
        if (activeIds.length === 0) return;

        // Choose a guest with "SMART" or "CURIOSITY" traits if possible (simulated here with random)
        const speakerId = activeIds[Math.floor(Math.random() * activeIds.length)];
        
        console.log(`[VTuberManager] Knowledge Injection Speaker choosing fact: ${fact.substring(0, 30)}...`);
        
        // Use standard response generation with the research directive
        await this.generateResponse(speakerId, directive, { vibe: 'curious' } as any);
    }

    public evaluateCastPerformance(): string | null {
        let lowestId: string | null = null;
        let lowestScore = 101;

        for (const [id, score] of this.guestEngagementScores.entries()) {
            if (score < lowestScore) {
                lowestScore = score;
                lowestId = id;
            }
        }

        // Only rotate if score is low enough (e.g. < 30) and we have more than 1 guest
        if (lowestId && lowestScore < 30 && this.activeGuests.size > 1) {
            return lowestId;
        }
        return null;
    }
}

export const syntheticGuestManager = new SyntheticGuestManager();
