import { reactive } from 'vue';
import { ActionSyncService } from './ActionSyncService';
import { studioDirector } from './StudioDirector';

export interface ShowSegment {
    id: string;
    type: 'intro' | 'debate' | 'qa' | 'product_showcase' | 'outro' | 'freestyle';
    title: string;
    durationMs: number;
    directive: string;
    vibe: string;
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
        console.log(`[NeuralShowrunner] CONSULTING GEMINI FOR SESSION PLAN: "${topic}"`);

        try {
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/plan-session', {
                topic,
                constraints: {
                    minSegments: 3,
                    maxSegments: 6,
                    durations: { intro: 60, debate: 180, qa: 120, outro: 60 }
                }
            });

            if (res?.data?.segments && Array.isArray(res.data.segments)) {
                this.active.segments = res.data.segments;
                this.active.isPlanning = false;
                console.log('[NeuralShowrunner] Gemini Session Plan APPROVED');
                return;
            }
        } catch (error) {
            console.warn('[NeuralShowrunner] Gemini planning failed, using heuristic script.');
        }

        // Fallback Heuristic
        const segments: ShowSegment[] = [
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

        this.active.segments = segments;
        this.active.isPlanning = false;
    }

    public start() {
        if (this.active.isRunning) return;
        
        if (this.active.segments.length === 0) {
            this.planSession();
        }

        this.active.isRunning = true;
        this.active.startTime = Date.now();
        this.active.currentSegmentIndex = 0;
        
        this.emitDirective();
        
        this.ticker = setInterval(() => this.tick(), 1000);
        console.log('[NeuralShowrunner] "Ghost in the Machine" ACTIVE');
    }

    public stop() {
        this.active.isRunning = false;
        if (this.ticker) clearInterval(this.ticker);
        this.ticker = null;
    }

    private tick() {
        if (!this.active.isRunning) return;

        const now = Date.now();
        this.active.elapsedMs = now - this.active.startTime;

        const currentSegment = this.active.segments[this.active.currentSegmentIndex];
        if (!currentSegment) return;

        // Phase 34: Check for Cast Rotation every 30s
        if (Math.floor(this.active.elapsedMs / 1000) % 30 === 0) {
            this.checkForRotation();
        }

        // Phase 35: Commerce Orchestration every 45s
        if (Math.floor(this.active.elapsedMs / 1000) % 45 === 0) {
            this.orchestrateCommerce();
        }

        // Phase 40: Visual B-Roll Orchestration every 75s
        if (Math.floor(this.active.elapsedMs / 1000) % 75 === 0) {
            this.triggerBRollOrchestration();
        }

        // Phase 36: Neural Research every 120s
        if (Math.floor(this.active.elapsedMs / 1000) % 120 === 0) {
            this.researchTopic();
        }

        // Phase 39: Autonomous Polling every 300s (5 mins)
        if (Math.floor(this.active.elapsedMs / 1000) % 300 === 0) {
            this.triggerAutonomousPoll();
        }

        // Check for segment transition
        if (this.active.elapsedMs > currentSegment.durationMs) {
            this.nextSegment();
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

    private nextSegment() {
        if (this.active.currentSegmentIndex < this.active.segments.length - 1) {
            this.active.currentSegmentIndex++;
            this.active.startTime = Date.now();
            this.active.elapsedMs = 0;
            this.emitDirective();
        } else {
            console.log('[NeuralShowrunner] Narrative arc complete. Restarting loop...');
            this.active.currentSegmentIndex = 0;
            this.active.startTime = Date.now();
            this.emitDirective();
        }
    }

    private emitDirective() {
        const segment = this.active.segments[this.active.currentSegmentIndex];
        if (!segment) return;

        console.log(`[NeuralShowrunner] NEW DIRECTIVE: [${segment.title}] - ${segment.directive}`);

        // 1. Notify AI Guests directly via window event (SyntheticGuestManager listens)
        window.dispatchEvent(new CustomEvent('showrunner:directive', {
            detail: {
                segmentId: segment.id,
                type: segment.type,
                directive: segment.directive,
                vibe: segment.vibe
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

    public pivotSegment(reason: string) {
        if (!this.active.isRunning) return;

        const current = this.active.segments[this.active.currentSegmentIndex];
        console.log(`[NeuralShowrunner] PIVOTING: ${reason} (Current: ${current?.title})`);

        this.active.pivots.push({
            timestamp: Date.now(),
            reason,
            fromSegment: current?.title || 'Unknown'
        });

        // Effect: Either jump to next segment or change directive of current one
        if (reason.toLowerCase().includes('hype')) {
            // High hype: jump to climax/debate earlier
            this.nextSegment();
        } else {
            // Negative sentiment: change directive to "deflect and cheer up"
            if (current) {
                current.directive = `[PIVOT: ${reason}] Address the room's mood. Shift the energy to something more positive and engaging.`;
                this.emitDirective();
            }
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
            const product = studioStore.liveProducts[Math.floor(Math.random() * studioStore.liveProducts.length)];
            console.log(`[NeuralShowrunner] Autonomous Commerce: pitching ${product.name}`);
            
            window.dispatchEvent(new CustomEvent('showrunner:directive', {
                detail: {
                    type: 'product_showcase',
                    directive: `Featured product: ${product.name}. Price: ${product.price}. High intent detected. Pitch it!`,
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
        const { guestKnowledgeService } = await import('./GuestKnowledgeService');
        
        this.active.researchState.isSearching = true;
        this.active.researchState.currentTopic = 'SYNCING WITH GEMINI...';

        const topics = await guestKnowledgeService.retrieveTrendingTopics();
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        this.active.researchState.currentTopic = randomTopic;
        console.log(`[NeuralShowrunner] RESEARCHING: ${randomTopic}`);

        // Simulate research delay (or actual RAG wait)
        setTimeout(async () => {
            const { fact, visualData } = await guestKnowledgeService.retrieveKnowledge(randomTopic);
            
            // Phase 42: Neural Fact-Check
            const { neuralFactChecker } = await import('./NeuralFactChecker');
            const check = await neuralFactChecker.verifyClaim(fact, randomTopic);

            this.active.researchState.isSearching = false;

            if (!check.isValid || check.confidence < 0.8) {
                console.warn(`[NeuralShowrunner] FACT-CHECK FAILED for: "${fact}". Silencing claim.`);
                this.active.researchState.currentTopic = "VERIFICATION FAILED (CLAIM SILENCED)";
                return;
            }

            // Phase 44: Record this as a long-term learning
            const { neuralMemoryService } = await import('./NeuralMemoryService');
            neuralMemoryService.recordLearning(randomTopic, fact);

            // Phase 41: Trigger Evidence Overlay if statistics detected
            if (visualData) {
                const { evidenceOverlayService } = await import('./EvidenceOverlayService');
                evidenceOverlayService.triggerEvidence({
                    type: visualData.type || 'stat',
                    title: randomTopic,
                    description: fact,
                    data: visualData,
                    confidence: check.confidence, // Use fact-check confidence
                    sourceUrl: check.source // Phase 42: Actual cited source
                });
            }

            window.dispatchEvent(new CustomEvent('showrunner:directive', {
                detail: {
                    type: 'research_injection',
                    directive: `Verified Insight: ${fact}. Source: ${check.source || 'Neural Verify'}. Interject this naturally.`,
                    vibe: 'intellectual',
                    knowledgeContext: fact,
                    isGeminiSourced: true,
                    isVerified: true
                }
            }));
        }, 5000);
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
}

export const neuralShowrunner = new NeuralShowrunner();
