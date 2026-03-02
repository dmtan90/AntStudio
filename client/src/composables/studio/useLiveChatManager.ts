import { ref, reactive, watch, computed } from 'vue';
import { useGeminiLive } from '@/composables/useGeminiLive';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

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

// Shared state for singleton behavior - EXPORTED for use outside setup()
export const connections = reactive<Record<string, LiveChatConnection>>({});
const activeVTuberIds = ref<Set<string>>(new Set());
const connectingIds = new Set<string>(); // Connection lock
let toolCallCallback: ((personaId: string, toolCall: any) => void) | null = null;

export function useLiveChatManager() {
    const studioStore = useStudioStore();
    const userStore = useUserStore();
    const route = useRoute();

    const setToolCallCallback = (callback: (personaId: string, toolCall: any) => void) => {
        toolCallCallback = callback;
    };

    /**
     * Get an active connection for a VTuber
     */

    // Computed: List of all connected VTubers
    const connectedVTubers = computed(() => 
        Object.values(connections).filter(c => c.isConnected)
    );


    // Computed: Is any VTuber speaking?
    const isAnyVTuberSpeaking = computed(() => 
        Object.values(connections).some(c => c.isSpeaking || c.isAudioPlaying)
    );

    /**
     * Connect a VTuber to GeminiLive
     */
    const connectVTuber = async (personaId: string, persona: any, hostStream?: MediaStream) => {
        // Skip if already connected or currently connecting
        if (connections[personaId]?.isConnected || connectingIds.has(personaId)) {
            console.log(`[LiveChatManager] ${persona.name} already connected or connecting, skipping`);
            return;
        }

        connectingIds.add(personaId);

        // Check if persona has an archive/entity ID (required for LiveChat)
        const archiveId = (persona as any).entityId || persona.uuid || persona.id;
        
        if (!archiveId) {
            console.warn(`[LiveChatManager] ${persona.name} doesn't have archiveId, skipping LiveChat`);
            return;
        }

        try {
            console.log(`[LiveChatManager] Connecting ${persona.name} to LiveChat...`);

            // Create new GeminiLive instance
            const geminiLive = useGeminiLive();

            // Connect to WebSocket
            await geminiLive.connect({
                archiveId: archiveId,
                projectId: route.params.id as string,
                token: userStore.token || undefined
            });

            console.log(`[LiveChatManager] GeminiLive connection resolved for ${persona.name}`);

            // Start microphone with host's audio stream
            if (hostStream) {
                console.log(`[LiveChatManager] Starting microphone for ${persona.name}`);
                await geminiLive.startMicrophone(hostStream);
            }

            // Register tool call handler
            geminiLive.setToolCallCallback((toolCall: any) => {
                if (toolCallCallback) {
                    toolCallCallback(personaId, toolCall);
                }
            });

            // Register text response handler (Phase 8: Server-Side Normalization)
            // Convert metadata back to tool calls for unified handling
            geminiLive.setTextResponseCallback((text: string, metadata?: any) => {
                console.log(`[LiveChatManager] Metadata received for ${persona.name}:`, metadata);
                if (!metadata || !toolCallCallback) return;
                
                const virtualToolCalls: any[] = [];

                if (metadata.emotion) {
                    virtualToolCalls.push({
                        id: `auto_emotion_${Date.now()}`,
                        name: 'change_expression',
                        args: { expression: metadata.emotion }
                    });
                }

                if (metadata.gesture && metadata.gesture !== 'normal') {
                    virtualToolCalls.push({
                         id: `auto_gesture_${Date.now()}`,
                         name: 'play_animation',
                         args: { animation: metadata.gesture }
                    });
                }

                if (metadata.action === 'perform_song') {
                    virtualToolCalls.push({
                         id: `auto_action_${Date.now()}`,
                         name: 'perform_song',
                         args: metadata.actionPayload
                    });
                } else if (metadata.action === 'stop_performance') {
                    virtualToolCalls.push({
                         id: `auto_action_${Date.now()}`,
                         name: 'stop_performance',
                         args: {}
                    });
                }

                if (virtualToolCalls.length > 0) {
                    console.log(`[LiveChatManager] Converted metadata to ${virtualToolCalls.length} tool calls`);
                    toolCallCallback(personaId, { functionCalls: virtualToolCalls });
                }
            });


            // Store connection
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

            // Watch for state changes
            watch(() => geminiLive.isConnected.value, (connected) => {
                if (connections[personaId]) {
                    connections[personaId].isConnected = connected;
                }
            });

            watch(() => geminiLive.isSpeaking.value, (speaking) => {
                if (connections[personaId]) {
                    connections[personaId].isSpeaking = speaking;
                }
            });

            watch(() => geminiLive.isAudioPlaying.value, (playing) => {
                if (connections[personaId]) {
                    connections[personaId].isAudioPlaying = playing;
                }
            });

            watch(() => geminiLive.audioLevel.value, (level) => {
                if (connections[personaId]) {
                    connections[personaId].audioLevel = level;
                    
                    // Trigger global event for 3D/Live2D guests lip-sync
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

    /**
     * Disconnect a VTuber from GeminiLive
     */
    const disconnectVTuber = (personaId: string) => {
        const connection = connections[personaId];
        if (!connection) return;

        console.log(`[LiveChatManager] Disconnecting ${connection.persona.name}...`);
        
        try {
            connection.geminiLive.disconnect();
            delete connections[personaId];
            
            console.log(`[LiveChatManager] ✅ ${connection.persona.name} disconnected`);
            ElMessage.info(`${connection.persona.name} left the conversation`);
        } catch (error) {
            console.error(`[LiveChatManager] Error disconnecting ${connection.persona.name}:`, error);
        }
    };

    /**
     * Disconnect all VTubers
     */
    const disconnectAll = () => {
        console.log('[LiveChatManager] Disconnecting all VTubers...');
        Object.keys(connections).forEach(personaId => {
            disconnectVTuber(personaId);
        });
    };

    /**
     * Get connection for a specific VTuber
     */
    const getConnection = (personaId: string): LiveChatConnection | undefined => {
        return connections[personaId];
    };

    /**
     * Check if a VTuber is connected
     */
    const isConnected = (personaId: string): boolean => {
        return connections[personaId]?.isConnected || false;
    };

    /**
     * Broadcast a message to all connected VTubers
     */
    const broadcastToVTubers = (message: string) => {
        Object.values(connections).forEach(connection => {
            if (connection.isConnected) {
                connection.geminiLive.sendText(message);
            }
        });
    };

    /**
     * Auto-detect VTubers in room and manage connections
     */
    const syncConnections = async (guestSlotMap: any, allPersonas: any[], hostStream?: MediaStream) => {
        const guestIds = Object.keys(guestSlotMap).filter(id => !!guestSlotMap[id]);
        console.log('[LiveChatManager] Syncing connections...', { guestSlotCount: guestIds.length, availablePersonas: allPersonas.length });
        
        const currentVTuberIds = new Set<string>();

        const sanitizeId = (id: string) => id.startsWith('guest_') ? id.replace('guest_', '') : id;

        // Find all AI guests (VTubers) in the room
        for (const [slotId, guestData] of Object.entries(guestSlotMap)) {
            // guestData can be a string ID or a Guest object
            let guestId = typeof guestData === 'string' ? guestData : (guestData as any)?.uuid || (guestData as any)?.id;
            
            if (!guestId || typeof guestId !== 'string') {
                console.log(`[LiveChatManager] Skipping slot ${slotId} - invalid guestId:`, guestId);
                continue;
            }

            // Phase 90: Sanitize ID to ensure it's a raw UUID
            guestId = sanitizeId(guestId);
            
            console.log(`[LiveChatManager] Checking slot ${slotId}: guestId=${guestId}`, { type: typeof guestData });
            
            // Find full persona data (using raw UUID)
            const persona = allPersonas.find(p => p.uuid === guestId || p.id === guestId);
            
            if (!persona) {
                console.warn(`[LiveChatManager] Skipping slot ${slotId} - persona data for ID "${guestId}" not found.`);
                continue;
            }

            // Phase 101: Skip Real Humans - they don't need automated AI sessions/GeminiLive
            // The backend GeminiLiveService only handles Synthetic VTubers.
            if ((persona as any).isRealHuman) {
                console.log(`[LiveChatManager] Skipping slot ${slotId} - ${persona.name} is a Real Human guest.`);
                continue;
            }

            currentVTuberIds.add(guestId);

            const existingConnection = connections[guestId];
            console.log(`[LiveChatManager] Slot ${slotId} (${persona.name}): existingConnection=${!!existingConnection}, isConnected=${existingConnection?.isConnected}`);

            // Connect if not already connected
            if (!existingConnection) {
                console.log(`[LiveChatManager] No existing connection for ${persona.name}, initiating connectVTuber...`);
                await connectVTuber(guestId, persona, hostStream);
            } 
            // If already connected but microphone hasn't started and we now have a host stream
            else if (!existingConnection.isMicrophoneStarted && hostStream) {
                console.log(`[LiveChatManager] Starting delayed microphone for ${persona.name}`);
                try {
                    await existingConnection.geminiLive.startMicrophone(hostStream);
                    existingConnection.isMicrophoneStarted = true;
                } catch (e) {
                    console.error(`[LiveChatManager] Delayed mic start failed for ${persona.name}:`, e);
                }
            }
        }

        // Disconnect VTubers who left the room
        const previousVTuberIds = activeVTuberIds.value;
        for (const personaId of previousVTuberIds) {
            if (!currentVTuberIds.has(personaId)) {
                disconnectVTuber(personaId);
            }
        }

        // Update active VTubers
        activeVTuberIds.value = currentVTuberIds;
    };

    return {
        // State
        connections,
        connectedVTubers,
        isAnyVTuberSpeaking,
        activeVTuberIds,

        // Methods
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
