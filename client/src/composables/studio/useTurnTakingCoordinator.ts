import { ref, computed, watch } from 'vue';
import { LiveChatConnection } from './useLiveChatManager';

export function useTurnTakingCoordinator(connections: Record<string, LiveChatConnection>) {
    const currentSpeakerId = ref<string | null>(null);
    const isInterruptionenabled = ref(true);

    // Monitor all connections for speaking state
    Object.keys(connections).forEach(id => {
        watch(() => connections[id]?.isSpeaking, (isSpeaking) => {
            if (isSpeaking) {
                if (!currentSpeakerId.value) {
                    currentSpeakerId.value = id;
                } else if (currentSpeakerId.value !== id && isInterruptionenabled.value) {
                    // Logic to handle interruption (e.g., mute the other)
                    // For now, let's just log it
                    console.log(`[TurnCoordinator] ${id} interrupted ${currentSpeakerId.value}`);
                    currentSpeakerId.value = id;
                }
            } else if (currentSpeakerId.value === id) {
                // Check if anyone else is speaking
                const otherSpeaker = Object.keys(connections).find(otherId => 
                    otherId !== id && connections[otherId].isSpeaking
                );
                currentSpeakerId.value = otherSpeaker || null;
            }
        });
    });

    /**
     * Determine if a VTuber should stay silent to let someone else speak
     */
    const shouldInhibit = (personaId: string): boolean => {
        return currentSpeakerId.value !== null && currentSpeakerId.value !== personaId;
    };

    return {
        currentSpeakerId,
        shouldInhibit
    };
}
