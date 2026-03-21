import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { geminiLiveService } from '~/services/GeminiLiveService.js';
import { Influencer } from '~/models/Influencer.js';
import { GeminiLiveSession } from '~/models/GeminiLiveSession.js';
import { verifyToken } from '~/utils/jwt.js';
import { authMiddleware, AuthRequest } from '~/middleware/auth.js';
import { aiGuestService } from '~/services/ai/AIGuestService.js';
import { Logger } from '../utils/Logger.js';

const router = Router();

// Store WebSocket server instance
let wss: WebSocketServer | null = null;
const activeWebSockets = new Map<string, WebSocket>();

// Listen for session closures
geminiLiveService.on('session:closed', ({ sessionId }) => {
    const ws = activeWebSockets.get(sessionId);
    if (ws) {
        Logger.info(`[LiveWS] Closing WebSocket for session ${sessionId} because Gemini session ended.`, 'LiveWS');
        ws.close(4000, 'Gemini Session Ended');
        activeWebSockets.delete(sessionId);
    }
});

/**
 * Initialize WebSocket server
 */
export function initializeLiveWebSocket(server: Server) {
    wss = new WebSocketServer({ 
        server,
        path: '/api/live'
    });

    wss.on('connection', async (ws: WebSocket, req) => {
        Logger.info('[LiveWS] New WebSocket connection');

        // Extract params from query
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const archiveId = url.searchParams.get('archiveId');
        const token = url.searchParams.get('token');
        const projectId = url.searchParams.get('projectId');
        const isMaster = url.searchParams.get('isMaster') === 'true';
        const liveContext = url.searchParams.get('liveContext') || undefined;
        const productIds = url.searchParams.get('productIds');
        const resumeSessionId = url.searchParams.get('resumeSessionId');
        let sessionId: string | null = resumeSessionId;
        let isResumed = false;


        if (!archiveId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Missing archiveId' }));
            ws.close();
            return;
        }

        // Verify token for authentication
        let userId = 'system'; // Fallback
        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                userId = decoded.userId;
            } else {
                // Phase 90: Try Guest Token fallback
                const { streamingService } = await import('~/services/StreamingService.js');
                const guestInfo = await streamingService.validateGuestToken(token);
                if (guestInfo) {
                    userId = archiveId; // Use archiveId as the "acting" userId for guests
                    Logger.info(`[LiveWS] Authenticated as guest via token for archive ${archiveId}`, 'LiveWS');
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
                    ws.close();
                    return;
                }
            }
        } else {
            Logger.warn('[LiveWS] Connection without token, using system user');
        }

        try {
            // Load Influencer configuration
            Logger.info(`[LiveWS] Loading Influencer configuration for archiveId: ${archiveId}`, 'LiveWS');
            const archive = await Influencer.findOne({ 
                $or: [
                    { entityId: archiveId },
                    { uuid: archiveId }
                ]
            });
            if (!archive) {
                ws.send(JSON.stringify({ type: 'error', message: 'Influencer not found' }));
                ws.close();
                return;
            }

            const voiceName = archive.meta?.voiceConfig?.voiceId || 'Puck';

            // Try to resume existing session
            if (sessionId) {
                isResumed = geminiLiveService.resumeSession(sessionId);
                if (isResumed) {
                    Logger.info(`[LiveWS] Resumed existing session ${sessionId} for archive ${archiveId}`, 'LiveWS');
                } else {
                    Logger.warn(`[LiveWS] Failed to resume session ${sessionId}, creating new one.`, 'LiveWS');
                    sessionId = null;
                }
            }

            if (!sessionId) {
                let systemInstruction = archive.identity?.description || 'You are a helpful AI assistant.';

                // Phase 11: Context Injection — Inject Distilled Product Knowledge
                if (liveContext === 'sales') {
                    try {
                        const { productKnowledgeService } = await import('~/services/ai/ProductKnowledgeService.js');
                        const { Product } = await import('~/models/Product.js');
                        
                        // Fetch active products for this user, optionally filtered by productIds
                        const query: any = { userId, isActive: true };
                        if (productIds) {
                            const ids = productIds.split(',').filter(id => id.length > 0);
                            if (ids.length > 0) {
                                query._id = { $in: ids };
                            }
                        }

                        const products = await Product.find(query).select('_id name description price currency features inventoryUrl knowledgeBase knowledgeStatus');

                        if (products.length > 0) {
                            let knowledgePrompts = '\n\n--- PRODUCT KNOWLEDGE BASE ---\nThese are the products you are selling today. Use this information accurately when pitching or answering questions:\n\n';
                            
                            for (const p of products) {
                                if (p.knowledgeStatus === 'ready' && p.knowledgeBase) {
                                    // Full distilled knowledge available
                                    const kp = await productKnowledgeService.getKnowledgePrompt(p._id.toString());
                                    if (kp) {
                                        knowledgePrompts += kp.replace(`## Product Knowledge: ${p.name}`, `## Product: ${p.name} (ID: ${p._id.toString()})`);
                                        knowledgePrompts += '\n\n';
                                    }
                                } else {
                                    // Fallback: basic product info from DB fields
                                    knowledgePrompts += `## Product: ${p.name} (ID: ${p._id.toString()})\n`;
                                    knowledgePrompts += `- Price: ${p.price} ${p.currency}\n`;
                                    if (p.description) knowledgePrompts += `- Description: ${p.description}\n`;
                                    if (p.features?.length > 0) knowledgePrompts += `- Features: ${p.features.join(', ')}\n`;
                                    knowledgePrompts += '\n';

                                    // Auto-trigger background ingestion if inventoryUrl exists and not already processing
                                    if (p.inventoryUrl && p.knowledgeStatus !== 'processing') {
                                        Logger.info(`[LiveWS] Auto-triggering knowledge ingestion for product: ${p.name}`, 'LiveWS');
                                        productKnowledgeService.ingestProduct(p._id.toString()).catch((err: any) => {
                                            Logger.warn(`[LiveWS] Background ingestion failed for ${p.name}: ${err.message}`, 'LiveWS');
                                        });
                                    }
                                }
                            }
                            
                            knowledgePrompts += '--- END PRODUCT KNOWLEDGE ---\n';
                            systemInstruction += knowledgePrompts;
                            Logger.info(`[LiveWS] Injected product knowledge for ${products.length} products into system instructions.`, 'LiveWS');
                        }
                    } catch (knowledgeErr: any) {
                        Logger.error('[LiveWS] Failed to inject product knowledge:', 'LiveWS', knowledgeErr);
                    }
                }

                // Create Gemini Live API session
                sessionId = await geminiLiveService.createSession({
                    userId,
                    archiveId,
                    projectId: projectId || undefined,
                    voiceName,
                    systemInstruction,
                    isMaster,
                    liveContext: liveContext || undefined,
                    modelType: archive.visual?.modelType,
                    language: archive.meta?.voiceConfig?.language || 'en-US'
                });

                Logger.info(`[LiveWS] Created new session ${sessionId} for archive ${archiveId}`, 'LiveWS');
            }

            // Send connection success
            ws.send(JSON.stringify({ 
                type: 'connected', 
                sessionId,
                voiceName,
                isResumed,
                archiveName: archive.identity?.name,
                liveContext
            }));

            // --- Handlers Setup ---
            const cleanupHandlers = () => {
                geminiLiveService.off('audio:chunk', handleAudioChunk);
                geminiLiveService.off('text:response', handleTextResponse);
                geminiLiveService.off('token:refreshed', handleTokenRefreshed);
                geminiLiveService.off('session:interrupted', handleInterrupted);
                geminiLiveService.off('session:error', handleSessionError);
                geminiLiveService.off('tool:call', handleToolCall);
                geminiLiveService.off('swarm:message', handleSwarmMessage);
                geminiLiveService.off('quest:created', handleQuestCreated);
                geminiLiveService.off('quest:updated', handleQuestUpdated);
                geminiLiveService.off('quest:floor_assigned', handleQuestFloor);
                geminiLiveService.off('quest:evaluated', handleQuestEvaluated);
            };

            const handleAudioChunk = (data: any) => {
                // Logger.info('[LiveWS] Audio chunk received:', data.audioData.length, 'bytes');
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'audio', data: data.audioData, mimeType: data.mimeType }));
                }
            };

            const handleTextResponse = async (data: any) => {
                Logger.info(`[LiveWS] Text response received: ${data.text}`, 'LiveWS');
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    let responseData: any = { type: 'text', text: data.text, isConsolidated: false };
                    try {
                        const normalized = await aiGuestService.normalizeLiveResponse(data.text);
                        responseData = { ...responseData, ...normalized, isConsolidated: true };
                    } catch (e: any) { }
                    ws.send(JSON.stringify(responseData));
                }
            };

            const handleInterrupted = (data: any) => {
                Logger.info('[LiveWS] Interrupted:', 'LiveWS', data);
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'interrupted' }));
                }
            };

            const handleSessionError = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: data.error }));
                }
            };

            const handleTokenRefreshed = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'token_refreshed', accessToken: data.accessToken }));
                }
            };

            const handleToolCall = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'tool_call', toolCall: data.toolCall }));
                }
            };

            const handleSwarmMessage = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'swarm_message', fromAgent: data.fromAgent, toAgent: data.toAgent, payload: data.payload, timestamp: data.timestamp }));
                }
            };

            const handleQuestCreated = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'quest_created', ...data }));
                }
            };
            const handleQuestUpdated = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'quest_updated', ...data }));
                }
            };
            const handleQuestFloor = (data: any) => {
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'quest_floor_assigned', ...data }));
                }
            };
            const handleQuestEvaluated = (data: any) => {
                 if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'quest_evaluated', ...data }));
                }
            };

            // Register Basic Handlers
            geminiLiveService.on('audio:chunk', handleAudioChunk);
            geminiLiveService.on('text:response', handleTextResponse);
            geminiLiveService.on('token:refreshed', handleTokenRefreshed);
            // Note: Context-specific handlers are registered above
            geminiLiveService.on('session:interrupted', handleInterrupted);
            geminiLiveService.on('session:error', handleSessionError);
            geminiLiveService.on('tool:call', handleToolCall);
            geminiLiveService.on('swarm:message', handleSwarmMessage);

            // Register Context-Specific Handlers
            if (liveContext === 'sales') {
                Logger.info(`[LiveWS] Setting up Sales handlers for session ${sessionId}`, 'LiveWS');
                // Sale-specific tool forwarding is already handled by generic tool:call
                // But we could add more specific logic here if needed
            } else if (liveContext === 'gameshow') {
                Logger.info(`[LiveWS] Setting up GameShow handlers for session ${sessionId}`, 'LiveWS');
                geminiLiveService.on('quest:created', handleQuestCreated);
                geminiLiveService.on('quest:updated', handleQuestUpdated);
                geminiLiveService.on('quest:floor_assigned', handleQuestFloor);
                geminiLiveService.on('quest:evaluated', handleQuestEvaluated);
            }

            // Handle incoming messages from client
            ws.on('message', async (message: Buffer) => {
                try {
                    const data = JSON.parse(message.toString());
                    Logger.info(`[LiveWS] Message received: ${data.type}`, 'LiveWS');

                    if (data.type === 'audio' && sessionId) {
                        // Forward audio to Gemini Live API
                        geminiLiveService.sendAudio(sessionId, {
                            data: data.data,
                            mimeType: data.mimeType || 'audio/pcm;rate=16000'
                        });
                    } else if (data.type === 'text' && sessionId) {
                        // Forward text to Gemini Live API
                        await geminiLiveService.sendText(sessionId, data.text);
                    } else if (data.type === 'video' && sessionId) {
                        // Forward video/image frame to Gemini Live API
                        geminiLiveService.sendVideo(sessionId, {
                            data: data.data,
                            mimeType: data.mimeType || 'image/jpeg'
                        });
                    } else if (data.type === 'tool_response' && sessionId) {
                        // Forward tool response to Gemini Live API
                        geminiLiveService.sendToolResponse(sessionId, data.functionResponses);
                    } else if (data.type === 'talk') {
                        // Unified 'Talk' handler for Standard mode Influencers over WebSocket
                        const { prompt, context } = data;
                        Logger.info(`[LiveWS] Talk request received for archive ${archiveId}: ${sessionId ? '(Routing to Live API)' : '(Routing to GuestService)'} ${prompt.substring(0, 50)}`, 'LiveWS');

                        if (sessionId) {
                            // Forward to Gemini Live API
                            await geminiLiveService.sendText(sessionId, prompt);
                            return;
                        }

                        // Use AIGuestService to generate dialogue (Integrated TTS)
                        // Using dynamic import to avoid circular dependency or early loading issues
                        const { aiGuestService } = await import('../services/ai/AIGuestService.js');
                        const result = await aiGuestService.generateGuestDialogue(userId, archiveId, prompt, context);

                        // 1. Send text metadata immediately
                        ws.send(JSON.stringify({
                            type: 'text',
                            text: result.text,
                            emotion: result.emotion,
                            gesture: result.gesture,
                            action: result.action,
                            actionPayload: result.actionPayload,
                            isConsolidated: true // Mark as coming from the unified WebSocket talk path
                        }));

                        // 2. Stream audio if generated
                        if (result.audioUrl) {
                            try {
                                const axios = (await import('axios')).default;
                                const response = await axios.get(result.audioUrl, { responseType: 'arraybuffer' });
                                const audioBuffer = Buffer.from(response.data);

                                // Send as a single message for reliable decoding by audioContext.decodeAudioData
                                ws.send(JSON.stringify({
                                    type: 'audio',
                                    data: audioBuffer.toString('base64'),
                                    mimeType: 'audio/mpeg'
                                }));
                            } catch (audioError: any) {
                                Logger.error(`[LiveWS] Failed to stream audio for talk: ${audioError.message}`, 'LiveWS', audioError);
                            }
                        } else if (data.type === 'speak_directive' && sessionId) {
                        // Phase 10: Proactive script performance via TTS
                        // Generates exact audio from a script and streams it to the client
                        const { text, voiceName: directiveVoice } = data;
                        if (text) {
                            try {
                                Logger.info(`[LiveWS] speak_directive: generating TTS for ${text.substring(0, 60)}...`, 'LiveWS');
                                const { GeminiClient } = await import('../integrations/ai/GeminiClient.js');
                                const geminiClient = new GeminiClient({});
                                const selectedVoice = directiveVoice || archive.meta?.voiceConfig?.voiceId || 'Puck';
                                const audioResult = await geminiClient.generateAudio(text, selectedVoice);

                                if (audioResult?.url) {
                                    const axios = (await import('axios')).default;
                                    const response = await axios.get(audioResult.url, { responseType: 'arraybuffer' });
                                    const audioBuffer = Buffer.from(response.data);

                                    ws.send(JSON.stringify({
                                        type: 'audio',
                                        data: audioBuffer.toString('base64'),
                                        mimeType: audioResult.mimeType || 'audio/mpeg',
                                        source: 'speak_directive'
                                    }));

                                    // Inject into live session history as a memo so the LLM knows what was spoken
                                    await geminiLiveService.sendText(sessionId, `[SYSTEM NOTE: You just spoke the following exact text to the audience: "${text}" — Do not repeat it. Continue naturally from here.]`);
                                }
                            } catch (speakError: any) {
                                Logger.error(`[LiveWS] speak_directive TTS failed: ${speakError.message}`, 'LiveWS', speakError);
                                ws.send(JSON.stringify({ type: 'error', message: `speak_directive failed: ${speakError.message}` }));
                            }
                        }
                    } else if (data.type === 'chat_message' && sessionId) {
                        // Phase 11: Q&A Bridge — buyer comment forwarded to Gemini Live for response
                        const { username, text: chatText } = data;
                        if (chatText) {
                            const prompt = `[Live Chat from ${username || 'Viewer'}]: ${chatText}`;
                            Logger.info(`[LiveWS] chat_message → Live API: ${prompt.substring(0, 80)}`, 'LiveWS');
                            await geminiLiveService.sendText(sessionId, prompt);
                        }
                    }
                    }
                } catch (error: any) {
                    Logger.error('[LiveWS] Error processing message:', 'LiveWS', error);
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
            });

            // Track WebSocket by sessionId for clean closure (Phase 2)
            activeWebSockets.set(sessionId, ws);

            // Handle client disconnect
            ws.on('close', () => {
                Logger.info(`[LiveWS] Client disconnected, marking session ${sessionId} for graceful cleanup.`, 'LiveWS');
                if (sessionId) {
                    if (activeWebSockets.get(sessionId) === ws) {
                        activeWebSockets.delete(sessionId);
                    }
                    geminiLiveService.disconnectSession(sessionId);
                }

                // Unified cleanup of event listeners
                cleanupHandlers();
            });

        } catch (error: any) {
            Logger.error('[LiveWS] Error setting up session:', 'LiveWS', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
            ws.close();
        }
    });

    Logger.info('[LiveWS] WebSocket server initialized on /live');
}

/**
 * API Endpoints for Session History
 */

// GET /api/live/sessions - List user's sessions
router.get('/sessions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const sessions = await GeminiLiveSession.find({ userId })
            .select('sessionId archiveId startTime endTime metadata')
            .sort({ createdAt: -1 })
            .limit(50);

        // Populate archive info if possible
        const populatedSessions = await Promise.all(sessions.map(async (sess) => {
            const archive = await Influencer.findOne({ entityId: sess.archiveId }).select('identity.name visual.thumbnailUrl visual.avatarUrl');
            return {
                ...sess.toObject(),
                archiveName: archive?.identity?.name || 'Unknown Influencer',
                avatarUrl: archive?.visual?.thumbnailUrl || archive?.visual?.modelUrl || ''
            };
        }));

        res.json({ success: true, data: populatedSessions });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/live/sessions/:sessionId - Get full transcript
router.get('/sessions/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const { sessionId } = req.params;

        const session = await GeminiLiveSession.findOne({ sessionId, userId });
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        const archive = await Influencer.findOne({ entityId: session.archiveId }).select('identity.name visual.thumbnailUrl visual.avatarUrl');

        res.json({ 
            success: true, 
            data: {
                ...session.toObject(),
                archiveName: archive?.identity?.name || 'Unknown Influencer',
                avatarUrl: archive?.visual?.thumbnailUrl || archive?.visual?.modelUrl || ''
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
