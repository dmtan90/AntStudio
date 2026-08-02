import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { geminiLiveService } from '~/services/ai/GeminiLiveService.js';
import { Influencer } from '~/models/Influencer.js';
import { GeminiLiveSession } from '~/models/GeminiLiveSession.js';
import { verifyToken } from '~/utils/jwt.js';
import { authMiddleware, AuthRequest } from '~/middleware/auth.js';
import { aiGuestService } from '~/services/ai/AIGuestService.js';
import { Logger } from '../utils/Logger.js';
import { streamingService } from '~/services/streaming/StreamingService.js';
import { productKnowledgeService } from '~/services/ai/ProductKnowledgeService.js';
import { Product } from '~/models/Product.js';
import { AIServiceManager } from '~/utils/ai/AIServiceManager.js';
import { AIAccountProvider } from '~/models/AIAccount.js';

import { socketServer } from '~/services/streaming/SocketServer.js';
import { Socket } from 'socket.io';

const axios = (await import('axios')).default;
const router = Router();

// Store active Socket.io sockets for live sessions
const activeWebSockets = new Map<string, Socket>();

// Listen for session closures
geminiLiveService.on('session:closed', ({ sessionId }) => {
    const socket = activeWebSockets.get(sessionId);
    if (socket) {
        Logger.info(`Closing Live Socket for session ${sessionId} because Gemini session ended.`, 'LiveWS');
        socket.emit('message', { type: 'error', message: 'Gemini Session Ended' });
        socket.disconnect(true);
        activeWebSockets.delete(sessionId);
    }
});

/**
 * Initialize Live WebSocket server via Socket.io (/live namespace)
 */
export function initializeLiveWebSocket(server: Server) {
    const io = socketServer.getIO();
    if (!io) {
        Logger.warn('[LiveWS] SocketServer.getIO() is null, live namespace deferred', 'LiveWS');
        return;
    }

    const liveNamespace = io.of('/live');

    liveNamespace.on('connection', async (socket: Socket) => {
        Logger.info(`New Live Socket.io connection: ${socket.id}`, 'LiveWS');

        const query = socket.handshake.query;
        const archiveId = query.archiveId as string;
        const token = query.token as string;
        const projectId = query.projectId as string;
        const isMaster = query.isMaster === 'true';
        const liveContext = (query.liveContext as string) || undefined;
        const productIds = query.productIds as string;
        const language = (query.language as string) || undefined;
        const resumeSessionId = query.resumeSessionId as string;
        let sessionId: string | null = resumeSessionId;
        let isResumed = false;

        const sendJSON = (data: any) => {
            if (socket.connected) {
                socket.emit('message', data);
            }
        };

        if (!archiveId) {
            sendJSON({ type: 'error', message: 'Missing archiveId' });
            socket.disconnect(true);
            return;
        }

        // Verify token for authentication
        let userId = 'system'; // Fallback
        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                userId = decoded.userId;
            } else {
                const guestInfo = await streamingService.validateGuestToken(token);
                if (guestInfo) {
                    userId = archiveId; // Use archiveId as the "acting" userId for guests
                    Logger.info(`Authenticated as guest via token for archive ${archiveId}`, 'LiveWS');
                } else {
                    sendJSON({ type: 'error', message: 'Invalid or expired token' });
                    socket.disconnect(true);
                    return;
                }
            }
        } else {
            Logger.warn('Connection without token, using system user');
        }

        try {
            // Load Influencer configuration
            Logger.info(`Loading Influencer configuration for archiveId: ${archiveId}`, 'LiveWS');
            const archive = await Influencer.findOne({ 
                $or: [
                    { entityId: archiveId },
                    { uuid: archiveId }
                ]
            });
            if (!archive) {
                sendJSON({ type: 'error', message: 'Influencer not found' });
                socket.disconnect(true);
                return;
            }

            const voiceName = archive.meta?.voiceConfig?.voiceId || 'Puck';

            // Try to resume existing session
            if (sessionId) {
                isResumed = geminiLiveService.resumeSession(sessionId);
                if (isResumed) {
                    Logger.info(`Resumed existing session ${sessionId} for archive ${archiveId}`, 'LiveWS');
                } else {
                    Logger.warn(`Failed to resume session ${sessionId}, creating new one.`, 'LiveWS');
                    sessionId = null;
                }
            }

            if (!sessionId) {
                let systemInstruction = archive.identity?.description || 'You are a helpful AI assistant.';

                // Context Injection — Inject Distilled Product Knowledge
                if (liveContext === 'sales') {
                    try {
                        const queryObj: any = { userId, isActive: true };
                        if (productIds) {
                            const ids = productIds.split(',').filter(id => id.length > 0);
                            if (ids.length > 0) {
                                queryObj._id = { $in: ids };
                            }
                        }

                        const products = await Product.find(queryObj).select('_id name description price currency features inventoryUrl knowledgeBase knowledgeStatus');

                        if (products.length > 0) {
                            let knowledgePrompts = '\n\n--- PRODUCT KNOWLEDGE BASE ---\nThese are the products you are selling today. Use this information accurately when pitching or answering questions:\n\n';
                            
                            for (const p of products) {
                                if (p.knowledgeStatus === 'ready' && p.knowledgeBase) {
                                    const kp = await productKnowledgeService.getKnowledgePrompt(p._id.toString());
                                    if (kp) {
                                        knowledgePrompts += kp.replace(`## Product Knowledge: ${p.name}`, `## Product: ${p.name} (ID: ${p._id.toString()})`);
                                        knowledgePrompts += '\n\n';
                                    }
                                } else {
                                    knowledgePrompts += `## Product: ${p.name} (ID: ${p._id.toString()})\n`;
                                    knowledgePrompts += `- Price: ${p.price} ${p.currency}\n`;
                                    if (p.description) knowledgePrompts += `- Description: ${p.description}\n`;
                                    if (p.features?.length > 0) knowledgePrompts += `- Features: ${p.features.join(', ')}\n`;
                                    knowledgePrompts += '\n';

                                    // Auto-trigger background ingestion if inventoryUrl exists and not already processing
                                    if (p.inventoryUrl && p.knowledgeStatus !== 'processing') {
                                        Logger.info(`Auto-triggering knowledge ingestion for product: ${p.name}`, 'LiveWS');
                                        productKnowledgeService.ingestProduct(p._id.toString()).catch((err: any) => {
                                            Logger.warn(`Background ingestion failed for ${p.name}: ${err.message}`, 'LiveWS');
                                        });
                                    }
                                }
                            }
                            
                            knowledgePrompts += '--- END PRODUCT KNOWLEDGE ---\n';
                            systemInstruction += knowledgePrompts;
                            Logger.info(`Injected product knowledge for ${products.length} products into system instructions.`, 'LiveWS');
                        }
                    } catch (knowledgeErr: any) {
                        Logger.error('Failed to inject product knowledge:', 'LiveWS', knowledgeErr);
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
                    language: language || archive.meta?.voiceConfig?.language || 'en-US'
                });

                Logger.info(`Created new session ${sessionId} for archive ${archiveId}`, 'LiveWS');
            }

            // Store active socket and disconnect any old duplicate socket
            const existingSocket = activeWebSockets.get(sessionId);
            if (existingSocket && existingSocket !== socket) {
                Logger.info(`Disconnecting duplicate active socket for session ${sessionId}`, 'LiveWS');
                existingSocket.disconnect(true);
            }
            activeWebSockets.set(sessionId, socket);

            // Send connection success
            sendJSON({ 
                type: 'connected', 
                sessionId,
                isResumed,
                voiceName,
                archiveName: archive.identity?.name || archive.entityId || 'Noname',
                liveContext
            });

            // Handlers Setup
            const handleAudioChunk = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ 
                        type: 'audio', 
                        data: data.audioData, 
                        mimeType: data.mimeType,
                        turnComplete: data.turnComplete
                    });
                }
            };

            const handleTextResponse = async (data: any) => {
                if (data.sessionId === sessionId) {
                    let responseData: any = { type: 'text', text: data.text, isConsolidated: false };
                    try {
                        const normalized = await aiGuestService.normalizeLiveResponse(data.text);
                        responseData = { ...responseData, ...normalized, isConsolidated: true };
                    } catch (e: any) { }
                    sendJSON(responseData);
                }
            };

            const handleInterrupted = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'interrupted' });
                }
            };

            const handleSessionError = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'error', message: data.error });
                }
            };

            const handleTokenRefreshed = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'token_refreshed', accessToken: data.accessToken });
                }
            };

            const handleToolCall = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'tool_call', toolCall: data.toolCall });
                }
            };

            const handleSwarmMessage = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'swarm_message', fromAgent: data.fromAgent, toAgent: data.toAgent, payload: data.payload, timestamp: data.timestamp });
                }
            };

            const handleQuestCreated = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'quest_created', ...data });
                }
            };
            const handleQuestUpdated = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'quest_updated', ...data });
                }
            };
            const handleQuestFloor = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'quest_floor_assigned', ...data });
                }
            };
            const handleQuestEvaluated = (data: any) => {
                 if (data.sessionId === sessionId) {
                    sendJSON({ type: 'quest_evaluated', ...data });
                }
            };

            const handleTurnComplete = (data: any) => {
                if (data.sessionId === sessionId) {
                    sendJSON({ type: 'turn_complete' });
                }
            };

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
                geminiLiveService.off('turn:complete', handleTurnComplete);
            };

            // Register Handlers
            geminiLiveService.on('audio:chunk', handleAudioChunk);
            geminiLiveService.on('text:response', handleTextResponse);
            geminiLiveService.on('token:refreshed', handleTokenRefreshed);
            geminiLiveService.on('session:interrupted', handleInterrupted);
            geminiLiveService.on('session:error', handleSessionError);
            geminiLiveService.on('tool:call', handleToolCall);
            geminiLiveService.on('swarm:message', handleSwarmMessage);
            geminiLiveService.on('turn:complete', handleTurnComplete);

            if (liveContext === 'gameshow') {
                geminiLiveService.on('quest:created', handleQuestCreated);
                geminiLiveService.on('quest:updated', handleQuestUpdated);
                geminiLiveService.on('quest:floor_assigned', handleQuestFloor);
                geminiLiveService.on('quest:evaluated', handleQuestEvaluated);
            }

            // Handle incoming messages from client
            socket.on('message', async (data: any) => {
                try {
                    const message = typeof data === 'string' ? JSON.parse(data) : data;
                    Logger.info(`Live Socket message received: ${message.type}`, 'LiveWS');

                    if (message.type === 'audio' && sessionId) {
                        geminiLiveService.sendAudio(sessionId, {
                            data: message.data,
                            mimeType: message.mimeType || 'audio/pcm;rate=16000'
                        });
                    } else if (message.type === 'text' && sessionId) {
                        await geminiLiveService.sendText(sessionId, message.text);
                    } else if (message.type === 'video' && sessionId) {
                        geminiLiveService.sendVideo(sessionId, {
                            data: message.data,
                            mimeType: message.mimeType || 'image/jpeg'
                        });
                    } else if (message.type === 'tool_response' && sessionId) {
                        geminiLiveService.sendToolResponse(sessionId, message.functionResponses);
                    } else if (message.type === 'talk') {
                        const { prompt, context } = message;
                        if (sessionId) {
                            await geminiLiveService.sendText(sessionId, prompt);
                            return;
                        }

                        const result = await aiGuestService.generateGuestDialogue(userId, archiveId, prompt, context);

                        sendJSON({
                            type: 'text',
                            text: result.text,
                            emotion: result.emotion,
                            gesture: result.gesture,
                            action: result.action,
                            actionPayload: result.actionPayload,
                            isConsolidated: true
                        });

                        if (result.audioUrl) {
                            try {
                                const response = await axios.get(result.audioUrl, { responseType: 'arraybuffer' });
                                const audioBuffer = Buffer.from(response.data);

                                sendJSON({
                                    type: 'audio',
                                    data: audioBuffer.toString('base64'),
                                    mimeType: 'audio/mpeg'
                                });
                            } catch (audioError: any) {
                                Logger.error(`Failed to stream audio for talk: ${audioError.message}`, 'LiveWS', audioError);
                            }
                        }
                    } else if (message.type === 'speak_directive' && sessionId) {
                        const { text, voiceName: directiveVoice } = message;
                        if (text) {
                            try {
                                const aiServiceManager = AIServiceManager.getInstance();
                                const selectedVoice = directiveVoice || archive.meta?.voiceConfig?.voiceId || 'Puck';
                                const audioResult = await aiServiceManager.generateAudio(text, undefined, AIAccountProvider.GEMINI, {voiceId: selectedVoice});
                                
                                if (audioResult?.url) {
                                    const response = await axios.get(audioResult.url, { responseType: 'arraybuffer' });
                                    const audioBuffer = Buffer.from(response.data);

                                    sendJSON({
                                        type: 'audio',
                                        data: audioBuffer.toString('base64'),
                                        mimeType: audioResult.mimeType || 'audio/mpeg',
                                        source: 'speak_directive'
                                    });

                                    await geminiLiveService.sendText(sessionId, `[SYSTEM NOTE: You just spoke the following exact text to the audience: "${text}" — Do not repeat it. Continue naturally from here.]`);
                                }
                            } catch (speakError: any) {
                                Logger.error(`speak_directive TTS failed: ${speakError.message}`, 'LiveWS', speakError);
                                sendJSON({ type: 'error', message: `speak_directive failed: ${speakError.message}` });
                            }
                        }
                    } else if (message.type === 'chat_message' && sessionId) {
                        const { username, text: chatText } = message;
                        if (chatText) {
                            const prompt = `Chat from ${username || 'Viewer'}]: ${chatText}`;
                            await geminiLiveService.sendText(sessionId, prompt);
                        }
                    }
                } catch (error: any) {
                    Logger.error('Error processing Socket message:', 'LiveWS', error);
                    sendJSON({ type: 'error', message: error.message });
                }
            });

            socket.on('disconnect', () => {
                Logger.info(`Live Socket disconnected for session ${sessionId}`, 'LiveWS');
                if (sessionId) {
                    if (activeWebSockets.get(sessionId) === socket) {
                        activeWebSockets.delete(sessionId);
                    }
                    geminiLiveService.disconnectSession(sessionId);
                }
                cleanupHandlers();
            });

        } catch (error: any) {
            Logger.error('Error setting up Live Socket session:', 'LiveWS', error);
            sendJSON({ type: 'error', message: error.message });
            socket.disconnect(true);
        }
    });

    Logger.info('Socket.io Live Studio namespace initialized on /live', 'LiveWS');
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
