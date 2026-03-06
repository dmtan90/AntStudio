import { ref, reactive, watch, computed } from 'vue';
import { useGeminiLive } from '@/composables/useGeminiLive';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { AgentEventBus } from './services/AgentEventBus';

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
}

export const connections = reactive<Record<string, LiveChatConnection>>({});
const activeVTuberIds = ref<Set<string>>(new Set());
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

    const connectedVTubers = computed(() => 
        Object.values(connections).filter(c => c.isConnected)
    );

    const isAnyVTuberSpeaking = computed(() => 
        Object.values(connections).some(c => c.isSpeaking || c.isAudioPlaying)
    );

    const connectVTuber = async (personaId: string, persona: any, hostStream?: MediaStream) => {
        if (connections[personaId]?.isConnected || connectingIds.has(personaId)) {
            return;
        }

        connectingIds.add(personaId);

        const archiveId = (persona as any).entityId || persona.uuid || persona.id;
        
        if (!archiveId) {
            console.warn(`[LiveChatManager] ${persona.name} doesn't have archiveId, skipping LiveChat`);
            connectingIds.delete(personaId);
            return;
        }

        try {
            console.log(`[LiveChatManager] Connecting ${persona.name} to LiveChat...`);

            const geminiLive = useGeminiLive();

            await geminiLive.connect({
                archiveId: archiveId,
                projectId: route.params.id as string,
                token: userStore.token || undefined
            });

            if (hostStream) {
                await geminiLive.startMicrophone(hostStream);
            }

            geminiLive.setToolCallCallback((toolCall: any) => {
                eventBus.dispatchToolCall(personaId, toolCall);
            });

            geminiLive.setTextResponseCallback((text: string, metadata?: any) => {
                if (metadata) {
                    eventBus.parseMetadataToToolCalls(personaId, metadata);
                }
            });

            connections[personaId] = {
                personaId,
                archiveId,
                persona,
                geminiLive,
                isConnected: geminiLive.isConnected.value,
                isSpeaking: geminiLive.isSpeaking.value,
                isAudioPlaying: geminiLive.isAudioPlaying.value,
                isMicrophoneStarted: !!hostStream,
                audioLevel: geminiLive.audioLevel.value
            };

            watch(() => geminiLive.isConnected.value, (connected) => {
                if (connections[personaId]) connections[personaId].isConnected = connected;
            });

            watch(() => geminiLive.isSpeaking.value, (speaking) => {
                if (connections[personaId]) connections[personaId].isSpeaking = speaking;
            });

            watch(() => geminiLive.isAudioPlaying.value, (playing) => {
                if (connections[personaId]) connections[personaId].isAudioPlaying = playing;
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
            ElMessage.success(`${persona.name} joined the conversation`);
        } catch (error) {
            console.error(`[LiveChatManager] Failed to connect ${persona.name}:`, error);
            ElMessage.error(`Failed to connect ${persona.name} to LiveChat`);
        } finally {
            connectingIds.delete(personaId);
        }
    };

    const disconnectVTuber = (personaId: string) => {
        const connection = connections[personaId];
        if (!connection) return;

        try {
            connection.geminiLive.disconnect();
            delete connections[personaId];
            ElMessage.info(`${connection.persona.name} left the conversation`);
        } catch (error) {
            console.error(`[LiveChatManager] Error disconnecting ${connection.persona.name}:`, error);
        }
    };

    const disconnectAll = () => {
        Object.keys(connections).forEach(personaId => {
            disconnectVTuber(personaId);
        });
    };

    const getConnection = (personaId: string): LiveChatConnection | undefined => {
        return connections[personaId];
    };

    const isConnected = (personaId: string): boolean => {
        return connections[personaId]?.isConnected || false;
    };

    const broadcastToVTubers = (message: string) => {
        Object.values(connections).forEach(connection => {
            if (connection.isConnected) {
                connection.geminiLive.sendText(message);
            }
        });
    };

    const syncConnections = async (guestSlotMap: any, allPersonas: any[], hostStream?: MediaStream) => {
        const currentVTuberIds = new Set<string>();
        const sanitizeId = (id: string) => id.startsWith('guest_') ? id.replace('guest_', '') : id;

        for (const [slotId, guestData] of Object.entries(guestSlotMap)) {
            let guestId = typeof guestData === 'string' ? guestData : (guestData as any)?.uuid || (guestData as any)?.id;
            
            if (!guestId || typeof guestId !== 'string') continue;
            guestId = sanitizeId(guestId);
            
            const persona = allPersonas.find(p => p.uuid === guestId || p.id === guestId);
            if (!persona || (persona as any).isRealHuman) continue;

            currentVTuberIds.add(guestId);
            const existingConnection = connections[guestId];

            if (!existingConnection) {
                await connectVTuber(guestId, persona, hostStream);
            } else if (!existingConnection.isMicrophoneStarted && hostStream) {
                try {
                    await existingConnection.geminiLive.startMicrophone(hostStream);
                    existingConnection.isMicrophoneStarted = true;
                } catch (e) {
                    console.error(`[LiveChatManager] Delayed mic start failed for ${persona.name}:`, e);
                }
            }
        }

        const previousVTuberIds = activeVTuberIds.value;
        for (const personaId of previousVTuberIds) {
            if (!currentVTuberIds.has(personaId)) {
                disconnectVTuber(personaId);
            }
        }

        activeVTuberIds.value = currentVTuberIds;
    };

    return {
        connections,
        connectedVTubers,
        isAnyVTuberSpeaking,
        activeVTuberIds,
        connectVTuber,
        disconnectVTuber,
        disconnectAll,
        getConnection,
        isConnected,
        broadcastToVTubers,
        syncConnections,
        setToolCallCallback
    };
}
