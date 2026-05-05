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

        // Transition logic: Steps usually have a calculated duration or based on dialogue
        // For SaleRunner, we prefer explicit progression or audio-completion signals.
        // For now, use the duration defined in the step (from SaleWizard).
        const duration = (currentStep.duration || 15) * 1000;
        
        if (this.state.elapsedMs > duration) {
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
            console.log('[SaleRunner] Storyboard completed.');
            // loop or stay on last product? Stay for now.
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

        if (targetGuestId) {
            const guest = syntheticGuestManager.activeGuests.get(targetGuestId);
            // const context = studioStore.streamingContext;

            // Trigger visual gesture if defined (for non-aidol this acts as animation, for aidol we consolidate below)
            // if (step.gesture && guest?.persona.visual?.modelType !== 'aidol') {
            //     syntheticGuestManager.triggerGesture(targetGuestId, step.gesture);
            // }

            // Phase 112: AIDOL Dynamic Clip Triggering
            if (guest?.persona.visual?.modelType === 'aidol') {
                // If the step has a productId, we prefer that clip
                window.dispatchEvent(new CustomEvent('showrunner:directive', {
                    detail: {
                        type: step.type || step.gesture || 'product', // Respect custom clip mappings from the script!
                        directive: step.text,
                        originSpeaker: step.speaker,
                        productContext: step.productId ? studioStore.liveProducts.find((p: any) => p._id === step.productId || p.id === step.productId) : null
                    }
                }));
            }
            else{
                const type = step.gesture || step.type || "happy";
                syntheticGuestManager.triggerGesture(targetGuestId, type);
            }

            // Trigger the actual speech
            // We use a specific instruction to follow the script exactly
            const prompt = `[STORYBOARD SCRIPT]: "${step.text}"
[INSTRUCTION]: Say exactly this script. Do not hallucinate or add extra information. Maintain a ${step.vibe || 'professional'} tone.`;

            await syntheticGuestManager.talk(targetGuestId, prompt, { 
                vibe: step.vibe || 'professional',
                autoEmotionEnabled: true
            });
        }

        // 3. Shift background/atmosphere if needed
        if (step.vibe) {
            studioDirector.requestAction('change_global_atmosphere', { effect: step.vibe }, 5);
        }
    }
}

export const saleRunner = new SaleRunner();
