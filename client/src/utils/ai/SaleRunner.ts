import { reactive } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { syntheticGuestManager } from './SyntheticGuestManager';
import { studioDirector } from './StudioDirector';

/**
 * SaleRunner: Specialized orchestrator for Sales Storyboards.
 * Ensures the AI follows the pre-planned script without interference.
 */
export class SaleRunner {
    public state = reactive({
        isRunning: false,
        currentStepIndex: -1,
        startTime: 0,
        elapsedMs: 0,
        isPaused: false
    });

    private ticker: any = null;
    private lastSpeakingTime = 0;

    public async start() {
        if (this.state.isRunning) return;

        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();

        if (!studioStore.activeScript || studioStore.activeScript.length === 0) {
            console.warn('[SaleRunner] No active script found in StudioStore. Awaiting storyboard.');
            return;
        }

        console.log(`[SaleRunner] Starting Sales Storyboard with ${studioStore.activeScript.length} steps.`);
        
        this.state.isRunning = true;
        this.state.startTime = Date.now();
        this.state.currentStepIndex = 0;
        this.state.elapsedMs = 0;
        this.lastSpeakingTime = Date.now();

        this.executeCurrentStep();
        this.ticker = setInterval(() => this.tick(), 1000);
    }

    public stop() {
        if (!this.state.isRunning) return;
        
        console.log('[SaleRunner] Stopping Sales Storyboard.');
        this.state.isRunning = false;
        if (this.ticker) clearInterval(this.ticker);
        this.ticker = null;
        this.state.currentStepIndex = -1;
    }

    private tick() {
        if (!this.state.isRunning || this.state.isPaused) return;

        const studioStore = useStudioStore();
        if (!studioStore.isLive) return;

        const now = Date.now();
        this.state.elapsedMs = now - this.state.startTime;

        const currentStep = studioStore.activeScript[this.state.currentStepIndex];
        if (!currentStep) return;

        // Synchronize with the guest speaking/thinking lifecycle
        const guests = Array.from(syntheticGuestManager.activeGuests.values());
        let targetGuest = null;

        if (currentStep.speaker) {
            targetGuest = guests.find(g => 
                g.persona.entityId === currentStep.speaker || g.persona.identity.name === currentStep.speaker
            );
        }
        
        // Fallback to master or first guest
        if (!targetGuest && guests.length > 0) {
            targetGuest = guests.find(g => g.persona.isMaster) || guests[0];
        }

        // We transition to the next step when no new audio chunk has been received for a specified silent gap.
        // We enforce a minimum grace period of 2.5s to let the API start sending chunks,
        // and a safety timeout (defaulting to step duration or 30s) so it never gets stuck.
        const maxDuration = (currentStep.duration || 30) * 1000;
        let shouldTransition = false;
        
        if (this.state.elapsedMs >= maxDuration) {
            console.log(`[SaleRunner] Safety timeout reached for step ${this.state.currentStepIndex + 1}. Transitioning.`);
            shouldTransition = true;
        } else if (this.state.elapsedMs > 2500) {
            if (targetGuest && currentStep.text) {
                // PRIMARY: Explicit turnComplete flag handshake
                if (targetGuest.isTurnComplete && !targetGuest.isSpeaking && !targetGuest.isAudioPlaying) {
                    console.log(`[SaleRunner] Turn complete handshake triggered (isTurnComplete: true, isSpeaking: false, isAudioPlaying: false) for step ${this.state.currentStepIndex + 1}. Transitioning immediately.`);
                    shouldTransition = true;
                } else {
                    // FALLBACK: Heuristic silence detection
                    const lastChunkTime = targetGuest.lastAudioTime || 0;
                    
                    // If a chunk arrived in the first 3.0 seconds of this step, it is a lingering chunk from the previous turn.
                    // We treat it as stale (0) to ensure we wait for the actual new response audio to start.
                    const isChunkStale = lastChunkTime > 0 && (lastChunkTime - this.state.startTime < 3000);
                    const activeChunkTime = isChunkStale ? 0 : lastChunkTime;
                    
                    if (activeChunkTime > 0) {
                        const timeSinceLastChunk = Date.now() - activeChunkTime;
                        
                        // If no audio chunk has been received for 10000ms (10.0 seconds) after audio started,
                        // we assume the voice has finished playing and transition.
                        if (timeSinceLastChunk >= 7000) {
                            console.log(`[SaleRunner] Direct audio chunk silence detected (${timeSinceLastChunk}ms since last chunk) for step ${this.state.currentStepIndex + 1}. Transitioning.`);
                            shouldTransition = true;
                        }
                    } else {
                        // We are still waiting for the first valid audio chunk of this step to arrive or the turnComplete signal.
                        // Do NOT transition yet, wait for Gemini to start speaking or for the safety timeout.
                        if (Math.floor(this.state.elapsedMs / 1000) % 5 === 0) {
                            console.log(`[SaleRunner] Step ${this.state.currentStepIndex + 1}: Waiting for turnComplete or valid audio chunks... (isTurnComplete: ${targetGuest.isTurnComplete}, isSpeaking: ${targetGuest.isSpeaking}, isAudioPlaying: ${targetGuest.isAudioPlaying})`);
                        }
                    }
                }
            } else {
                // If no active guest or if this step has no text, transition based on duration
                const duration = (currentStep.duration || 15) * 1000;
                if (this.state.elapsedMs > duration) {
                    console.log(`[SaleRunner] Step ${this.state.currentStepIndex + 1} duration reached (${duration}ms). Transitioning.`);
                    shouldTransition = true;
                }
            }
        }

        if (shouldTransition) {
            this.nextStep();
        }
    }

    private nextStep() {
        const studioStore = useStudioStore();
        if (this.state.currentStepIndex < studioStore.activeScript.length - 1) {
            this.state.currentStepIndex++;
            this.state.startTime = Date.now();
            this.state.elapsedMs = 0;
            this.executeCurrentStep();
        } else {
            console.log('[SaleRunner] Storyboard completed. Looping back to the beginning.');
            // Loop back to the beginning for continuous selling
            if (studioStore.activeScript.length > 0) {
                this.state.currentStepIndex = 0;
                this.state.startTime = Date.now();
                this.state.elapsedMs = 0;
                this.executeCurrentStep();
            }
        }
    }

    private async executeCurrentStep() {
        const studioStore = useStudioStore();
        const step = studioStore.activeScript[this.state.currentStepIndex];
        if (!step) return;

        console.log(`[SaleRunner] Executing Step ${this.state.currentStepIndex + 1}: [${step.type}] ${step.text?.substring(0, 50)}...`);

        // 1. Synchronize Product Listing
        if (step.productId) {
            studioStore.highlightProduct(step.productId);
        }

        // 2. Instruct SyntheticGuestManager to perform the dialogue
        // We find the appropriate guest (by speaker ID or name)
        const guests = Array.from(syntheticGuestManager.activeGuests.values());
        let targetGuestId = null;

        if (step.speaker) {
            // Find guest mapping to the speaker entityId or name
            const guestEntry = Array.from(syntheticGuestManager.activeGuests.entries()).find(([id, g]) => 
                g.persona.entityId === step.speaker || g.persona.identity.name === step.speaker
            );
            targetGuestId = guestEntry ? guestEntry[0] : null;
        }

        // Fallback to Master or First Guest
        if (!targetGuestId && guests.length > 0) {
            const masterEntry = Array.from(syntheticGuestManager.activeGuests.entries()).find(([id, g]) => g.persona.isMaster);
            targetGuestId = masterEntry ? masterEntry[0] : Array.from(syntheticGuestManager.activeGuests.keys())[0];
        }

        // Reset audio chunk timestamps and turn complete flags for ALL active guests and connections to ensure no stale state triggers early transitions
        for (const guest of syntheticGuestManager.activeGuests.values()) {
            guest.lastAudioTime = 0;
            guest.isTurnComplete = false;
            guest.isSpeaking = false;
            guest.isAudioPlaying = false;
        }
        import('@/composables/studio/useLiveChatManager').then(({ connections }) => {
            for (const conn of Object.values(connections)) {
                conn.isSpeaking = false;
                conn.isAudioPlaying = false;
                conn.isTurnComplete = false;
                if (conn.geminiLive) {
                    // Safe resetting that handles both Ref objects and Vue-reactive unwrapped values
                    if (conn.geminiLive.lastAudioTime !== undefined && conn.geminiLive.lastAudioTime !== null) {
                        if (typeof conn.geminiLive.lastAudioTime === 'object' && 'value' in conn.geminiLive.lastAudioTime) {
                            conn.geminiLive.lastAudioTime.value = 0;
                        } else {
                            (conn.geminiLive as any).lastAudioTime = 0;
                        }
                    }
                    if (conn.geminiLive.isTurnComplete !== undefined && conn.geminiLive.isTurnComplete !== null) {
                        if (typeof conn.geminiLive.isTurnComplete === 'object' && 'value' in conn.geminiLive.isTurnComplete) {
                            conn.geminiLive.isTurnComplete.value = false;
                        } else {
                            (conn.geminiLive as any).isTurnComplete = false;
                        }
                    }
                    if (conn.geminiLive.isAudioPlaying !== undefined && conn.geminiLive.isAudioPlaying !== null) {
                        if (typeof conn.geminiLive.isAudioPlaying === 'object' && 'value' in conn.geminiLive.isAudioPlaying) {
                            conn.geminiLive.isAudioPlaying.value = false;
                        } else {
                            (conn.geminiLive as any).isAudioPlaying = false;
                        }
                    }
                }
            }
        }).catch(err => console.error("[SaleRunner] Failed to reset connection states:", err));

        if (targetGuestId) {
            const guest = syntheticGuestManager.activeGuests.get(targetGuestId);
            // const context = studioStore.streamingContext;

            // Trigger visual gesture if defined (for non-aidol this acts as animation, for aidol we consolidate below)
            // if (step.gesture && guest?.persona.visual?.modelType !== 'aidol') {
            //     syntheticGuestManager.triggerGesture(targetGuestId, step.gesture);
            // }

            // Dispatch directive universally to update the UI (activityFeed)
            window.dispatchEvent(new CustomEvent('showrunner:directive', {
                detail: {
                    type: step.type || step.gesture || 'product',
                    directive: step.text,
                    originSpeaker: step.speaker,
                    productContext: step.productId ? studioStore.liveProducts.find((p: any) => p._id === step.productId || p.id === step.productId) : null
                }
            }));

            // AIDOL Dynamic Clip Triggering or standard 3D gestures
            if (guest?.persona.visual?.modelType !== 'aidol') {
                const type = step.gesture || step.type || "happy";
                syntheticGuestManager.triggerGesture(targetGuestId, type);
            }

            // Trigger the actual speech
            // We use a specific instruction to follow the script exactly
            const prompt = `[STORYBOARD SCRIPT]: "${step.text}"
			[INSTRUCTION]: Say exactly this script. Maintain a ${step.vibe || 'professional'} tone.`;

            await syntheticGuestManager.generateResponse(targetGuestId, prompt, { 
                vibe: step.vibe || 'professional',
                autoEmotionEnabled: true
            } as any);
        }

        // 3. Shift background/atmosphere if needed
        if (step.vibe) {
            studioDirector.requestAction('change_global_atmosphere', { effect: step.vibe }, 5);
        }
    }
}

export const saleRunner = new SaleRunner();
