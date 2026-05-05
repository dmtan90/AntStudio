import { reactive } from 'vue';
import { ActionSyncService } from './ActionSyncService';
import { studioDirector } from './StudioDirector';
// import { useStudioStore } from '@/stores/studio';

export interface ShowSegment {
    id: string;
    type: string; // Now used for video mapping: product, productId, speaking, wave, etc.
    title: string;
    durationMs: number;
    directive: string;
    vibe: string;
    productId?: string;
    gesture?: string;
    speaker?: string;
}

/**
 * NeuralShowrunner: The brain that scripts the show autonomously.
 * Plans segments and emits directives to AI guests and the director.
 */
export class NeuralShowrunner {
    public active = reactive({
        isRunning: false,
        isPlanning: false,
        currentSegmentIndex: -1,
        startTime: 0,
        elapsedMs: 0,
        isPaused: false,
        segments: [] as ShowSegment[],
        narrativeArc: 'rising' as 'rising' | 'climax' | 'falling' | 'calm',
        pivots: [] as { timestamp: number, reason: string, fromSegment: string }[],
        researchState: { isSearching: false, currentTopic: null as string | null },
        activePoll: null as { question: string, options: string[], results: number[] } | null,
        visualNarrative: { isActive: false, currentConcept: null as string | null }
    });

    private ticker: any = null;

    /**
     * Phase 38: Plans a new session autonomously using Gemini.
     */
    public async planSession(topic: string = 'The Future of AI Singularity') {
        this.active.isPlanning = true;
        
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const streamingContext = studioStore.streamingContext || 'general';

        console.log(`[NeuralShowrunner] CONSULTING GEMINI FOR SESSION PLAN: "${topic}" (Context: ${streamingContext})`);

        try {
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/plan-session', {
                topic,
                streamingContext, // Phase 22: Context-aware planning
                constraints: {
                    minSegments: 3,
                    maxSegments: 6,
                    durations: { intro: 60, debate: 180, qa: 120, outro: 60 }
                }
            });

            if (res?.data?.segments && Array.isArray(res.data.segments)) {
                this.active.segments = res.data.segments;
                
                // Phase 34.6: Prime initial context-specific data
                this.primeInitialContextData(topic, streamingContext);

                this.active.isPlanning = false;
                console.log('[NeuralShowrunner] Gemini Session Plan APPROVED');
                return;
            }
        } catch (error) {
            console.warn('[NeuralShowrunner] Gemini planning failed, using heuristic script.');
        }

        // Fallback Heuristic
        let segments: ShowSegment[] = [];
        
        if (streamingContext === 'sales') {
            segments = [
                {
                    id: 'seg_sales_intro',
                    type: 'intro',
                    title: 'Grand Opening',
                    durationMs: 45000,
                    directive: `Welcome the viewers to our live shopping event: "${topic}". Hype up the deals!`,
                    vibe: 'hype'
                },
                {
                    id: 'seg_sales_showcase_1',
                    type: 'product_showcase',
                    title: 'Hot Product Spot',
                    durationMs: 120000,
                    directive: `Introduce our first featured product. Focus on its key benefits and "limited time" nature.`,
                    vibe: 'hype'
                },
                {
                    id: 'seg_sales_qa',
                    type: 'qa',
                    title: 'Shopping Q&A',
                    durationMs: 90000,
                    directive: `Answer customer questions from the chat. Help them overcome buying objections.`,
                    vibe: 'professional'
                },
                {
                    id: 'seg_sales_showcase_2',
                    type: 'product_showcase',
                    title: 'Deal of the Day',
                    durationMs: 120000,
                    directive: `Bring out a major deal! Pivot the conversation to why this is a "must-have" item.`,
                    vibe: 'glitch'
                },
                {
                    id: 'seg_sales_outro',
                    type: 'outro',
                    title: 'Final Countdown',
                    durationMs: 45000,
                    directive: `Final reminders to check out! Thank everyone for joining our flash sale event.`,
                    vibe: 'vibrant'
                }
            ];
        } else {
            segments = [
                {
                    id: 'seg_intro',
                    type: 'intro',
                    title: 'Viral Opening',
                    durationMs: 60000,
                    directive: `Welcome the viewers and introduce the topic: "${topic}". Set a high-energy, mysterious vibe.`,
                    vibe: 'vibrant'
                },
                {
                    id: 'seg_debate_1',
                    type: 'debate',
                    title: 'The Great Debate',
                    durationMs: 180000,
                    directive: `Engage in a deep debate about ${topic}. AI Guests should challenge each other's perspectives.`,
                    vibe: 'cyberpunk'
                },
                {
                    id: 'seg_qa',
                    type: 'qa',
                    title: 'Audience Brain-Sync',
                    durationMs: 120000,
                    directive: `React to the most interesting chat messages about ${topic}. High interpersonal engagement.`,
                    vibe: 'dreamy'
                },
                {
                    id: 'seg_outro',
                    type: 'outro',
                    title: 'Neural Shutdown',
                    durationMs: 60000,
                    directive: `Summarize the key takeaways and thank the audience. Prepare for "Neural Logout".`,
                    vibe: 'noir'
                }
            ];
        }

        this.active.segments = segments;
        this.active.isPlanning = false;
    }

    /**
     * Phase 7: Load an externally-generated script from a Project storyboard.
     * Converts LiveScript steps into NeuralShowrunner segments and readies the show.
     */
    public loadExternalScript(script: { id: string; title: string; steps: any[] }) {
        const mapped: ShowSegment[] = script.steps.map((step: any, i: number) => {
            // Phase 9: Dynamic Duration based on dialogue length
            const text = step.text || step.dialogue || step.description || '';
            const wordCount = text.split(/\s+/).length;
            // ~450ms per word + 4s buffer for natural flow/video play
            const calculatedDuration = Math.max((step.durationSeconds || 10) * 1000, (wordCount * 500) + 4000);

            return {
                id: step.id || `step_${i}`,
                type: step.type || 'freestyle',
                title: step.title || step.description || `Scene ${i + 1}`,
                durationMs: calculatedDuration,
                directive: text || 'Continue the scene.',
                vibe: step.vibe || 'cinematic',
                productId: step.productId,
                gesture: step.gesture,
                speaker: step.speaker
            };
        });

        this.active.segments = mapped;
        this.active.isPlanning = false;
        this.active.currentSegmentIndex = -1;
        console.log(`[NeuralShowrunner] Loaded external script: "${script.title}" with ${mapped.length} segments.`);
    }

    public async start() {
        if (this.active.isRunning) return;
        
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();

        if (this.active.segments.length === 0) {
            if (studioStore.activeScript && studioStore.activeScript.length > 0) {
                console.log('[NeuralShowrunner] Loading active storyboard from StudioStore');
                this.loadExternalScript({ 
                    id: 'active-storyboard', 
                    title: 'Active Storyboard', 
                    steps: studioStore.activeScript 
                });
            } else {
                await this.planSession();
            }
        }

        this.active.isRunning = true;
        this.active.startTime = Date.now();
        this.active.currentSegmentIndex = 0;
        this.active.elapsedMs = 0;
        
        this.emitDirective();
        
        this.ticker = setInterval(() => this.tick(), 1000);
        console.log('[NeuralShowrunner] "Ghost in the Machine" ACTIVE');
    }

    public async stop() {
        if (!this.active.isRunning) return;
        
        console.log('[NeuralShowrunner] INITIATING GRACEFUL NEURAL SHUTDOWN...');
        
        // Phase 44: Graceful Termination Workflow
        // 1. Final Recap Cycle
        const { recapOrchestrator } = await import('./RecapOrchestrator');
        await recapOrchestrator.generateFullRecap();

        if (recapOrchestrator.state.currentRecap) {
            // 2. Automated Social Syndication
            const { viralSyndicationService } = await import('./ViralSyndicationService');
            await viralSyndicationService.syndicateFullRecap(recapOrchestrator.state.currentRecap);
        }

        // 3. Stop the tick and ticker
        this.active.isRunning = false;
        if (this.ticker) clearInterval(this.ticker);
        this.ticker = null;

        // 4. Signal UI for Post-Show Overlay
        window.dispatchEvent(new CustomEvent('studio:show_terminated', {
            detail: {
                recap: recapOrchestrator.state.currentRecap,
                timestamp: Date.now()
            }
        }));
    }

    public pause() {
        if (!this.active.isRunning || this.active.isPaused) return;
        this.active.isPaused = true;
        console.log('[NeuralShowrunner] PAUSED');
    }

    public resume() {
        if (!this.active.isRunning || !this.active.isPaused) return;
        this.active.isPaused = false;
        console.log('[NeuralShowrunner] RESUMED');
    }

    private async tick() {
        if (!this.active.isRunning || this.active.isPaused) return;
        
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        if (!studioStore.isLive) {
            this.active.startTime = Date.now() - this.active.elapsedMs; // Maintain progress
            return;
        }

        const now = Date.now();
        this.active.elapsedMs = now - this.active.startTime;

        const currentSegment = this.active.segments[this.active.currentSegmentIndex];
        if (!currentSegment) return;

        // Phase 34: Check for Cast Rotation every 30s
        if (Math.floor(this.active.elapsedMs / 1000) % 30 === 0) {
            this.checkForRotation();
        }

        // Context-Aware Frequencies (Phase 22)
        const ctx = studioStore.streamingContext;

        const intervalFactor = (() => {
            switch(ctx) {
                case 'sales': return 0.5;
                case 'gameshow': return 0.5;
                case 'game_streaming': return 0.7;
                case 'commentary': return 0.7;
                case 'sport': return 0.6;
                case 'news': return 0.8;
                case 'education': return 1.2;
                default: return 1.0;
            }
        })();

        // Phase 35: Commerce Orchestration
        if (Math.floor(this.active.elapsedMs / 1000) % Math.floor(45 * intervalFactor) === 0) {
            this.orchestrateCommerce();
        }

        // Phase 40: Visual B-Roll Orchestration
        if (Math.floor(this.active.elapsedMs / 1000) % Math.floor(75 * intervalFactor) === 0) {
            this.triggerBRollOrchestration();
        }

        // Phase 36: Neural Research (skip in sales context — avoid off-topic topic injection)
        const isSalesCtx = ctx === 'sales';
        if (!isSalesCtx && Math.floor(this.active.elapsedMs / 1000) % Math.floor(120 * intervalFactor) === 0) {
            this.researchTopic();
        }

        // Phase 39: Autonomous Polling
        if (Math.floor(this.active.elapsedMs / 1000) % Math.floor(300 * intervalFactor) === 0) {
            this.triggerAutonomousPoll();
        }

        // Check for segment transition (Phase 9: Audio-Aware)
        const isSpeaking = await this.isAISpeaking();
        const overDuration = this.active.elapsedMs > currentSegment.durationMs;
        const safetyCutoff = this.active.elapsedMs > currentSegment.durationMs + 30000; // Force transition after 30s overage

        if ((overDuration && !isSpeaking) || safetyCutoff) {
            this.nextSegment();
        }

        // Phase 52: Education Slide Auto-Progression
        if (ctx === 'education' && (studioStore.contextData as any).education?.slides?.length > 0) {
            const totalSlides = (studioStore.contextData as any).education.slides.length;
            const slideDuration = currentSegment.durationMs / totalSlides;
            const targetSlide = Math.floor(this.active.elapsedMs / slideDuration);
            if (targetSlide < totalSlides && (studioStore.contextData as any).education.activeSlide !== targetSlide) {
                (studioStore.contextData as any).education.activeSlide = targetSlide;
                this.emitDirective(); // Refresh guest instructions for new slide
            }
        }
    }


    private async checkForRotation() {
        const { syntheticGuestManager } = await import('./SyntheticGuestManager');
        const underperformingId = syntheticGuestManager.evaluateCastPerformance();
        
        if (underperformingId) {
            this.triggerCastRotation(underperformingId);
        }
    }

    private async triggerCastRotation(guestId: string) {
        const { syntheticGuestManager } = await import('./SyntheticGuestManager');
        const guest = syntheticGuestManager.activeGuests.get(guestId);
        if (!guest) return;

        console.log(`[NeuralShowrunner] ROTATING CAST: Evicting ${guest.persona.name} due to low engagement.`);
        
        this.active.pivots.push({
            timestamp: Date.now(),
            reason: `Cast Rotation: Low engagement from ${guest.persona.name}`,
            fromSegment: this.active.segments[this.active.currentSegmentIndex]?.title || 'Unknown'
        });

        // 1. Direct guest to say farewell
        window.dispatchEvent(new CustomEvent('showrunner:directive', {
            detail: {
                type: 'outro',
                directive: `(TO ${guest.persona.name}): Your engagement is low. Say a quick, humble farewell and "log out" of the singularity.`,
                vibe: 'melancholy'
            }
        }));

        // 2. Wait for farewell (simulated) then swap
        setTimeout(() => {
            syntheticGuestManager.removeGuest(guestId);
            
            // 3. Summon new guest from library
            const library = (syntheticGuestManager as any).personaLibrary || [];
            if (library.length > 0) {
                const nextGuest = library[Math.floor(Math.random() * library.length)];
                syntheticGuestManager.summonGuest(nextGuest);
                
                // 4. Announce new guest
                window.dispatchEvent(new CustomEvent('showrunner:directive', {
                    detail: {
                        type: 'intro',
                        directive: `A new entity ${nextGuest.name} has joined the singularity! Welcome them and pivot back to the topic.`,
                        vibe: 'excited'
                    }
                }));
            }
        }, 12000);
    }

    /**
     * Phase 25: Autonomously pivots the current show segment in response to an audience signal.
     */
    public pivotSegment(reason: string, suggestedType: ShowSegment['type'] = 'qa') {
        const currentTitle = this.active.segments[this.active.currentSegmentIndex]?.title || 'Unknown';
        
        console.log(`[NeuralShowrunner] AUDIENCE PIVOT TRIGGERED: ${reason}`);

        // Record the pivot in the audit trail
        this.active.pivots.push({
            timestamp: Date.now(),
            reason,
            fromSegment: currentTitle
        });

        // Inject a new urgent segment right after the current one
        const urgentSegment: ShowSegment = {
            id: `seg_pivot_${Date.now()}`,
            type: suggestedType,
            title: `LIVE PIVOT: ${reason.substring(0, 40)}`,
            durationMs: 90000,
            directive: `URGENT: The audience has reacted strongly (${reason}). Address this NOW.`,
            vibe: 'hype'
        };

        // Phase 29: RPG Quest Injection
        if (reason.includes('velocity_surge') && Math.random() > 0.4) {
            urgentSegment.type = 'rpg_quest';
            urgentSegment.title = "COMMUNITY CHALLENGE!";
            urgentSegment.vibe = 'hype';
        }

        // Insert after current segment
        const insertAt = this.active.currentSegmentIndex + 1;
        this.active.segments.splice(insertAt, 0, urgentSegment);

        // Announce pivot
        window.dispatchEvent(new CustomEvent('showrunner:directive', {
            detail: {
                segmentId: urgentSegment.id,
                type: urgentSegment.type,
                directive: urgentSegment.directive,
                vibe: urgentSegment.vibe
            }
        }));
    }

    private nextSegment() {
        if (this.active.currentSegmentIndex < this.active.segments.length - 1) {
            this.active.currentSegmentIndex++;
            this.active.startTime = Date.now();
            this.active.elapsedMs = 0;
            this.emitDirective();
            // Phase 32: Trigger session recap when arc ends
            import('./RecapOrchestrator').then(({ recapOrchestrator }) => {
                recapOrchestrator.generateFullRecap().then(async () => {
                    if (recapOrchestrator.state.currentRecap) {
                        const { useStudioStore } = await import('@/stores/studio');
                        useStudioStore().activeRecap = recapOrchestrator.state.currentRecap;
                        
                        // Phase 33: Autonomous Social Syndication of the Recap
                        import('./ViralSyndicationService').then(({ viralSyndicationService }) => {
                            viralSyndicationService.syndicateFullRecap(recapOrchestrator.state.currentRecap);
                        });
                    }
                });
            });

            // Phase 29: Quest Activation
            const segment = this.active.segments[this.active.currentSegmentIndex];
            if (segment.type === 'rpg_quest') {
                import('./AudienceQuestService').then(({ audienceQuestService }) => {
                    audienceQuestService.startQuest();
                });
            }
        }
    }

    private async emitDirective() {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const segment = this.active.segments[this.active.currentSegmentIndex];
        if (!segment) return;

        console.log(`[NeuralShowrunner] NEW DIRECTIVE: [${segment.title}] - ${segment.directive}`);

        // Context-Aware Memory Injection (Phase 44)
        const currentTopic = segment.title + (this.active.researchState.currentTopic || "");
        const { neuralMemoryService } = await import('./NeuralMemoryService');
        const memory = neuralMemoryService.getDeepRecallContext(currentTopic);

        // 1. Notify AI Guests directly via window event (SyntheticGuestManager listens)
        const slide = (studioStore.streamingContext === 'education' && studioStore.contextData.education.slides?.length > 0)
            ? studioStore.contextData.education.slides[studioStore.contextData.education.activeSlide]
            : null;

        const slideDirective = slide ? ` [CURRENT SLIDE: "${slide.title}" - Points: ${slide.bullets.join('; ')}]` : "";

        // Phase 109/110/111: Attach product context if we are in sales mode
        let productContext = null;
        if (studioStore.streamingContext === 'sales' && studioStore.liveProducts?.length > 0) {
            // Phase 111: Use explicit productId or type if it matches a productId
            const pid = segment.productId || (segment.type.length > 20 ? segment.type : null);
            if (pid) {
                productContext = studioStore.liveProducts.find((p: any) => p._id === pid || p.id === pid);
            }
            
            if (!productContext) {
                productContext = this.pickBestProduct(studioStore);
            }

            if (productContext) {
                console.log(`[NeuralShowrunner] Attaching product context to directive: ${productContext.name} (Segment: ${segment.type})`);
            }
        }

        window.dispatchEvent(new CustomEvent('showrunner:directive', {
            detail: {
                segmentId: segment.id,
                type: segment.type,
                directive: segment.directive + (memory ? ` [REFERENCE MEMORY: ${memory}]` : "") + slideDirective,
                vibe: segment.vibe,
                memoryContext: memory,
                slideContext: slide,
                productContext: productContext, // Phase 109/110
                gesture: segment.gesture,
                originSpeaker: segment.speaker
            }
        }));

        // 2. Instruct Studio Director to shift atmosphere
        studioDirector.requestAction('change_global_atmosphere', { effect: segment.vibe }, 5);
        
        // 3. Broadcast to remote participants via Socket
        const socket = ActionSyncService.getSocket();
        if (socket) {
            socket.emit('showrunner:state_update', {
                currentSegment: segment.title,
                directive: segment.directive,
                arc: this.active.narrativeArc
            });
        }
    }

    private async isAISpeaking(): Promise<boolean> {
        try {
            const { audioMixerService } = await import('./AudioMixerService');
            const currentSegment = this.active.segments[this.active.currentSegmentIndex];
            const speaker = currentSegment?.speaker;

            if (speaker) {
                // Precise check for specific speaker
                const level = audioMixerService.getTrackLevel(`influencer_${speaker}`);
                if (level > 0.02) return true;
                
                // Also check by name as fallback if ID is not available in track names
                const nameLevel = audioMixerService.getTrackLevel(`influencer_${speaker.toLowerCase().replace(/\s+/g, '_')}`);
                if (nameLevel > 0.02) return true;
            }

            // Global fallback
            const { useStudioStore } = await import('@/stores/studio');
            const studioStore = useStudioStore();
            
            return studioStore.liveGuests.some((g: any) => {
                const level = audioMixerService.getTrackLevel(`influencer_${g.uuid}`);
                return level > 0.02; // Threshold for active speech
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Phase 35: Autonomous Commerce Orchestration
     * Connects narrative flow with a commerce strategy.
     */
    private async orchestrateCommerce() {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        if (!studioStore.liveProducts || studioStore.liveProducts.length === 0) return;

        const currentSegment = this.active.segments[this.active.currentSegmentIndex];
        const isShowcase = currentSegment?.type === 'product_showcase';
        const isHighIntent = studioStore.intentScore > 0.7;

        if (isShowcase || isHighIntent) {
            const product = this.pickBestProduct(studioStore);
            if (!product) return;

            console.log(`[NeuralShowrunner] Intelligent Commerce: pitching ${product.name}`);
            
            window.dispatchEvent(new CustomEvent('showrunner:directive', {
                detail: {
                    type: 'product_showcase',
                    directive: `Contextual recommendation: ${product.name}. Price: ${product.price}. High intent detected. Bridge the current topic to this product!`,
                    vibe: 'hype',
                    productContext: product
                }
            }));

            // Autonomous Flash Sale Trigger
            if (studioStore.chatVelocity > 1.5 && !studioStore.activeFlashSale) {
                this.triggerAutonomousFlashSale(product);
            }
        }
    }

    /**
     * Phase 110: Helper to pick the best product based on engagement/relevance
     */
    private pickBestProduct(studioStore: any): any {
        if (!studioStore.liveProducts || studioStore.liveProducts.length === 0) return null;

        const currentSegment = this.active.segments[this.active.currentSegmentIndex];
        const products = [...studioStore.liveProducts];
        
        // Rank by engagement
        products.sort((a: any, b: any) => {
            const scoreA = (a.qrClicks || 0) + (a.interactCount || 0);
            const scoreB = (b.qrClicks || 0) + (b.interactCount || 0);
            return scoreB - scoreA;
        });

        // Try to match context
        const context = (this.active.researchState.currentTopic + " " + (currentSegment?.title || "")).toLowerCase();
        let product = products.slice(0, 3).find((p: any) => 
            context.includes(p.name.toLowerCase()) || 
            (p.category && context.includes(p.category.toLowerCase()))
        );

        return product || products[0];
    }

    private async triggerAutonomousFlashSale(product: any) {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        
        console.log(`[NeuralShowrunner] STARTING AUTONOMOUS FLASH SALE: ${product.name}`);
        
        studioStore.activeFlashSale = {
            productId: product.id,
            discount: 20,
            durationMinutes: 3,
            startTime: Date.now()
        };

        this.active.pivots.push({
            timestamp: Date.now(),
            reason: `Autonomous Flash Sale: ${product.name}`,
            fromSegment: this.active.segments[this.active.currentSegmentIndex]?.title || 'Unknown'
        });
    }

    /**
     * Phase 36/37: Neural External Intelligence
     * Triggers an autonomous research pulse, now powered by Gemini.
     */
    private async researchTopic() {
        const { neuralResearchService } = await import('./NeuralResearchService');
        
        this.active.researchState.isSearching = true;
        this.active.researchState.currentTopic = 'SYNCING WITH NEURAL HUB...';

        const insight = await neuralResearchService.performResearchPulse();
        this.active.researchState.isSearching = false;

        if (!insight) {
            this.active.researchState.currentTopic = "NO RELEVANT TRENDS DETECTED";
            return;
        }

        this.active.researchState.currentTopic = insight.topic;
        console.log(`[NeuralShowrunner] RESEARCH PULSE SUCCESS: ${insight.topic}`);

        // Phase 41: Trigger Evidence Overlay if statistics detected
        if (insight.visualData) {
            const { evidenceOverlayService } = await import('./EvidenceOverlayService');
            evidenceOverlayService.triggerEvidence({
                type: insight.visualData.type || 'stat',
                title: insight.topic,
                description: insight.fact,
                data: insight.visualData,
                confidence: insight.confidence,
                sourceUrl: insight.source
            });
        }

        // Phase 44: Record this as a long-term learning
        const { neuralMemoryService } = await import('./NeuralMemoryService');
        neuralMemoryService.recordLearning(insight.topic, insight.fact);

        window.dispatchEvent(new CustomEvent('showrunner:directive', {
            detail: {
                type: 'research_injection',
                directive: `Verified Insight: ${insight.fact}. Source: ${insight.source || 'Neural Verify'}. Interject this naturally.`,
                vibe: 'intellectual',
                knowledgeContext: insight.fact,
                isGeminiSourced: true,
                isVerified: true
            }
        }));
    }

    /**
     * Phase 39: Autonomous Polling
     * Creates a Gemini-powered poll based on current debate context.
     */
    private async triggerAutonomousPoll() {
        const currentSegment = this.active.segments[this.active.currentSegmentIndex];
        if (!currentSegment || currentSegment.type !== 'debate') return;

        console.log('[NeuralShowrunner] GENERATING AUTONOMOUS POLL...');

        try {
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/generate-poll', {
                topic: currentSegment.title,
                directive: currentSegment.directive
            });

            if (res?.data?.poll) {
                this.active.activePoll = {
                    ...res.data.poll,
                    results: res.data.poll.options.map(() => 0)
                };

                window.dispatchEvent(new CustomEvent('showrunner:directive', {
                    detail: {
                        type: 'poll_start',
                        directive: `New audience poll: "${this.active.activePoll?.question}". Discuss this with the viewers!`,
                        poll: this.active.activePoll
                    }
                }));

                // Simulate poll results coming in after 45s
                setTimeout(() => this.processPollResults(), 45000);
            }
        } catch (error) {
            console.warn('[NeuralShowrunner] Poll generation failed.');
        }
    }

    private async processPollResults() {
        if (!this.active.activePoll) return;

        // Simulate random results
        this.active.activePoll.results = this.active.activePoll.options.map(() => Math.floor(Math.random() * 100));
        const winnerIdx = this.active.activePoll.results.indexOf(Math.max(...this.active.activePoll.results));
        const winner = this.active.activePoll.options[winnerIdx];

        window.dispatchEvent(new CustomEvent('showrunner:directive', {
            detail: {
                type: 'poll_results',
                directive: `The audience has spoken! "${winner}" won the poll. React to this result!`,
                winner,
                results: this.active.activePoll.results
            }
        }));

        // Phase 43: Record the poll result as a viral moment
        const { recapOrchestrator } = await import('./RecapOrchestrator');
        recapOrchestrator.recordMoment(
            `Poll Result: ${winner} won`,
            0.85,
            `The audience voted on "${this.active.activePoll.question}" and chose "${winner}" with a decisive majority.`
        );

        // Keep results visible for a while then clear
        setTimeout(() => {
            if (this.active.activePoll) {
                this.active.activePoll = null;
            }
        }, 30000);
    }

    /**
     * Phase 40: Autonomous B-Roll & Visual Narrative
     * Orchestrates visual context changes based on the debate.
     */
    private async triggerBRollOrchestration() {
        if (!this.active.isRunning || this.active.visualNarrative.isActive) return;

        const currentSegment = this.active.segments[this.active.currentSegmentIndex];
        if (!currentSegment || (currentSegment.type !== 'debate' && currentSegment.type !== 'intro')) return;

        console.log('[NeuralShowrunner] ANALYZING VISUAL NARRATIVE OPPORTUNITIES...');

        try {
            const { VisualConceptService } = await import('./VisualConceptService');
            const concept = await VisualConceptService.extractConcept(currentSegment.directive);
            
            if (concept) {
                this.active.visualNarrative.isActive = true;
                this.active.visualNarrative.currentConcept = concept;

                console.log(`[NeuralShowrunner] VISUAL CONCEPT DETECTED: ${concept}. Pulsing B-Roll.`);

                // 1. Request Director to show B-Roll / Concept Overlay
                studioDirector.requestAction('show_overlay', { 
                    type: 'b_roll_generated', 
                    concept, 
                    duration: 15000 
                }, 5);

                // 2. Change environment atmosphere to match concept
                studioDirector.requestAction('change_global_atmosphere', { effect: 'dynamic_theme', theme: concept }, 3);

                // Clear after duration
                setTimeout(() => {
                    this.active.visualNarrative.isActive = false;
                    this.active.visualNarrative.currentConcept = null;
                }, 15000);
            }
        } catch (error) {
            console.warn('[NeuralShowrunner] Visual orchestration failed.');
        }
    }

    /**
     * Seeds the studioStore.contextData with initial topic-relevant values.
     * Phase 51: Enhanced with dynamic AI generation for realistic overlay content.
     */
    private async primeInitialContextData(topic: string, context: string) {
        const { useStudioStore } = await import('@/stores/studio');
        const studioStore = useStudioStore();
        const data = studioStore.contextData;

        console.log(`[NeuralShowrunner] Priming ${context} data for topic: ${topic}`);

        // Phase 51: Request Gemini to generate topic-specific dynamic data seeds
        try {
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/generate-dynamic-content', {
                topic,
                context,
                dataType: 'initial_stats'
            });

            if (res?.data?.contextData) {
                console.log(`[NeuralShowrunner] Dynamic Context Data Seeded by Gemini for ${context}`);
                Object.assign(data[context], res.data.contextData);
                return;
            }
        } catch (e) {
            console.warn('[NeuralShowrunner] Dynamic content seeding failed, using heuristics.');
        }

        // Heuristic Fallback
        switch (context) {
            case 'sport':
                if (topic.includes('vs')) {
                    const teams = topic.split('vs').map(t => t.trim().substring(0, 3).toUpperCase());
                    data.sport.homeTeam = teams[0] || 'HOME';
                    data.sport.awayTeam = teams[1] || 'AWAY';
                }
                data.sport.homeScore = 0;
                data.sport.awayScore = 0;
                break;
            case 'news':
                data.news.breaking = "SESSION START";
                data.news.ticker = [`Topic: ${topic}`, "Host joining the desk...", "AI Analysis engaged"];
                break;
            case 'sales':
                data.sales.totalSold = 0;
                data.sales.stockLeft = 100;
                break;
            case 'education':
                data.education.currentLesson = topic;
                data.education.activeSlide = 1;
                break;
            case 'talkshow':
                data.talkshow.sessionTitle = topic;
                data.talkshow.startTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                data.talkshow.script = [];
                break;
            case 'gaming':
                data.gaming.gameName = topic.toUpperCase();
                data.gaming.excitement = 50;
                break;
            case 'commentary':
                data.commentary.momentum = 20;
                data.commentary.reactions = ["Welcome to the highlight reel!"];
                break;
        }
    }
}

export const neuralShowrunner = new NeuralShowrunner();
