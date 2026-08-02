import { EventEmitter } from 'events';
import { Modality, Behavior, FunctionResponseScheduling } from '@google/genai';
import { GeminiLiveSession } from '~/models/GeminiLiveSession.js';
import { InfluencerService } from '~/services/streaming/InfluencerService.js';
import { Influencer } from '~/models/Influencer.js';
import { Product, IProduct } from '~/models/Product.js';
import { aiAgentBus } from '~/services/ai/AIAgentBus.js';
import { questService } from '~/services/ai/QuestService.js';
import { AVATAR_TOOLS } from '~/services/ai/AvatarTools.js';
import { Logger } from '~/utils/Logger.js';
import { AIServiceManager } from '~/utils/ai/AIServiceManager.js';
import { GeminiClient } from '~/integrations/ai/GeminiClient.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { configService, EnvConfig } from '~/utils/ConfigService.js';
import { AIAccountProvider } from '~/models/AIAccount.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
interface LiveSessionConfig {
    userId: string;
    archiveId: string;
    projectId?: string; // Grouping sessions for swarming
    voiceName: string;
    systemInstruction?: string;
    isMaster?: boolean;
    liveContext?: string;
    modelType?: string;
    resumptionHandle?: string;
    language?: string;
    productIds?: string;
}

interface AudioChunk {
    data: string; // base64 encoded PCM
    mimeType: string;
}

interface FunctionDeclaration {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    },
    // behavior?: Behavior//not support in Vertex AI
}

interface SessionData {
    session: any;
    userId: string;
    archiveId: string;
    apiKey: string;
    modelName: string;
    projectId?: string;
    audioQueue: any[];
    swarmListener?: (msg: any) => void;
    isDisconnected?: boolean;
    disconnectTimer?: NodeJS.Timeout;
    startTime?: number;
    resumptionHandle?: string;
    voiceName?: string;
    modelType?: string;
    isMaster?: boolean;
    liveContext?: string;
    language?: string;
    characterName?: string;

    // Telemetry and Deduplication Fields
    lastAudioHashes?: string[];
    lastTextResponses?: string[];
    lastSentTexts?: string[];
    audioChunksReceived?: number;
    audioChunksEmitted?: number;
    textResponsesReceived?: number;
    reconnectCount?: number;
}

const SUPPORTED_LIVE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

// AVATAR_TOOLS definition moved to dedicated AvatarTools.ts file for better modularity and code simple structure

export class GeminiLiveService extends EventEmitter {
    private activeSessions: Map<string, SessionData> = new Map();
    private notFoundSessions: Set<string> = new Set();

    constructor() {
        super();
    }

    async getAvailableVoices() {
        try {
            const client = await this.getGeminiClient();
            const voices = await client.listVoices();
            const geminiVoices = voices.map((voice: any) => voice.name);
            return [...SUPPORTED_LIVE_VOICES, ...geminiVoices];
        } catch (e) {
            return SUPPORTED_LIVE_VOICES;
        }
    }

    private async getGeminiClient(): Promise<GeminiClient> {
        let client = await AIServiceManager.getInstance().getProvider(AIAccountProvider.GOOGLE) as GeminiClient;
        if(!client){
            client = await AIServiceManager.getInstance().getProvider(AIAccountProvider.GOOGLE_VERTEX) as GeminiClient;
        }
        return client;
    }

    /**
     * Create a new Live API session
     */
    async createSession(config: LiveSessionConfig): Promise<string> {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const liveDefault = configService?.aiDefaultModels?.voice;
        const model = liveDefault?.modelId || EnvConfig.geminiModelVoice;
        // Normalize voice for Gemini Live
        let normalizedVoice = config.voiceName || 'Puck';
        const geminiVoices = await this.getAvailableVoices();
        if (!geminiVoices.includes(normalizedVoice)) {
            Logger.warn(`[GeminiLive] Unsupported voice '${normalizedVoice}', falling back to 'Puck'`);
            normalizedVoice = 'Puck';
        }

        let systemInstruction = config.systemInstruction || '';

        // Context-aware Prompt Loading
        if (!systemInstruction) {
            const context = config.liveContext || (config.isMaster ? 'rpg' : 'sales');
            systemInstruction = await this.loadPrompt(context);
        }

        //  Aidol Specific Protocols
        if (config.modelType === 'aidol') {
            const aidolProtocols = await this.loadPrompt('aidol_protocols', true);
            const aidolDialogues = await this.loadPrompt('aidol_dialogues', true);
            if (aidolProtocols) {
                systemInstruction += `\n\n[AIDOL VISUAL PROTOCOL]\n${aidolProtocols}`;
            }
            if (aidolDialogues) {
                systemInstruction += `\n\n[AIDOL DIALOGUE SAMPLES]\n${aidolDialogues}`;
            }
        }

        const sessionConfig = {
            responseModalities: [Modality.AUDIO], // Native speech
            systemInstruction: systemInstruction,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: normalizedVoice
                    }
                }
            },
            tools: [
                { functionDeclarations: AVATAR_TOOLS }
            ],
            // Enable Context Window Compression for unlimited sessions
            contextWindowCompression: {
                trigger_tokens: 2000,
                sliding_window: {
                    overlap_tokens: 500
                }
            },
            // Enable Session Resumption
            sessionResumption: config.resumptionHandle ? { handle: config.resumptionHandle } : undefined
        };

        // Extra Director/Master protocols if still master but using a specific context
        if (config.isMaster && !sessionConfig.systemInstruction.includes('[RPG MASTER ROLE]')) {
            const rpgFragment = await this.loadPrompt('rpg_master', true);
            sessionConfig.systemInstruction += `\n\n${rpgFragment}`;
        } else if (!config.isMaster) {
            const perfFragment = await this.loadPrompt('performance', true);
            sessionConfig.systemInstruction += `\n\n${perfFragment}`;
        }

        // Phase 9: Inject Product Knowledge Base
        if (config.productIds) {
            const ids = config.productIds.split(',').map(id => id.trim());
            const products = await Product.find({ _id: { $in: ids } });
            
            let productKnowledgeContext = "\n\n[PRODUCT KNOWLEDGE BASE]";
            products.forEach((p: IProduct) => {
                if (p.knowledgeBase) {
                    productKnowledgeContext += `\n--- PRODUCT: ${p.name} ---\n${p.knowledgeBase}\n`;
                }
            });

            if (products.length > 0) {
                sessionConfig.systemInstruction += productKnowledgeContext;
                Logger.info(`[GeminiLive] Injected knowledge for ${products.length} products into session ${sessionId}`);
            }
        }

        // Fetch character identity from Neural Archive
        let characterIdentity = '';
        if (config.userId && config.archiveId) {
            try {
                const archive = await Influencer.findOne({ userId: config.userId, entityId: config.archiveId });
                if (archive && archive.identity) {
                    const language = archive?.meta?.voiceConfig?.language || 'en-US';
                    const identityTemplate = await this.loadPrompt('identity', true);
                    characterIdentity = identityTemplate
                        .replace(/{{name}}/g, archive.identity.name)
                        .replace(/{{description}}/g, archive.identity.description)
                        .replace(/{{traits}}/g, archive.identity.traits.join(', '))
                        .replace(/{{backstory}}/g, archive.identity.backstory || 'No backstory provided.')
                        .replace(/{{language}}/g, language);
                    
                    Logger.info(`[GeminiLive] Character Identity Loaded and Injected: ${archive.identity.name} for session ${sessionId}`);
                } else {
                    Logger.warn(`[GeminiLive] No Influencer found for archiveId: ${config.archiveId}. Falling back to default identity.`);
                }

                const memories = await InfluencerService.getRelevantMemories(config.userId, config.archiveId, ['stream', 'session', 'host', 'fan']);
                if (memories.length > 0) {
                    sessionConfig.systemInstruction += `\n\nRELEVANT MEMORIES FROM PREVIOUS SESSIONS:\n${memories.map(m => `- ${m}`).join('\n')}`;
                }
            } catch (err: any) {
                Logger.error('[GeminiLive] Failed to fetch identity/memories:', 'GeminiLiveService', err);
            }
        }
        const archive = await Influencer.findOne({ userId: config.userId, entityId: config.archiveId });
        // Phase 96: Initialize session data placeholder to avoid race conditions in onopen
        const sessionData: SessionData = {
            session: null, // Will be filled after connection
            userId: config.userId,
            archiveId: config.archiveId,
            apiKey: '',
            modelName: model,
            projectId: config.projectId,
            audioQueue: [],
            startTime: Date.now(),
            voiceName: normalizedVoice,
            modelType: config.modelType,
            isMaster: config.isMaster,
            liveContext: config.liveContext,
            language: config.language,
            characterName: archive?.identity?.name || ''
        };
        this.activeSessions.set(sessionId, sessionData);

        // Prepend identity to system instruction
        if (characterIdentity) {
            sessionConfig.systemInstruction = `${characterIdentity}\n\n${sessionConfig.systemInstruction}`;
        }

        try {
            const client = await this.getGeminiClient();
            // const client = GeminiClient.getInstance();
            const { session, apiKey } = await client.connectLive({
                model: model,
                systemInstruction: sessionConfig.systemInstruction,
                generationConfig: {
                    responseModalities: sessionConfig.responseModalities,
                    speechConfig: sessionConfig.speechConfig
                },
                tools: sessionConfig.tools,
                callbacks: {
                    onopen: async () => {
                        Logger.info(`[GeminiLive] Session ${sessionId} connected with model: ${model}`);
                        
                        // Phase 96: Wait for the main thread to set the REAL session object
                        // We avoid passing 'session' in onopen to prevent Temporal Dead Zone errors
                        let attempts = 0;
                        while ((!sessionData || !sessionData.session) && attempts < 15) {
                            await new Promise(resolve => setTimeout(resolve, 150));
                            attempts++;
                        }

                        if (!sessionData || !sessionData.session) {
                             Logger.warn(`[GeminiLive] [${sessionId}] onopen: Session object still missing after wait, welcome prompt may be skipped.`);
                        }

                        // Phase 95: Proactive Contextual Trigger
                        // const currentContext = config.liveContext || (config.isMaster ? 'rpg' : 'sales');
                        // const welcomeDirective = await this.loadPrompt(`welcome_${currentContext}`, true);
                        
                        // if (welcomeDirective) {
                        //     Logger.info(`[GeminiLive] [${sessionId}] Sending welcome directive for context: ${currentContext}`);
                        //     await this.sendText(sessionId, welcomeDirective);
                        // } else {
                        //     Logger.info(`[GeminiLive] [${sessionId}] No welcome directive found, sending default greeting.`);
                        //     await this.sendText(sessionId, "The session has started! Please greet your audience and introduce yourself.");
                        // }
                        
                        this.emit('session:connected', { sessionId, archiveId: config.archiveId });
                    },
                    onmessage: (message: any) => {
                        this.handleIncomingMessage(sessionId, message);
                    },
                    onerror: (error: any) => {
                        Logger.error(`[GeminiLive] [${sessionId}] Session error:`, 'GeminiLiveService', error);
                        if (error && error.message && error.message.includes('429')) {
                             Logger.error(`[GeminiLive] [${sessionId}] QUOTA EXHAUSTED: Gemini has stopped generating audio for this session.`, 'GeminiLiveService');
                        }
                        this.emit('session:error', { sessionId, error: error.message });
                    },
                    onclose: (event: any) => {
                        Logger.info(`[GeminiLive] Session ${sessionId} closed:`, event.reason);
                        this.handleSessionClose(sessionId, event.reason);
                    }
                }
            });

            // Update session data with real session object
            sessionData.session = session;
            sessionData.apiKey = apiKey || '';

            // Create database record
            await GeminiLiveSession.create({
                sessionId,
                userId: config.userId,
                archiveId: config.archiveId,
                startTime: new Date(),
                metadata: {
                    voiceName: config.voiceName,
                    modelName: model,
                    systemInstruction: sessionConfig.systemInstruction,
                    resumptionHandle: config.resumptionHandle
                }
            });

            // Listen for Swarm Messages
            if (config.projectId) {
                const swarmListener = (msg: any) => {
                    // Don't relay messages from self
                    if (msg.fromAgent === config.archiveId) return;

                    const relay = `[SWARM MESSAGE from ${msg.fromAgent}${msg.type === 'broadcast' ? ' (broadcast)' : ''}]: ${msg.payload.message || JSON.stringify(msg.payload)}`;
                    Logger.info(`[GeminiLive] [${sessionId}] Relaying swarm message: ${relay}`);
                    
                    // Send to Gemini as context
                    this.sendText(sessionId, relay);

                    // Also notify the frontend client with structured data
                    this.emit('swarm:message', {
                        sessionId,
                        projectId: config.projectId,
                        ...msg
                    });
                };

                aiAgentBus.on(`message:${config.projectId}`, swarmListener);
                // Direct message listener
                aiAgentBus.on(`message:${config.projectId}:${config.archiveId}`, swarmListener);

                sessionData.swarmListener = swarmListener;
            }

            return sessionId;
        } catch (error: any) {
            Logger.error('[GeminiLive] Failed to create session:', 'GeminiLiveService', error);
            throw new Error(`Failed to create Live API session: ${error.message}`);
        }
    }

    /**
     * Send audio input to the session
     */
    sendAudio(sessionId: string, audioChunk: AudioChunk): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            if(!this.notFoundSessions.has(sessionId)){
                this.notFoundSessions.add(sessionId);
                Logger.warn(`[GeminiLive] Session ${sessionId} not found`);
            }
            return;
        }

        try {
            console.log("send audio!!!");
            // sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({
                audio: {
                    data: audioChunk.data,
                    mimeType: audioChunk.mimeType
                }
            });
            // sessionData.session.sendRealtimeInput({ activityEnd: {} })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send audio for session ${sessionId}:`, 'GeminiLiveService', error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Send video/image frame input to the session
     */
    sendVideo(sessionId: string, frameData: { data: string, mimeType: string }): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            if(!this.notFoundSessions.has(sessionId)){
                this.notFoundSessions.add(sessionId);
                Logger.warn(`[GeminiLive] Session ${sessionId} not found for video`);
            }
            return;
        }

        try {
            // sessionData.session.sendRealtimeInput({
            //     mediaChunks: [{
            //         data: frameData.data,
            //         mimeType: frameData.mimeType || 'image/jpeg'
            //     }]
            // });
            // sessionData.session.sendRealtimeInput({ activityStart: {} })
            console.log("send video!!!");
            sessionData.session.sendRealtimeInput({
                video: {
                    data: frameData.data,
                    mimeType: frameData.mimeType || 'image/jpeg'
                }
            });
            // sessionData.session.sendRealtimeInput({ activityEnd: {} })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send video for session ${sessionId}:`, 'GeminiLiveService', error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Send tool response back to Gemini
     */
    sendToolResponse(sessionId: string, functionResponses: any[]): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not found`, 'GeminiLiveService');
            return;
        }

        try {
            console.log("send tool response", functionResponses.map(resp => resp.name));
            // Ensure payload is correctly formatted for Google GenAI Bidi session
            // sessionData.session.sendRealtimeInput({ activityStart: {} })
            // sessionData.session.sendRealtimeInput({
            //     toolResponse: {
            //         functionResponses: functionResponses.map(resp => ({
            //             name: resp.name,
            //             id: resp.id,
            //             // Fix: resp.response is already the result object from the client composite
            //             response: {
            //                 result: "ok",
            //                 scheduling: FunctionResponseScheduling.SILENT  // Can also be WHEN_IDLE or SILENT
            //             }
            //         }))
            //     }
            // });
            // ref: https://ai.google.dev/gemini-api/docs/live-bidi#handle-tool-calls
            // https://ai.google.dev/gemini-api/docs/live-api/tools#async-function-calling
            sessionData.session.sendToolResponse({functionResponses: functionResponses.map(resp => ({
                name: resp.name,
                id: resp.id,
                response: {
                    result: "ok",
                    scheduling: FunctionResponseScheduling.WHEN_IDLE  // Can also be INTERRUPT, WHEN_IDLE or SILENT
                }
            }))});
            // sessionData.session.sendRealtimeInput({ activityEnd: {} })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send tool response for session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Send text input to the session
     * Phase 107: Added TTS fallback for precise script performance
     */
    async sendText(sessionId: string, text: string, options: { useTTS?: boolean } = {}): Promise<void> {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not found for text input`, 'GeminiLiveService');
            return;
        }

        // Check for duplicate outgoing text to prevent duplicate speech
        if (!sessionData.lastSentTexts) {
            sessionData.lastSentTexts = [];
        }
        const trimmedText = text.trim();
        if (sessionData.lastSentTexts.includes(trimmedText)) {
            Logger.info(`[GeminiLive] [${sessionId}] Skipping duplicate outgoing text to avoid repetition: "${trimmedText.substring(0, 60)}..."`);
            return;
        }
        sessionData.lastSentTexts.push(trimmedText);
        if (sessionData.lastSentTexts.length > 5) {
            sessionData.lastSentTexts.shift();
        }

        // Detect if we should use TTS for this specific text
        // ONLY use TTS if explicitly requested or contains the EXACT direct performance marker
        const isDirectPerformance = text.includes('[DIRECTIVE: PERFORM THIS SCRIPT NOW DIRECTLY TO THE AUDIENCE]');
        const shouldForceTTS = options.useTTS || isDirectPerformance;

        // if (shouldForceTTS) {
        //     Logger.info(`[GeminiLive] [${sessionId}] Performing script via TTS (Language: ${sessionData.language || 'en-US'})`);
        //     try {
        //         const client = await this.getGeminiClient();
        //         const targetLang = sessionData.language || 'en-US';
                
        //         // Instruct Gemini to speak in the influencer's language
        //         // We wrap the text in a directive that includes the target language
        //         const ttsPrompt = `[MODE: PERFORMANCE]\n[TARGET LANGUAGE: ${targetLang}]\n[INSTRUCTION: Speak the following content naturally in ${targetLang}. If the content is in another language, translate it to ${targetLang} first.]\n\nContent:\n${text}`;

        //         // sessionData.session.sendRealtimeInput({
        //         //     text: ttsPrompt
        //         // });
                
        //         const ttsResult = await client.generateAudio(ttsPrompt, sessionData.voiceName || 'Puck', undefined);
                
        //         if (ttsResult && ttsResult.url) {
        //             await this.emitTTSChunks(sessionId, ttsResult.url);
        //             return;
        //         }
        //     } catch (ttsError: any) {
        //         Logger.error(`[GeminiLive] TTS fallback failed for session ${sessionId}, falling back to Live API:`, 'GeminiLiveService', ttsError);
        //     }
        // }

        if (!sessionData.session) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not ready for Live API text input`, 'GeminiLiveService');
            return;
        }

        // Wrap the turn in a more natural instruction with the character name (Phase 105)
        const namePrefix = sessionData.characterName ? `${sessionData.characterName}, ` : '';
        let processedText = `${namePrefix}${text}`;
        
        // Phase 107: If it's a script/pitch, add a gentle instruction rather than a rigid directive
        // BUT: skip wrapping if it already looks like a structured prompt from the orchestrator
        const isStructured = text.includes('Conversation context:') || text.trim().startsWith('As ');
        
        if (!isStructured && (text.length > 100 || (text.toLowerCase().includes('script') || text.toLowerCase().includes('pitch')))) {
            processedText = `${namePrefix}! Please perform the following script or pitch naturally to your audience now:\n\n${text}`;
        }

        try {
            Logger.info(`[GeminiLive] [${sessionId}] sendText OUTGOING (Live API): "${processedText}"`);
            // sessionData.session.sendRealtimeInput({
            //     clientContent: {
            //         turns: [{
            //             role: 'user',
            //             parts: [{ text: processedText }]
            //         }],
            //         turnComplete: true
            //     }
            // });
            // flush old voice data before sending new text
            sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({ activityEnd: {} })

            sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({
                text: processedText
            });
            sessionData.session.sendRealtimeInput({ activityEnd: {} })
            // sessionData.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: processedText }] }], turnComplete: true })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send text for session ${sessionId}:`, 'GeminiLiveService', error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Helper to chunk a base64 audio string (WAV/PCM) and emit it as audio chunks
     */
    private async emitTTSChunks(sessionId: string, dataUrl: string) {
        // data:audio/wav;base64,...
        const base64Data = dataUrl.split(',')[1];
        if (!base64Data) return;

        let buffer = Buffer.from(base64Data, 'base64');
        
        // If it's a WAV, we should ideally strip the 44-byte header to match the expected PCM chunks
        // but the client might handle WAV headers in individual chunks too if lucky.
        // For consistency with Live API, let's strip the first 44 bytes if it looks like RIFF
        if (buffer.subarray(0, 4).toString() === 'RIFF') {
            buffer = buffer.subarray(44);
        }

        const chunkSize = 4096; // Standard chunk size for streaming
        Logger.info(`[GeminiLive] [${sessionId}] Emitting TTS audio in ${Math.ceil(buffer.length / chunkSize)} chunks`);

        // Emit talking start
        this.emit('audio:chunk', {
            sessionId,
            audioData: '', // Signal start
            talking: true,
            mimeType: 'audio/wav'
        });

        for (let i = 0; i < buffer.length; i += chunkSize) {
            const chunk = buffer.subarray(i, i + chunkSize);
            this.emit('audio:chunk', {
                sessionId,
                audioData: chunk.toString('base64'),
                talking: true,
                mimeType: 'audio/wav'
            });
            // Small Sleep to simulate real-time playback (pacing)
            // 24000Hz * 1ch * 2 bytes = 48000 bytes/sec
            // 4096 bytes / 48000 bytes/sec = ~85ms
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Emit talking end
        this.emit('audio:chunk', {
            sessionId,
            audioData: '',
            talking: false,
            mimeType: 'audio/wav'
        });
    }

    /**
     * Internal handler for session closure
     */
    private async handleSessionClose(sessionId: string, reason: string): Promise<void> {
        const sessionData = this.activeSessions.get(sessionId);
        if (sessionData) {
            try {
                await GeminiLiveSession.findOneAndUpdate(
                    { sessionId },
                    { endTime: new Date() }
                );
            } catch (error) {
                Logger.error(`[GeminiLive] Failed to update session completion in DB:`, 'GeminiLiveService', error);
            }
            // Usage recording is handled internally by GeminiClient in Phase 120
            // Cleanup swarm listener
            if (sessionData.swarmListener && sessionData.projectId) {
                aiAgentBus.off(`message:${sessionData.projectId}`, sessionData.swarmListener);
                aiAgentBus.off(`message:${sessionData.projectId}:${sessionData.archiveId}`, sessionData.swarmListener);
            }

            // Phase 96: If we're closing for resumption, don't remove from activeSessions yet
            const needsReconnect = reason === 'GoAway Received' || reason === 'Session Lifetime Refresh';
            if (needsReconnect && sessionData.resumptionHandle) {
                Logger.info(`[GeminiLive] [${sessionId}] Attempting seamless reconnection using resumption handle...`);
                
                // Re-create the session with the same parameters but using the resumption handle
                setTimeout(async () => {
                    try {
                        const newSessionId = await this.createSession({
                            userId: sessionData.userId,
                            archiveId: sessionData.archiveId,
                            projectId: sessionData.projectId,
                            voiceName: (sessionData as any).voiceName || 'Puck', // Need to store voiceName
                            resumptionHandle: sessionData.resumptionHandle
                        });
                        Logger.info(`[GeminiLive] [${sessionId}] Reconnected successfully as ${newSessionId}`);
                    } catch (reconError) {
                        Logger.error(`[GeminiLive] [${sessionId}] Seamless reconnection failed:`, 'GeminiLiveService', reconError);
                        this.activeSessions.delete(sessionId);
                    }
                }, 1000);
            } else {
                this.activeSessions.delete(sessionId);
            }
        }
        this.emit('session:closed', { sessionId, reason });
    }

    /**
     * Disconnect a session gracefully (waiting for reconnection)
     */
    disconnectSession(sessionId: string, gracePeriodMs: number = 60000): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) return;

        Logger.info(`[GeminiLive] Session ${sessionId} marked as disconnected. Grace period: ${gracePeriodMs}ms`, 'GeminiLiveService');
        sessionData.isDisconnected = true;
        
        if (sessionData.disconnectTimer) clearTimeout(sessionData.disconnectTimer);
        
        sessionData.disconnectTimer = setTimeout(() => {
            Logger.info(`[GeminiLive] Grace period expired for session ${sessionId}. Closing...`, 'GeminiLiveService');
            this.closeSession(sessionId);
        }, gracePeriodMs);
    }

    /**
     * Resume a disconnected session
     */
    resumeSession(sessionId: string): boolean {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Cannot resume: Session ${sessionId} not found`, 'GeminiLiveService');
            // Keep track of non-existent sessions to avoid excessive lookups
            this.notFoundSessions.add(sessionId);
            if (this.notFoundSessions.size > 100) {
                const first = this.notFoundSessions.values().next().value;
                if (first) this.notFoundSessions.delete(first);
            }
            return false;
        }

        if (sessionData.disconnectTimer) {
            clearTimeout(sessionData.disconnectTimer);
            sessionData.disconnectTimer = undefined;
        }
        
        sessionData.isDisconnected = false;
        sessionData.reconnectCount = (sessionData.reconnectCount || 0) + 1;
        Logger.info(`[GeminiLive] Session ${sessionId} resumed. Total reconnections: ${sessionData.reconnectCount}`, 'GeminiLiveService');
        return true;
    }

    /**
     * Close a session immediately
     */
    closeSession(sessionId: string): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not found`, 'GeminiLiveService');
            return;
        }

        if (sessionData.disconnectTimer) {
            clearTimeout(sessionData.disconnectTimer);
        }

        try {
            sessionData.session.close();
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to close session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Handle incoming messages from Gemini Live API
     */
    private async handleIncomingMessage(sessionId: string, message: any): Promise<void> {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) return;

            // Log raw message periodically or for debugging
            if (message.serverContent) {
                // Logger.debug(`[GeminiLive] [${sessionId}] Raw message: ${JSON.stringify(message).substring(0, 500)}...`);
            } else if (message.setupComplete) {
                Logger.info(`[GeminiLive] [${sessionId}] Setup complete signature received`);
            }

            // Handle session resumption update (Phase 96)
            if (message.sessionResumptionUpdate) {
                const update = message.sessionResumptionUpdate;
                if (update.resumable && update.newHandle) {
                    Logger.info(`[GeminiLive] [${sessionId}] Received new resumption handle: ${update.newHandle.substring(0, 10)}...`);
                    sessionData.resumptionHandle = update.newHandle;
                }
            }

            // Handle GoAway (Phase 96)
            if (message.goAway) {
                const timeLeft = message.goAway.timeLeft || 'unknown';
                Logger.info(`[GeminiLive] [${sessionId}] Received GoAway message from server. Time left: ${timeLeft}. Triggering seamless resumption...`);
                // Close current connection and let the disconnect logic handle resumption if we have a handle
                this.handleSessionClose(sessionId, 'GoAway Received');
                return;
            }

            // Proactive Session Refresh (Avoid 10-minute/15-minute limits) - Deprecated by Phase 96 sessionResumption
            // We keep it as a fallback only if no resumptionHandle is available
            if (!sessionData.resumptionHandle && sessionData.startTime && (Date.now() - sessionData.startTime) > 13 * 60 * 1000) {
                Logger.info(`[GeminiLive] Session ${sessionId} reaching 14-minute fallback deadline without resumption handle. Refreshing.`, 'GeminiLiveService');
                this.handleSessionClose(sessionId, 'Session Lifetime Refresh');
                return;
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
                Logger.info(`[GeminiLive] Session ${sessionId} interrupted`, 'GeminiLiveService');
                sessionData.audioQueue = []; // Clear audio queue
                this.emit('session:interrupted', { sessionId });
                return;
            }

            // Handle user turn (transcription)
            if (message.serverContent?.userTurn?.parts) {
                for (const part of message.serverContent.userTurn.parts) {
                    if (part.text) {
                        await this.saveMessage(sessionId, 'user', part.text);
                        this.emit('user:transcript', { sessionId, text: part.text });
                    }
                }
            }

            // Handle model turn with audio
            if (message.serverContent?.modelTurn?.parts) {
                // Logger.info(`[GeminiLive] [${sessionId}] Model turn received with ${message.serverContent.modelTurn.parts.length} parts`);
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        const audioData = part.inlineData.data;

                        // Increment received counter
                        sessionData.audioChunksReceived = (sessionData.audioChunksReceived || 0) + 1;

                        // Deduplicate audio chunk
                        if (!sessionData.lastAudioHashes) {
                            sessionData.lastAudioHashes = [];
                        }

                        // Signature based on length and sample prefix
                        const signature = `${audioData.length}_${audioData.substring(0, 100)}`;

                        if (sessionData.lastAudioHashes.includes(signature)) {
                            Logger.warn(`[GeminiLive] [${sessionId}] Ignored redundant audio chunk signature to prevent ghost playback.`, 'GeminiLiveService');
                            continue;
                        }

                        sessionData.lastAudioHashes.push(signature);
                        if (sessionData.lastAudioHashes.length > 50) {
                            sessionData.lastAudioHashes.shift();
                        }

                        // Increment emitted counter
                        sessionData.audioChunksEmitted = (sessionData.audioChunksEmitted || 0) + 1;

                        // Periodically report telemetry
                        if (sessionData.audioChunksReceived % 20 === 0) {
                            Logger.info(`[GeminiLive] [${sessionId}] Session Telemetry: Chunks Received: ${sessionData.audioChunksReceived}, Chunks Emitted: ${sessionData.audioChunksEmitted}, Text Responses: ${sessionData.textResponsesReceived || 0}, Reconnections: ${sessionData.reconnectCount || 0}`, 'GeminiLiveService');
                        }

                        // Emit audio chunk to be sent to client
                        this.emit('audio:chunk', {
                            sessionId,
                            audioData: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                            turnComplete: message.serverContent.turnComplete ?? false
                        });
                    }

                    // Handle text transcription if available
                    if (part.text) {
                        const textVal = part.text.trim();
                        if (textVal) {
                            // Increment text counter
                            sessionData.textResponsesReceived = (sessionData.textResponsesReceived || 0) + 1;

                            if (!sessionData.lastTextResponses) {
                                sessionData.lastTextResponses = [];
                            }

                            if (sessionData.lastTextResponses.includes(textVal)) {
                                Logger.warn(`[GeminiLive] [${sessionId}] Ignored redundant text response to prevent duplicate visual updates: "${textVal.substring(0, 50)}..."`, 'GeminiLiveService');
                                continue;
                            }

                            sessionData.lastTextResponses.push(textVal);
                            if (sessionData.lastTextResponses.length > 10) {
                                sessionData.lastTextResponses.shift();
                            }

                            await this.saveMessage(sessionId, 'model', part.text);
                            this.emit('text:response', {
                                sessionId,
                                text: part.text
                            });
                        }
                    }
                }
            }

            // Handle tool calls (function calling)
            const toolCallPayload = message.toolCall || message.serverContent?.toolCall;
            if (toolCallPayload) {
                const toolCall = toolCallPayload;
                Logger.info(`[GeminiLive] [${sessionId}] Received tool call: ${JSON.stringify(toolCall)}`);
                // need send response confirm tool to gemini
                if (toolCall.functionCalls && toolCall.functionCalls.length > 0) {
                    this.sendToolResponse(sessionId, toolCall.functionCalls);
                    await this.saveMessage(sessionId, 'model', '', toolCall.functionCalls);
                }

                const responses: any[] = [];
                const callsToEmit: any[] = [];

                for (const call of toolCall.functionCalls || []) {
                    let handledLocally = false;
                    let localResult: any = { success: true };

                    if (call.name === 'archive_moment') {
                        Logger.info(`[GeminiLive] Intercepted ${call.name}: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        if (sessionData.userId && sessionData.archiveId) {
                            await InfluencerService.archiveEvent(
                                sessionData.userId, 
                                sessionData.archiveId, 
                                sessionId, 
                                call.args.description
                            );
                            localResult = { success: true, message: 'Moment archived to long-term memory' };
                            handledLocally = true;
                        }
                    } else if (call.name === 'update_fan_bond') {
                        Logger.info(`[GeminiLive] Intercepted ${call.name}: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        if (sessionData.userId && sessionData.archiveId) {
                            await InfluencerService.updateSocialRelationship(
                                sessionData.userId,
                                sessionData.archiveId,
                                call.args.viewerName,
                                call.args.delta,
                                call.args.reason
                            );
                            localResult = { success: true, message: `Social bond with ${call.args.viewerName} updated` };
                            handledLocally = true;
                        }
                    } else if (call.name === 'send_agent_message') {
                        Logger.info(`[GeminiLive] Intercepted ${call.name}: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        if (sessionData.projectId && sessionData.archiveId) {
                            aiAgentBus.sendMessage(sessionData.projectId, {
                                fromAgent: sessionData.archiveId,
                                toAgent: call.args.targetAgent,
                                type: 'direct',
                                payload: { message: call.args.message }
                            });
                            localResult = { success: true, message: `Message sent to ${call.args.targetAgent}` };
                            handledLocally = true;
                        }
                    } else if (call.name === 'broadcast_to_swarm') {
                        Logger.info(`[GeminiLive] Swarm: ${call.name} tool handled`, 'GeminiLiveService');
                        if (sessionData.projectId && sessionData.archiveId) {
                            aiAgentBus.sendMessage(sessionData.projectId, {
                                fromAgent: sessionData.archiveId,
                                type: 'broadcast',
                                payload: { message: call.args.message }
                            });
                            localResult = { success: true, message: 'Broadcast sent to all agents' };
                            handledLocally = true;
                        }
                    } else if (call.name === 'start_quest') {
                        Logger.info(`[GeminiLive] Intercepted start_quest: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        const session = questService.createSession(call.args.type, call.args.title);
                        questService.joinSession(session.id, sessionData.archiveId, 'Host', 'host');
                        this.emit('quest:created', { sessionId, quest: session });
                        localResult = { success: true, questId: session.id, message: 'Quest started successfully' };
                        handledLocally = true;
                    } else if (call.name === 'update_quest') {
                        const activeQuest = questService.getActiveSession();
                        if (activeQuest) {
                             this.emit('quest:updated', { sessionId, ...call.args });
                             localResult = { success: true };
                             handledLocally = true;
                        }
                    } else if (call.name === 'assign_floor') {
                        this.emit('quest:floor_assigned', { sessionId, targetAgentId: call.args.targetAgentId });
                        localResult = { success: true, message: `Floor assigned to ${call.args.targetAgentId}` };
                        handledLocally = true;
                    } else if (call.name === 'evaluate_performance') {
                        const activeQuest = questService.getActiveSession();
                        if (activeQuest) {
                            questService.updateScore(activeQuest.id, call.args.targetAgentId, call.args.score);
                            this.emit('quest:evaluated', { 
                                sessionId, 
                                targetAgentId: call.args.targetAgentId, 
                                score: call.args.score,
                                comment: call.args.comment 
                            });
                            localResult = { success: true, message: 'Score recorded' };
                        } else {
                            localResult = { success: false, message: 'No active quest' };
                        }
                        handledLocally = true;
                    }

                    if (handledLocally) {
                        responses.push({
                            name: call.name,
                            id: call.id,
                            response: localResult
                        });
                    } else {
                        // This call will be handled by the client
                        callsToEmit.push(call);
                    }
                }

                // Emit remainig calls to the client. 
                // The client MUST call sendToolResponse for these to avoid blocking Gemini.
                if (callsToEmit.length > 0) {
                    this.emit('tool:call', {
                        sessionId,
                        toolCall: {
                            functionCalls: callsToEmit
                        }
                    });
                }
            }
        } catch (error: any) {
            Logger.error(`[GeminiLive] Error handling incoming message for session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Save message to database
     */
    private async saveMessage(sessionId: string, role: 'user' | 'model', content: string, toolCalls?: any[]): Promise<void> {
        try {
            await GeminiLiveSession.findOneAndUpdate(
                { sessionId },
                {
                    $push: {
                        messages: {
                            role,
                            content,
                            toolCalls,
                            timestamp: new Date()
                        }
                    },
                    // Update resumption handle if we have a new one in metadata (Phase 96)
                    $set: {
                        'metadata.resumptionHandle': (this.activeSessions.get(sessionId) as any)?.resumptionHandle
                    }
                }
            );
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to save message to DB for session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Get active session count
     */
    getActiveSessionCount(): number {
        return this.activeSessions.size;
    }

    /**
     * Get session info
     */
    getSessionInfo(sessionId: string): any {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) return null;

        return {
            sessionId,
            archiveId: sessionData.archiveId,
            queueLength: sessionData.audioQueue.length
        };
    }

    /**
     * Load a prompt template from an .md file
     */
    private async loadPrompt(context: string, isFragment: boolean = false): Promise<string> {
        try {
            // Map context aliases
            const aliasMap: Record<string, string> = {
                'game_streaming': 'gaming',
                'general': 'standard'
            };
            const mappedContext = aliasMap[context] || context;
            
            const relativePath = isFragment 
                ? path.join('live', 'fragments', `${mappedContext}.md`)
                : path.join('live', `${mappedContext}.md`);

            const candidatePaths = [
                path.resolve(__dirname, 'prompts', relativePath),
                path.resolve(__dirname, '../prompts', relativePath),
                path.resolve(__dirname, '../../prompts', relativePath),
                path.resolve(process.cwd(), 'server/dist/prompts', relativePath),
                path.resolve(process.cwd(), 'server/src/prompts', relativePath),
                path.resolve(process.cwd(), 'prompts', relativePath)
            ];

            let foundPath: string | null = null;
            for (const candidate of candidatePaths) {
                if (fsSync.existsSync(candidate)) {
                    foundPath = candidate;
                    break;
                }
            }

            if (!foundPath) {
                throw new Error(`ENOENT, prompt file not found for ${relativePath}`);
            }

            const content = await fs.readFile(foundPath, 'utf8');
            return content;
        } catch (err: any) {
            if (!isFragment) {
                Logger.warn(`[GeminiLive] Failed to load prompt for context '${context}', falling back: ${err.message}`);
            }
            if (isFragment) return ""; // Fragments fail silently with empty string
            
            try {
                const relativeDefault = path.join('live', 'standard.md');
                const candidateDefaults = [
                    path.resolve(__dirname, 'prompts', relativeDefault),
                    path.resolve(__dirname, '../prompts', relativeDefault),
                    path.resolve(__dirname, '../../prompts', relativeDefault),
                    path.resolve(process.cwd(), 'server/dist/prompts', relativeDefault),
                    path.resolve(process.cwd(), 'server/src/prompts', relativeDefault),
                    path.resolve(process.cwd(), 'prompts', relativeDefault)
                ];
                for (const candidate of candidateDefaults) {
                    if (fsSync.existsSync(candidate)) {
                        return await fs.readFile(candidate, 'utf8');
                    }
                }
                return "You are a helpful AI assistant.";
            } catch (e) {
                return "You are a helpful AI assistant.";
            }
        }
    }
}

// Singleton instance
export const geminiLiveService = new GeminiLiveService();
