import { ref, onMounted, onUnmounted, watch } from 'vue';
import { studioDirector } from '@/utils/ai/StudioDirector';
import { conversationOrchestrator } from '@/utils/ai/ConversationOrchestrator';
import { useAudioAnalysis } from '@/composables/useAudioAnalysis';
import { studioVibeAnalyzer } from '@/utils/ai/StudioVibeAnalyzer';

export function useStudioAI(studioStore: any) {
    const isRunning = ref(false);
    const isAssembling = ref(false);
    const assembleProgress = ref(0);
    const activeCollaborators = ref<any[]>([]); // Placeholder for now
    let loopId: number | null = null;

    // Audio Analysis for context
    const { audioLevel, isSpeaking } = useAudioAnalysis(null);

    const startAILoop = () => {
        if (isRunning.value) return;
        isRunning.value = true;
        console.log('[StudioAI] Starting AI Director Loop...');

        let lastTick = 0;
        const TICK_INTERVAL = 500; // 2 times per second is plenty for director logic

        const loop = async (time: number) => {
            if (!isRunning.value) return;

            if (time - lastTick >= TICK_INTERVAL) {
                lastTick = time;
                
                // 1. Gather Context
                const context = {
                    voiceLevel: audioLevel.value,
                    activeGuests: studioStore.liveGuests.length,
                    chatVelocity: studioStore.engagement.chatMessagesPerMin || 0,
                    currentSceneId: studioStore.activeScene.id,
                    vibe: studioStore.studioVibe,
                    autoEmotionEnabled: studioStore.autoDirectorSettings.autoEmotionEnabled
                };

                // 1b. Update Vibe Analyzer (Auto-Atmosphere)
                const vibeChanged = studioVibeAnalyzer.update({
                    voiceLevel: context.voiceLevel,
                    chatVelocity: context.chatVelocity,
                });

                if (vibeChanged && studioStore.autoDirectorSettings.autoAtmosphereEnabled) {
                    const newMood = studioVibeAnalyzer.state.mood;
                    studioStore.updateStudioVibe(newMood);
                }

                // 2. Tick Director (Scene Switching, Overlays)
                if (studioStore.autoDirectorSettings.enabled) {
                    const decision = await studioDirector.tick(context);
                    if (decision.action === 'switch_scene') {
                        studioStore.switchScene(decision.payload);
                    }
                }

                // 3. Tick Orchestrator (Conversation Flow, Auto-Emotion)
                conversationOrchestrator.tick(context);
            }

            loopId = requestAnimationFrame(loop);
        };

        loopId = requestAnimationFrame(loop);
    };

    const stopAILoop = () => {
        isRunning.value = false;
        if (loopId) {
            cancelAnimationFrame(loopId);
            loopId = null;
        }
        console.log('[StudioAI] Stopped AI Director Loop');
    };

    // Auto-start/stop based on Live status
    watch(() => studioStore.isLive, (isLive) => {
        if (isLive) startAILoop();
        else stopAILoop();
    });

    onMounted(() => {
        if (studioStore.isLive) startAILoop();
    });

    onUnmounted(() => {
        stopAILoop();
    });

    // Mock Assembler functions to satisfy interface used in LiveStudio
    const assemble = async () => {
        isAssembling.value = true;
        assembleProgress.value = 0;
        // Mock progress
        const interval = setInterval(() => {
            assembleProgress.value += 10;
            if (assembleProgress.value >= 100) {
                clearInterval(interval);
                isAssembling.value = false;
            }
        }, 500);
    };

    const handleHighlight = () => {
        console.log('[StudioAI] Highlight captured');
    };

    const inviteCoHost = () => {
        console.log('[StudioAI] Inviting Co-Host');
    };

    return {
        isRunning,
        startAILoop,
        stopAILoop,
        
        // Assembler / AI Extras
        isAssembling,
        assembleProgress,
        assemble,
        handleHighlight,
        inviteCoHost,
        showScriptConfig: ref(false),
        activeCollaborators
    };
}
