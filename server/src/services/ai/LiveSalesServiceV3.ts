import { generateJSON, generateText } from '../../utils/AIGenerator.js';
import { Logger } from '../../utils/Logger.js';
import { Types } from 'mongoose';
import { Influencer } from '../../models/Influencer.js';
import { Product } from '../../models/Product.js';
import { StreamSessionModel } from '../../models/StreamSession.js';
import { socketServer } from '../streaming/SocketServer.js';
import { liveSalesService } from './LiveSalesService.js';

export interface StoryboardStep {
    state: 'GREETING' | 'PITCHING' | 'Q_AND_A' | 'CLOSING';
    text: string;         // voiceover match with orchestrate format
    type: string;         // idle | speaking | hype | product | checkout | wave | [PRODUCT_ID]
    gesture: string;      // excited | victory | happy | wave | speaking | hype
    speaker?: string;     // Influencer name (optional, used for multi-person mode)
    productId?: string;   // Exact MongoDB ObjectId of product
    title?: string;       // Short title of step
}

export interface FSMStateContext {
    sessionId: string;
    currentState: 'GREETING' | 'PITCHING' | 'Q_AND_A' | 'CLOSING';
    viewers: number;
    remainingStock: number;
    activeTimerMinutes: number;
    unhandledChats: string[];
    highlightedProductId?: string;
    langCode: string;
    lastGeneratedAt?: number;
    storyboardSteps?: StoryboardStep[];
    currentStepIndex?: number;
    productIds?: string[];
    emptyRoomSince?: number; // 30s grace period tracker
    productNamesMap?: Record<string, string>; // Map of product ID -> product name
}

export class LiveSalesServiceV3 {
    private activeFSMLoops = new Map<string, NodeJS.Timeout>();
    private sessionContexts = new Map<string, FSMStateContext>();

    /**
     * Start the 24/7 autonomous FSM engine loop for a live session.
     */
    public startFSM(sessionId: string, influencerId: string, initialProductIds: string[], language?: string) {
        if (this.activeFSMLoops.has(sessionId)) {
            Logger.warn(`FSM loop already active for session ${sessionId}`, 'LiveSalesServiceV3');
            return;
        }

        Logger.info(`🚀 Launching Autonomous FSM Loop for Session: ${sessionId}`, 'LiveSalesServiceV3');

        // Setup initial mock/actual context - start in GREETING state to greet audience immediately
        const initialContext: FSMStateContext = {
            sessionId,
            currentState: 'GREETING',
            viewers: 10,
            remainingStock: 50,
            activeTimerMinutes: 10,
            unhandledChats: [],
            highlightedProductId: initialProductIds[0],
            langCode: language || '',
            storyboardSteps: [],
            currentStepIndex: 0,
            productIds: initialProductIds,
            productNamesMap: {}
        };
        this.sessionContexts.set(sessionId, initialContext);

        // Fetch product names for caching to clean up IDs in dialogue text later
        Promise.resolve().then(async () => {
            try {
                if (initialProductIds.length > 0) {
                    const products = await Product.find({ _id: { $in: initialProductIds.map(id => new Types.ObjectId(id)) } });
                    for (const p of products) {
                        initialContext.productNamesMap![p._id.toString()] = p.name;
                    }
                    Logger.info(`Cached product names for FSM dialogue cleanup: ${JSON.stringify(initialContext.productNamesMap)}`, 'LiveSalesServiceV3');
                }
            } catch (err: any) {
                Logger.error(`Failed to populate productNamesMap: ${err.message}`, 'LiveSalesServiceV3');
            }
        });

        // Trigger the initial tick immediately in the background to bypass startup delay
        Promise.resolve().then(async () => {
            try {
                await this.processFSMTick(sessionId, influencerId);
            } catch (err: any) {
                Logger.error(`Initial FSM Tick error for session ${sessionId}: ${err.message}`, 'LiveSalesServiceV3');
            }
        });

        const loop = setInterval(async () => {
            try {
                // Check if socket room has active connections
                const activeSocketsCount = await socketServer.getRoomSocketCount(sessionId);
                const ctx = this.sessionContexts.get(sessionId);
                if (ctx) {
                    if (activeSocketsCount === 0) {
                        if (!ctx.emptyRoomSince) {
                            ctx.emptyRoomSince = Date.now();
                            Logger.info(`⏳ Session ${sessionId} has 0 WS connections. Starting 60s grace period before auto-stop.`, 'LiveSalesServiceV3');
                        } else if (Date.now() - ctx.emptyRoomSince > 60000) { // 60 seconds grace period
                            Logger.info(`💀 Room ${sessionId} has had 0 WS connections for over 60s without reconnect. Auto-stopping FSM and live stream...`, 'LiveSalesServiceV3');
                            this.stopFSM(sessionId);
                            import('../streaming/StreamingService.js').then(({ streamingService }) => {
                                streamingService.stopRestream(sessionId).catch(e => {
                                    Logger.warn(`Error stopping restream for ${sessionId}: ${e}`);
                                });
                            });
                            return;
                        }
                        return; // Skip FSM tick while empty
                    } else {
                        if (ctx.emptyRoomSince) {
                            Logger.info(`✨ WS client reconnected to room ${sessionId}. Resetting empty grace period.`, 'LiveSalesServiceV3');
                            delete ctx.emptyRoomSince;
                        }
                    }
                }

                await this.processFSMTick(sessionId, influencerId);
            } catch (err: any) {
                Logger.error(`FSM Tick error for session ${sessionId}: ${err.message}`, 'LiveSalesServiceV3');
            }
        }, 8000); // 8-second evaluation interval

        this.activeFSMLoops.set(sessionId, loop);
    }

    /**
     * Terminate the active FSM loop for a session.
     */
    public stopFSM(sessionId: string) {
        if (this.activeFSMLoops.has(sessionId)) {
            clearInterval(this.activeFSMLoops.get(sessionId)!);
            this.activeFSMLoops.delete(sessionId);
            this.sessionContexts.delete(sessionId);
            Logger.info(`🛑 Stopped FSM loop for Session: ${sessionId}`, 'LiveSalesServiceV3');
        }
    }

    /**
     * Feed incoming multi-platform chat/comment directly into the active session's FSM queue.
     */
    public feedChatMessage(sessionId: string, username: string, text: string) {
        const ctx = this.sessionContexts.get(sessionId);
        if (ctx) {
            ctx.unhandledChats.push(`[@${username}]: ${text}`);
            if (ctx.unhandledChats.length > 5) ctx.unhandledChats.shift(); // Keep queue small
            Logger.info(`Ingested message to session ${sessionId}: "${text}"`, 'LiveSalesServiceV3');
        }
    }

    /**
     * Delegate storyboard generation to liveSalesService.generateMultiPersonScript
     * to re-use multi_person_script.md template, chunking logic and product/influencer DB lookup.
     * Need change field `state` to `type` and return.
     */
    private async generateStoryboard(
        sessionId: string,
        ctx: FSMStateContext,
        influencer: any,
        product: any | null
    ): Promise<StoryboardStep[]> {
        const influencerName = influencer.identity?.name || 'Professional Host';
        const productId = product?._id?.toString() || ctx.highlightedProductId || '';
        const productName = product?.name || 'this product';

        Logger.info(`Delegating storyboard to generateMultiPersonScript: ${productName}`, 'LiveSalesServiceV3');

        let steps: StoryboardStep[] = [];

        try {
            // assignmentMap: { [productId]: influencerEntityId } — same as orchestrate route
            const assignmentMap: Record<string, string> = {};
            if (productId && influencer.entityId) {
                assignmentMap[productId] = influencer.entityId;
            }

            const rawSteps: any[] = await liveSalesService.generateMultiPersonScript(
                assignmentMap,
                ctx.langCode
            );

            if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
                throw new Error('generateMultiPersonScript is empty');
            }

            // Map `state` to `type` field same as orchestrate:
            //   wave     → GREETING
            //   checkout → CLOSING
            //   *        → PITCHING
            steps = rawSteps.map((step): StoryboardStep => {
                const resolvedProductId = step.productId || 
                    (/^[0-9a-fA-F]{24}$/.test(step.type || '') ? step.type : productId);

                return {
                    ...step,
                    productId: resolvedProductId,
                    state: step.state ||
                        (step.type === 'wave'     ? 'GREETING' :
                         step.type === 'checkout' ? 'CLOSING'  : 'PITCHING')
                };
            });

        } catch (error: any) {
            Logger.error(`generateMultiPersonScript failed: ${error.message}. Using fallback.`, 'LiveSalesServiceV3');
            const isVi = ctx.langCode.startsWith('vi');
            steps = [
                { state: 'GREETING',  title: 'Chào mừng!',    text: isVi ? `Chào mừng mọi người! Hôm nay mình giới thiệu ${productName} cực kỳ HOT nhé!`             : `Welcome everyone! Today I'm showcasing the incredible ${productName}!`,           type: 'wave',                 gesture: 'wave',     speaker: influencerName, productId },
                { state: 'PITCHING',  title: 'Thông số đỉnh', text: isVi ? `${productName} có thông số kỹ thuật vô cùng ấn tượng và thiết kế thông minh vượt trội.`    : `${productName} boasts outstanding specs and a premium smart design.`,             type: productId || 'product', gesture: 'excited',  speaker: influencerName, productId },
                { state: 'PITCHING',  title: 'Lợi ích thực',  text: isVi ? `Sở hữu ${productName} giúp bạn tiện lợi, an tâm và nâng tầm chất lượng cuộc sống.`       : `Owning ${productName} brings maximum convenience and elevates your lifestyle.`,     type: 'speaking',             gesture: 'happy',    speaker: influencerName, productId },
                { state: 'PITCHING',  title: 'Giải đáp thắc', text: isVi ? `Bạn có câu hỏi không? Cứ comment xuống dưới để mình giải đáp ngay nhé!`                : `Got questions? Drop them in the comments and I'll answer right away!`,              type: 'speaking',             gesture: 'speaking', speaker: influencerName, productId },
                { state: 'CLOSING',   title: 'Chốt đơn ngay', text: isVi ? `Số lượng có hạn! Giá ưu đãi sắp hết. Chốt đơn ngay bây giờ đi mọi người!`              : `Stock is extremely limited! The special price ends soon — grab yours now!`,         type: 'checkout',             gesture: 'victory',  speaker: influencerName, productId }
            ];
        }

        // Filtering out generic product step without product ID to avoid replaying intro
        steps = steps.filter(step => {
            const isProductType = step.type === 'product';
            const hasValidProductId = step.productId && /^[0-9a-fA-F]{24}$/.test(step.productId);
            if (isProductType && !hasValidProductId) {
                Logger.info(`Filtering out generic product step without product ID to avoid replaying intro: ${step.title || 'untitled'}`, 'LiveSalesServiceV3');
                return false;
            }
            return true;
        });

        // Apply storyboard filtering for multi-product rotation to avoid repeated intros/closings
        if (ctx.productIds && ctx.productIds.length > 1 && productId) {
            const isFirstProduct = ctx.productIds.indexOf(productId) === 0;
            const isLastProduct = ctx.productIds.indexOf(productId) === ctx.productIds.length - 1;

            if (!isFirstProduct) {
                // Filter out intro/greeting steps
                steps = steps.filter(step => step.state !== 'GREETING' && step.type !== 'wave' && step.gesture !== 'wave');
            }
            if (!isLastProduct) {
                // Filter out closing/checkout steps
                steps = steps.filter(step => step.state !== 'CLOSING' && step.type !== 'checkout' && step.gesture !== 'checkout');
            }
        }

        return steps;
    }


    /**
     * Process a single FSM state transition cycle powered by Gemini ADK.
     */
    private async processFSMTick(sessionId: string, influencerId: string) {
        const ctx = this.sessionContexts.get(sessionId);
        if (!ctx) return;

        // Anti-overcalling/Rate-limit prevention:
        if (ctx.lastGeneratedAt) {
            const msSinceLastGen = Date.now() - ctx.lastGeneratedAt;
            // Strict minimum cooldown between FSM ticks/generations
            if (msSinceLastGen < 12000) {
                return;
            }
        }

        // Fetch latest session metrics from db if available
        const session = await StreamSessionModel.findOne({ sessionId });
        if (session && session.status !== 'live') {
            Logger.info(`Stream session ${sessionId} is no longer live. Halting FSM.`, 'LiveSalesServiceV3');
            this.stopFSM(sessionId);
            return;
        }

        const influencer = await Influencer.findOne({ entityId: influencerId });
        if (!influencer) return;

        // Auto-detect and sync language preference from influencer voice config if not already set
        ctx.langCode = ctx.langCode || influencer.meta?.voiceConfig?.language || 'en';

        // Extract active product details
        let productDetails = 'No product spotlighted.';
        let ragGroundingContext = '';

        if (ctx.highlightedProductId) {
            let product = null;
            if (Types.ObjectId.isValid(ctx.highlightedProductId)) {
                product = await Product.findById(ctx.highlightedProductId);
            } else {
                // Self-healing fallback: query by product name
                product = await Product.findOne({ name: ctx.highlightedProductId });
                if (product) {
                    const originalId = ctx.highlightedProductId;
                    ctx.highlightedProductId = product._id.toString();
                    Logger.info(`Self-healed active product name to ObjectId: "${originalId}" -> ${ctx.highlightedProductId}`, 'LiveSalesServiceV3');
                }
            }

            if (product) {
                productDetails = `ID: ${product._id.toString()}, Name: ${product.name}, Description: ${product.description}, Price: ${product.price} ${product.currency || 'USD'}, Remaining Stock: ${ctx.remainingStock}`;
                
                // If there are unhandled comments, query RAG to ground the generation
                if (ctx.unhandledChats.length > 0) {
                    const concatenatedChats = ctx.unhandledChats.join('\n');
                    try {
                        ragGroundingContext = await this.queryProductRAG(ctx.highlightedProductId, concatenatedChats);
                        Logger.info(`Retrieved Pre-decision RAG Grounding Context: "${ragGroundingContext}"`, 'LiveSalesServiceV3');
                    } catch (err: any) {
                        Logger.error(`Pre-decision RAG Query failed: ${err.message}`, 'LiveSalesServiceV3');
                    }
                }
            } else {
                productDetails = `Product ID/Name "${ctx.highlightedProductId}" not found in database.`;
            }
        }

        // --- CASE 1: REACTIVE Q_AND_A TURN ---
        // If there are unhandled viewer chats, we immediately perform an ad-hoc Q_AND_A generation
        // to answer the viewer's questions. This keeps the livestream highly reactive!
        if (ctx.unhandledChats.length > 0) {
            Logger.info(`Viewer chat detected. Intercepting storyboard for reactive Q&A turn...`, 'LiveSalesServiceV3');
            ctx.lastGeneratedAt = Date.now(); // Set rate-limit lock

            const systemPrompt = `You are a Live Selling Assistant answering audience questions.
Answer the viewer's questions accurately using the provided ground-truth product context.
Influencer Role: ${influencer.identity?.name || 'Professional Host'}
Language: ${ctx.langCode === 'vi' ? 'Vietnamese' : 'English'}

### Ground-truth Product Knowledge:
${ragGroundingContext ? ragGroundingContext : productDetails}

### Audience Questions:
${JSON.stringify(ctx.unhandledChats)}

Respond ONLY with a JSON object in this exact format:
{
  "nextState": "Q_AND_A",
  "reason": "Explain how you answered their questions",
  "scriptPitch": "Your spoken reply in ${ctx.langCode === 'vi' ? 'Vietnamese' : 'English'}. Be friendly, helpful, address them warmly, and naturally pivot back to showcasing the product."
}
`;
            try {
                const decision = await generateJSON<{
                    nextState: 'Q_AND_A';
                    reason: string;
                    scriptPitch: string;
                }>(systemPrompt, undefined);

                Logger.info(`Reactive Q&A Decision: ${decision.reason}`, 'LiveSalesServiceV3');

                if (decision.scriptPitch) {
                    decision.scriptPitch = this.cleanProductIdsInText(decision.scriptPitch, ctx);
                }

                // Clear chats since they are now handled
                ctx.unhandledChats = [];

                // Emit Q&A response — using orchestrate-compatible format
                const qaPayload = {
                    sessionId,
                    state: 'Q_AND_A',
                    reason: decision.reason,
                    // Orchestrate-compatible fields
                    text: decision.scriptPitch,
                    type: 'speaking',
                    gesture: 'speaking',
                    speaker: influencer.identity?.name || 'Host',
                    productId: ctx.highlightedProductId,
                    // Legacy fallback
                    scriptText: decision.scriptPitch,
                    highlightProductId: ctx.highlightedProductId,
                    triggerDiscount: false
                };
                socketServer.emitToRoom(sessionId, 'studio:state_change', qaPayload);
                socketServer.emitToAll('studio:state_change', qaPayload);
                return;
            } catch (error: any) {
                Logger.error(`Reactive Q&A Generation failed: ${error.message}`, 'LiveSalesServiceV3');
                // If it fails, fall through to continue storyboard
            }
        }

        // --- CASE 2: MAIN STORYBOARD FLOW ---
        // Generate a fresh storyboard if empty or finished
        if (!ctx.storyboardSteps || ctx.storyboardSteps.length === 0 || ctx.currentStepIndex === undefined || ctx.currentStepIndex >= ctx.storyboardSteps.length) {
            ctx.lastGeneratedAt = Date.now();
            let productObj = null;
            if (ctx.highlightedProductId) {
                if (Types.ObjectId.isValid(ctx.highlightedProductId)) {
                    productObj = await Product.findById(ctx.highlightedProductId);
                } else {
                    productObj = await Product.findOne({ name: ctx.highlightedProductId });
                }
            }
            ctx.storyboardSteps = await this.generateStoryboard(sessionId, ctx, influencer, productObj);
            
            // Clean product IDs in all storyboard steps' texts
            for (const s of ctx.storyboardSteps) {
                if (s.text) {
                    s.text = this.cleanProductIdsInText(s.text, ctx);
                }
            }

            ctx.currentStepIndex = 0;
        }

        // Next script from the storyboard
        const step = ctx.storyboardSteps[ctx.currentStepIndex];
        ctx.currentState = step.state;

        Logger.info(`▶ Step ${ctx.currentStepIndex + 1}/${ctx.storyboardSteps.length} [${step.state}] [${step.type}] "${step.text?.substring(0, 50)}..."`, 'LiveSalesServiceV3');

        // Broadcast format consistant with orchestrate:
        // client received the script format same as activeScript
        const stepPayload = {
            sessionId,
            state: step.state,
            // --- Orchestrate-compatible fields ---
            text: step.text,
            type: step.type,
            gesture: step.gesture,
            speaker: step.speaker,
            productId: step.productId || ctx.highlightedProductId,
            title: step.title,
            // --- Legacy fallback (keep this to prevent break old codes) ---
            scriptText: step.text,
            highlightProductId: step.productId || ctx.highlightedProductId,
            triggerDiscount: step.state === 'CLOSING'
        };
        socketServer.emitToRoom(sessionId, 'studio:state_change', stepPayload);
        socketServer.emitToAll('studio:state_change', stepPayload);

        ctx.currentStepIndex++;

        // Storyboard finished → next product
        if (ctx.currentStepIndex >= ctx.storyboardSteps.length) {
            Logger.info(`✅ Storyboard finished for product ${ctx.highlightedProductId}. Rotating...`, 'LiveSalesServiceV3');
            if (ctx.productIds && ctx.productIds.length > 1) {
                const currentIndex = ctx.productIds.indexOf(ctx.highlightedProductId || '');
                const nextIndex = (currentIndex + 1) % ctx.productIds.length;
                ctx.highlightedProductId = ctx.productIds[nextIndex];
                Logger.info(`🔄 Next product: ${ctx.highlightedProductId}`, 'LiveSalesServiceV3');
            }
            ctx.storyboardSteps = [];
            ctx.currentStepIndex = 0;
        }
    }

    /**
     * Query Product Knowledge Base using RAG (Vector Index lookup simulation).
     */
    public async queryProductRAG(productId: string, queryText: string): Promise<string> {
        let product = null;
        if (Types.ObjectId.isValid(productId)) {
            product = await Product.findById(productId);
        } else {
            product = await Product.findOne({ name: productId });
        }
        if (!product) return 'No product context found.';

        Logger.info(`[RAG] Querying vector index for product specs: ${product.name} (Query: "${queryText}")`, 'LiveSalesServiceV3');

        // Extract product metadata to construct the RAG response
        const specs = product.features || [];
        const description = product.description || '';
        const priceText = `${product.price} ${product.currency || 'USD'}`;

        const prompt = `You are a product specialist. Answer this question/comment regarding the product: "${queryText}".
You must base your answer exclusively on this product knowledge sheet:
Product Name: ${product.name}
Description: ${description}
Technical Specs & Features: ${specs.length > 0 ? specs.join(', ') : 'Premium quality build and materials'}
Price: ${priceText}

Return a concise, friendly, and factual technical answer (1-2 sentences) in the language of the query. Do not make up facts outside the provided sheet.`;

        try {
            return await generateText(prompt, undefined);
        } catch (e: any) {
            return `${product.name} features premium build quality, including ${specs.join(', ') || 'expert engineering'} and is priced at ${priceText}.`;
        }
    }

    /**
     * Establish localized virtual personal shopper sessions (1-on-1 WebRTC) for external sites.
     */
    public async initShopperSession(sessionId: string, productId: string, detectedLang: string) {
        Logger.info(`Creating 1-on-1 virtual assistant session: ${sessionId} for Product: ${productId} [Language: ${detectedLang}]`, 'LiveSalesServiceV3');

        const initialContext: FSMStateContext = {
            sessionId,
            currentState: 'GREETING',
            viewers: 1,
            remainingStock: 5, // High scarcity
            activeTimerMinutes: 5,
            unhandledChats: [],
            highlightedProductId: productId,
            langCode: detectedLang.startsWith('vi') ? 'vi' : 'en'
        };
        this.sessionContexts.set(sessionId, initialContext);

        // Instantly generate localized greeting pitch via Gemini Multi-Modal Live config
        let product = null;
        if (Types.ObjectId.isValid(productId)) {
            product = await Product.findById(productId);
        } else {
            product = await Product.findOne({ name: productId });
            if (product) {
                initialContext.highlightedProductId = product._id.toString();
            }
        }
        const productName = product ? product.name : 'this item';
        
        const greetingPrompt = `You are a dynamic AI Personal Shopping assistant.
A customer just visited the storefront landing page for ${productName} in ${initialContext.langCode === 'vi' ? 'Vietnamese' : 'English'}.
Generate a highly engaging, localized first greeting that welcomes them, introduces the product with Cialdini urgency, and invites them to chat.`;

        try {
            const pitch = await generateText(greetingPrompt, undefined);
            return {
                sessionId,
                state: 'GREETING',
                greetingPitch: pitch,
                productName,
                currency: product?.currency || 'USD'
            };
        } catch (e) {
            return {
                sessionId,
                state: 'GREETING',
                greetingPitch: detectedLang.startsWith('vi') ? `Xin chào! Mình thấy bạn đang xem ${productName}. Deal cực hot chỉ có duy nhất trong phiên trò chuyện này nhé!` : `Hello! I noticed you are checking out ${productName}. I have an exclusive deal right here for you!`
            };
        }
    }

    /**
     * Clean and replace any raw database ObjectIds in the text with product names
     */
    private cleanProductIdsInText(text: string, ctx: FSMStateContext): string {
        if (!text || !ctx.productNamesMap) return text;
        let cleanedText = text;
        const objectIdRegex = /[0-9a-fA-F]{24}/g;
        const matches = text.match(objectIdRegex);
        if (matches) {
            const uniqueMatches = Array.from(new Set(matches));
            for (const match of uniqueMatches) {
                const name = ctx.productNamesMap[match];
                if (name) {
                    cleanedText = cleanedText.split(match).join(name);
                }
            }
        }
        return cleanedText;
    }
}

export const liveSalesServiceV3 = new LiveSalesServiceV3();
