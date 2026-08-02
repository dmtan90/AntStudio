import { ref, reactive, watch, computed } from 'vue';
import { useGeminiLive } from '@/composables/useGeminiLive';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user';
import { useRoute } from 'vue-router';
import { AgentEventBus } from './services/AgentEventBus';
import { toast } from 'vue-sonner';

export interface LiveChatConnection {
    personaId: string;
    archiveId: string;
    persona: any;
    geminiLive: ReturnType<typeof useGeminiLive>;
    isConnected: boolean;
    isSpeaking: boolean;
    isAudioPlaying: boolean;
    isMicrophoneStarted: boolean;
    audioLevel: number;
    isTurnComplete: boolean;
    baseTextResponseCallback?: (text: string, metadata?: any) => void;
}

export const connections = reactive<Record<string, LiveChatConnection>>({});
const activeInfluencerIds = ref<Set<string>>(new Set());
const connectingIds = new Set<string>();

export function useLiveChatManager() {
    const studioStore = useStudioStore();
    const userStore = useUserStore();
    const route = useRoute();
    const eventBus = AgentEventBus.getInstance();

    const setToolCallCallback = (callback: (personaId: string, toolCall: any) => void) => {
        // Register the UI-level handler with the centralized bus
        eventBus.registerHandler(callback);
    };

    const connectedInfluencers = computed(() => 
        Object.values(connections).filter(c => c.isConnected)
    );

    const isAnyInfluencerSpeaking = computed(() => 
        Object.values(connections).some(c => c.isSpeaking || c.isAudioPlaying)
    );

    const connectInfluencer = async (personaId: string, persona: any, hostStream?: MediaStream, liveContext?: string, productIds?: string) => {
        const archiveId = (persona as any).entityId || persona.uuid || persona.id || persona._id;
        
        if (!archiveId) {
            console.warn(`[LiveChatManager] ${persona.name} doesn't have archiveId, skipping LiveChat`);
            return;
        }

        // Prevent duplicate connections if already connected
        const existingConn = Object.values(connections).find(c => c.archiveId === archiveId || c.personaId === personaId);
        if (existingConn?.isConnected) {
            console.warn(`[LiveChatManager] ${persona.name} (${archiveId}) is already connected, skipping duplicate connect.`);
            return;
        }

        if (existingConn && !existingConn.isConnected) {
            console.log(`[LiveChatManager] Cleaning up stale/disconnected connection for ${persona.name} (${archiveId})...`);
            try {
                existingConn.geminiLive.disconnect();
            } catch (e) {}
            delete connections[personaId];
            connectingIds.delete(personaId);
            connectingIds.delete(archiveId);
        }

        connectingIds.add(personaId);
        connectingIds.add(archiveId);

        try {
            console.log(`[LiveChatManager] Connecting ${persona.name} to LiveChat with context ${liveContext}...`);

            const geminiLive = useGeminiLive();

            await geminiLive.connect({
                archiveId: archiveId,
                projectId: route.params.id as string,
                token: userStore.token || undefined,
                liveContext: liveContext,
                productIds: productIds,
                language: studioStore.visualSettings?.language
            });

            if (hostStream) {
                await geminiLive.startMicrophone(hostStream);
            }

            geminiLive.setToolCallCallback((toolCall: any) => {
                eventBus.dispatchToolCall(personaId, toolCall);
            });

            const baseCallback = async (text: string, metadata?: any) => {
                if (metadata) {
                    eventBus.parseMetadataToToolCalls(personaId, metadata);
                }

                // Autonomous Commerce Pivot on high intent
                if (liveContext === 'sales') {
                    const { commerceIntelligenceEngine } = await import('@/utils/ai/CommerceIntelligenceEngine');
                    const intentResult = await commerceIntelligenceEngine.analyzeSpeech(text);
                    
                    if (intentResult.confidence > 0.9) {
                        console.log(`[LiveChatManager] 🔥 HIGH COMMERCE INTENT DETECTED (${intentResult.intent}). Triggering pivot to closing.`);
                        const { neuralShowrunner } = await import('@/utils/ai/NeuralShowrunner');
                        neuralShowrunner.pivotSegment('closing');
                    }
                }
            };

            geminiLive.setTextResponseCallback(baseCallback);

            connections[personaId] = {
                personaId,
                archiveId,
                persona,
                geminiLive,
                isConnected: geminiLive.isConnected.value,
                isSpeaking: geminiLive.isSpeaking.value,
                isAudioPlaying: geminiLive.isAudioPlaying.value,
                isMicrophoneStarted: !!hostStream,
                audioLevel: geminiLive.audioLevel.value,
                isTurnComplete: geminiLive.isTurnComplete.value,
                baseTextResponseCallback: baseCallback
            };

            watch(() => geminiLive.isConnected.value, (connected) => {
                if (connections[personaId]) connections[personaId].isConnected = connected;
            });

            watch(() => geminiLive.isSpeaking.value, (speaking) => {
                if (connections[personaId]) connections[personaId].isSpeaking = speaking;
            });

            watch(() => geminiLive.isAudioPlaying.value, (playing) => {
                if (connections[personaId]) connections[personaId].isAudioPlaying = playing;
                import('@/utils/ai/SyntheticGuestManager').then(({ syntheticGuestManager }) => {
                    const guest = syntheticGuestManager.activeGuests.get(personaId);
                    if (guest) {
                        guest.isSpeaking = playing;
                        guest.isAudioPlaying = playing;
                    }
                });
            });

            watch(() => geminiLive.isTurnComplete.value, (completed) => {
                if (connections[personaId]) connections[personaId].isTurnComplete = completed;
                import('@/utils/ai/SyntheticGuestManager').then(({ syntheticGuestManager }) => {
                    const guest = syntheticGuestManager.activeGuests.get(personaId);
                    if (guest) guest.isTurnComplete = completed;
                });
            });

            watch(() => geminiLive.lastAudioTime.value, (time) => {
                import('@/utils/ai/SyntheticGuestManager').then(({ syntheticGuestManager }) => {
                    const guest = syntheticGuestManager.activeGuests.get(personaId);
                    if (guest) guest.lastAudioTime = time;
                });
            });

            watch(() => geminiLive.audioLevel.value, (level) => {
                if (connections[personaId]) {
                    connections[personaId].audioLevel = level;
                    
                    window.dispatchEvent(new CustomEvent('studio-worker-command', {
                        detail: {
                            type: 'update-3d-audio',
                            payload: { id: personaId, audioLevel: level }
                        }
                    }));
                }
            });

            console.log(`[LiveChatManager] ✅ ${persona.name} connected to LiveChat`);
            toast.info(`${persona.name || 'AI Agent'} joined the conversation`);
        } catch (error) {
            console.error(`[LiveChatManager] Failed to connect ${persona.name}:`, error);
            toast.error(`Failed to connect ${persona.name} to LiveChat`);
        } finally {
            connectingIds.delete(personaId);
            connectingIds.delete(archiveId);
        }
    };

    const disconnectInfluencer = (personaId: string) => {
        const connection = connections[personaId];
        if (!connection) return;

        try {
            connection.geminiLive.disconnect();
            delete connections[personaId];
            toast.info(`${connection?.persona?.name || 'AI Agent'} left the conversation`);
        } catch (error) {
            console.error(`[LiveChatManager] Error disconnecting ${connection.persona.name}:`, error);
        }
    };

    const disconnectAll = () => {
        Object.keys(connections).forEach(personaId => {
            disconnectInfluencer(personaId);
        });
    };

    const getConnection = (personaId: string): LiveChatConnection | undefined => {
        return connections[personaId];
    };

    const isConnected = (personaId: string): boolean => {
        return connections[personaId]?.isConnected || false;
    };

    const broadcastToInfluencers = (message: string) => {
        Object.values(connections).forEach(connection => {
            if (connection.isConnected) {
                connection.geminiLive.sendText(message);
            }
        });
    };

    const syncConnections = async (guestSlotMap: any, allPersonas: any[], hostStream?: MediaStream, liveContext?: string, productIds?: string, forceReconnect: boolean = false) => {
        const currentInfluencerIds = new Set<string>();
        const sanitizeId = (id: string) => id.startsWith('guest_') ? id.replace('guest_', '') : id;

        const slotMap = (guestSlotMap && Object.keys(guestSlotMap).length > 0) 
            ? guestSlotMap 
            : Object.fromEntries(allPersonas.map((p, idx) => [idx, p.uuid || p.id || p._id || p.entityId]));

        for (const [slotId, guestData] of Object.entries(slotMap)) {
            let guestId = typeof guestData === 'string' ? guestData : (guestData as any)?.uuid || (guestData as any)?.id;
            
            if (!guestId || typeof guestId !== 'string') continue;
            guestId = sanitizeId(guestId);
            
            let persona = allPersonas.find(p => 
                p.uuid === guestId || 
                p.id === guestId || 
                p._id === guestId || 
                p.entityId === guestId ||
                p.archiveId === guestId
            );
            if (!persona && allPersonas.length > 0) {
                persona = allPersonas[0];
            }
            if (!persona || (persona as any).isRealHuman) continue;

            currentInfluencerIds.add(guestId);
            const existingConnection = connections[guestId];

            if (!existingConnection || !existingConnection.isConnected || forceReconnect) {
                if (existingConnection && (!existingConnection.isConnected || forceReconnect)) {
                    console.log(`[LiveChatManager] Re-initializing WebSocket for AI persona: ${persona.name} (${guestId})`);
                    disconnectInfluencer(guestId);
                }
                await connectInfluencer(guestId, persona, hostStream, liveContext, productIds);
            } else if (!existingConnection.isMicrophoneStarted && hostStream) {
                try {
                    await existingConnection.geminiLive.startMicrophone(hostStream);
                    existingConnection.isMicrophoneStarted = true;
                } catch (e) {
                    console.error(`[LiveChatManager] Delayed mic start failed for ${persona.name}:`, e);
                }
            }
        }

        const previousInfluencerIds = activeInfluencerIds.value;
        for (const personaId of previousInfluencerIds) {
            if (!currentInfluencerIds.has(personaId)) {
                disconnectInfluencer(personaId);
            }
        }

        activeInfluencerIds.value = currentInfluencerIds;
    };

    return {
        connections,
        connectedInfluencers,
        isAnyInfluencerSpeaking,
        activeInfluencerIds,
        connectInfluencer,
        disconnectInfluencer,
        disconnectAll,
        getConnection,
        isConnected,
        broadcastToInfluencers,
        syncConnections,
        setToolCallCallback
    };
}
