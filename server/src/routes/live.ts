import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { geminiLiveService } from '../services/GeminiLiveService.js';
import { VTuber } from '../models/VTuber.js';
import { GeminiLiveSession } from '../models/GeminiLiveSession.js';
import { verifyToken } from '../utils/jwt.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { aiGuestService } from '../services/ai/AIGuestService.js';

const router = Router();

// Store WebSocket server instance
let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initializeLiveWebSocket(server: Server) {
    wss = new WebSocketServer({ 
        server,
        path: '/api/live'
    });

    wss.on('connection', async (ws: WebSocket, req) => {
        console.log('[LiveWS] New WebSocket connection');

        // Extract params from query
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const archiveId = url.searchParams.get('archiveId');
        const token = url.searchParams.get('token');
        const projectId = url.searchParams.get('projectId');
        const isMaster = url.searchParams.get('isMaster') === 'true';
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
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
                ws.close();
                return;
            }
        } else {
            console.warn('[LiveWS] Connection without token, using system user');
        }

        try {
            // Load VTuber configuration
            console.log('[LiveWS] Loading VTuber configuration for archiveId:', archiveId);
            const archive = await VTuber.findOne({ 
                $or: [
                    { entityId: archiveId },
                    { uuid: archiveId }
                ]
            });
            if (!archive) {
                ws.send(JSON.stringify({ type: 'error', message: 'VTuber not found' }));
                ws.close();
                return;
            }

            const voiceName = archive.meta?.voiceConfig?.voiceId || 'Puck';

            // Try to resume existing session
            if (sessionId) {
                isResumed = geminiLiveService.resumeSession(sessionId);
                if (isResumed) {
                    console.log(`[LiveWS] Resumed existing session ${sessionId} for archive ${archiveId}`);
                } else {
                    console.warn(`[LiveWS] Failed to resume session ${sessionId}, creating new one.`);
                    sessionId = null;
                }
            }

            if (!sessionId) {
                const systemInstruction = archive.identity?.description || 'You are a helpful AI assistant.';

                // Create Gemini Live API session
                sessionId = await geminiLiveService.createSession({
                    userId,
                    archiveId,
                    projectId: projectId || undefined,
                    voiceName,
                    systemInstruction,
                    isMaster,
                });

                console.log(`[LiveWS] Created new session ${sessionId} for archive ${archiveId}`);
            }

            // Send connection success
            ws.send(JSON.stringify({ 
                type: 'connected', 
                sessionId,
                voiceName,
                isResumed,
                archiveName: archive.identity?.name
            }));

            // Set up event listeners for Gemini Live API responses
            const handleAudioChunk = (data: any) => {
                // console.log('[LiveWS] Audio chunk received:', data.audioData.length, 'bytes');
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'audio',
                        data: data.audioData,
                        mimeType: data.mimeType
                    }));
                }
            };

            const handleTextResponse = async (data: any) => {
                console.log('[LiveWS] Text response received:', data.text);
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    // Phase 6: AI-powered Normalization
                    // The user explicitly requested we normalize plain text into JSON via Gemini
                    let responseData: any = {
                        type: 'text',
                        text: data.text,
                        isConsolidated: false
                    };

                    try {
                        const normalized = await aiGuestService.normalizeLiveResponse(data.text);
                        console.log('[LiveWS] Normalized response:', JSON.stringify(normalized));
                        responseData = {
                            ...responseData,
                            ...normalized,
                            isConsolidated: true
                        };
                    } catch (e) {
                        console.error('[LiveWS] Normalization failed:', e);
                    }

                    ws.send(JSON.stringify(responseData));

                    // ws.send(JSON.stringify({
                    //     type: 'text',
                    //     text: data.text
                    // }));
                }
            };

            const handleInterrupted = (data: any) => {
                console.log('[LiveWS] Interrupted:', data);
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'interrupted'
                    }));
                }
            };

            const handleSessionError = (data: any) => {
                console.log('[LiveWS] Session error:', data.error);
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: data.error
                    }));
                }
            };

            const handleToolCall = (data: any) => {
                console.log('[LiveWS] Tool call received:', data.toolCall);
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    console.log(`[LiveWS] Tool call:`, data.toolCall);
                    ws.send(JSON.stringify({
                        type: 'tool_call',
                        toolCall: data.toolCall
                    }));
                }
            };

            const handleSwarmMessage = (data: any) => {
                console.log('[LiveWS] Swarm message received:', data.payload);
                if (data.sessionId === sessionId && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'swarm_message',
                        fromAgent: data.fromAgent,
                        toAgent: data.toAgent,
                        payload: data.payload,
                        timestamp: data.timestamp
                    }));
                }
            };

            geminiLiveService.on('audio:chunk', handleAudioChunk);
            geminiLiveService.on('text:response', handleTextResponse);
            geminiLiveService.on('session:interrupted', handleInterrupted);
            geminiLiveService.on('session:error', handleSessionError);
            geminiLiveService.on('tool:call', handleToolCall);
            geminiLiveService.on('swarm:message', handleSwarmMessage);

            // Quest Events (Phase 31)
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

            geminiLiveService.on('quest:created', handleQuestCreated);
            geminiLiveService.on('quest:updated', handleQuestUpdated);
            geminiLiveService.on('quest:floor_assigned', handleQuestFloor);
            geminiLiveService.on('quest:evaluated', handleQuestEvaluated);

            // Handle incoming messages from client
            ws.on('message', async (message: Buffer) => {
                try {
                    const data = JSON.parse(message.toString());

                    if (data.type === 'audio' && sessionId) {
                        // Forward audio to Gemini Live API
                        geminiLiveService.sendAudio(sessionId, {
                            data: data.data,
                            mimeType: data.mimeType || 'audio/pcm;rate=16000'
                        });
                    } else if (data.type === 'text' && sessionId) {
                        // Forward text to Gemini Live API
                        geminiLiveService.sendText(sessionId, data.text);
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
                        // Unified 'Talk' handler for Standard mode VTubers over WebSocket
                        const { prompt, context } = data;
                        console.log(`[LiveWS] Talk request received for archive ${archiveId}: ${sessionId ? '(Routing to Live API)' : '(Routing to GuestService)'}`, prompt.substring(0, 50));

                        if (sessionId) {
                            // Forward to Gemini Live API
                            geminiLiveService.sendText(sessionId, prompt);
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
                                console.error('[LiveWS] Failed to stream audio for talk:', audioError.message);
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('[LiveWS] Error processing message:', error);
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
            });

            // Handle client disconnect
            ws.on('close', () => {
                console.log(`[LiveWS] Client disconnected, marking session ${sessionId} for graceful cleanup.`);
                if (sessionId) {
                    geminiLiveService.disconnectSession(sessionId);
                }

                // Remove event listeners
                geminiLiveService.off('audio:chunk', handleAudioChunk);
                geminiLiveService.off('text:response', handleTextResponse);
                geminiLiveService.off('session:interrupted', handleInterrupted);
                geminiLiveService.off('session:error', handleSessionError);
                geminiLiveService.off('tool:call', handleToolCall);
                geminiLiveService.off('swarm:message', handleSwarmMessage);
                
                geminiLiveService.off('quest:created', handleQuestCreated);
                geminiLiveService.off('quest:updated', handleQuestUpdated);
                geminiLiveService.off('quest:floor_assigned', handleQuestFloor);
                geminiLiveService.off('quest:evaluated', handleQuestEvaluated);
            });

        } catch (error: any) {
            console.error('[LiveWS] Error setting up session:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
            ws.close();
        }
    });

    console.log('[LiveWS] WebSocket server initialized on /live');
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
            const archive = await VTuber.findOne({ entityId: sess.archiveId }).select('identity.name visual.thumbnailUrl visual.avatarUrl');
            return {
                ...sess.toObject(),
                archiveName: archive?.identity?.name || 'Unknown VTuber',
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

        const archive = await VTuber.findOne({ entityId: session.archiveId }).select('identity.name visual.thumbnailUrl visual.avatarUrl');

        res.json({ 
            success: true, 
            data: {
                ...session.toObject(),
                archiveName: archive?.identity?.name || 'Unknown VTuber',
                avatarUrl: archive?.visual?.thumbnailUrl || archive?.visual?.modelUrl || ''
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
