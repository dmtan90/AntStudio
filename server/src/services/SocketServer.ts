import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { BinaryStreamService } from './BinaryStreamService.js';
import { streamingService } from './StreamingService.js';
import { StreamSessionModel } from '../models/StreamSession.js';
import { UserPlatformAccount } from '../models/UserPlatformAccount.js';
import { PlatformAuthService } from './PlatformAuthService.js';
import { aiPerformanceService } from './ai/AIPerformanceService.js';
import { geminiLiveService } from './GeminiLiveService.js';
import { audienceInteractionService } from './ai/AudienceInteractionService.js';
import { gamificationService } from './gamification/GamificationService.js';
import { virtualEconomyService } from './economy/VirtualEconomyService.js';
import { analyticsService } from './analytics/AnalyticsService.js';
import { autoDirectorService } from './ai/AutoDirectorService.js';

/**
 * Unified Socket.io Server Manager for collaboration, gaming, and engagement.
 * Merged from legacy SocketService and SocketServer.
 */
export class SocketServer {
    private io: Server | null = null;
    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs

    constructor() {
        // Singleton pattern: initialization happens via .initialize(server)
    }

    /**
     * Initializes the Socket.io server with the given HTTP server.
     */
    public initialize(httpServer: HTTPServer) {
        if (this.io) {
            console.warn('⚠️ [SocketServer] Already initialized');
            return;
        }

        this.io = new Server(httpServer, {
            allowEIO3: true,
            path: '/socket.io',
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
		this.io.listen(4001);

        this.setupAuthentication();
        this.setupHandlers();
        this.setupServiceListeners();
        this.startChatSyncWorker();

        console.log("🚀 [SocketServer] Unified Socket.io running at /socket.io");
    }

    /**
     * Middleware to authenticate socket connections with JWT.
     */
    private setupAuthentication() {
        if (!this.io) return;

        this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            const roomId = socket.handshake.auth.roomId || socket.handshake.query.projectId || socket.handshake.query.roomId;

            if (!token) {
                return next(new Error('Authentication failed: Missing token'));
            }

            try {
                // 1. Try JWT Auth (for Hosts/Co-hosts)
                const decoded = verifyToken(token as string);
                if (decoded) {
                    const user = await User.findById(decoded.userId);
                    if (user) {
                        socket.data.user = {
                            id: user._id.toString(),
                            name: user.name,
                            avatar: user.avatar,
                            role: 'host',
                            email: user.email
                        };
                        if (roomId) {
                            socket.data.roomId = roomId;
                            socket.join(roomId);
                        }
                        
                        // User tracking logic
                        const userId = user._id.toString();
                        socket.join(`user:${userId}`);
                        if (!this.userSockets.has(userId)) {
                            this.userSockets.set(userId, new Set());
                        }
                        this.userSockets.get(userId)!.add(socket.id);

                        return next();
                    }
                }

                // 2. Try Guest Token Auth (for Anonymous Guests)
                const guestInfo = await streamingService.validateGuestToken(token as string);
                if (guestInfo) {
                    const { sessionId } = guestInfo;
                    const displayName = socket.handshake.auth.displayName || 'Guest';

                    socket.data.user = {
                        id: `guest_${socket.id}`,
                        name: displayName,
                        role: 'guest',
                        isAnonymous: true
                    };
                    socket.data.roomId = sessionId;
                    socket.join(sessionId);

                    console.log(`📡 [SocketServer] Anonymous Guest "${displayName}" joined Room: ${sessionId}`);
                    return next();
                }

                return next(new Error('Authentication error: Invalid token'));
            } catch (err) {
                console.error('❌ [SocketServer] Auth error:', err);
                next(new Error('Authentication error'));
            }
        });
    }

    /**
     * Setups event handlers for collaborative and engagement actions.
     */
    private setupHandlers() {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            const transportName = socket.conn.transport.name;
            console.log(`🔌 [SocketServer] New connection: ${socket.id} (${transportName})`);

            socket.conn.on('upgrade', () => {
                console.log(`🚀 [SocketServer] Upgraded to ${socket.conn.transport.name} for ${socket.id}`);
            });

            const roomId = socket.data.roomId;
            const user = socket.data.user;

            if (roomId && user) {
                console.log(`👤 User ${user.name} joined Room: ${roomId}`);
                this.broadcastRoomUsers(roomId);
            }

            // --- 1. Studio Collaboration (Legacy SocketServer logic) ---
            socket.on('layer:update', (payload: { id: string, props: any }) => {
                if (roomId) socket.to(roomId).emit('layer:update', payload);
            });

            socket.on('layer:select', (payload: { id: string }) => {
                if (roomId && user) {
                    socket.to(roomId).emit('layer:select', {
                        id: payload.id,
                        userId: user.id,
                        userName: user.name
                    });
                }
            });

            socket.on('studio:state', (state: any) => {
                if (roomId) socket.to(roomId).emit('studio:state', state);
            });

            socket.on('performance:snapshot', (data: any) => {
                if (roomId) aiPerformanceService.recordSnapshot(roomId, data);
            });

            socket.on('neural:stream', (payload: { type: 'audio' | 'video' | 'meta', chunk: any }) => {
                if (roomId && this.io) BinaryStreamService.streamChunk(this.io, roomId, payload.type, payload.chunk);
            });

            socket.on('stream:relay', (payload: { sessionId: string, chunk: Buffer }) => {
                streamingService.ingestRelayChunk(payload.sessionId, payload.chunk);
            });

            // --- 2. Engagement & Gameplay (Legacy SocketService logic) ---
            
            // Hive Voting
            socket.on('hive:vote', (data: { optionIndex: number }) => {
                audienceInteractionService.castVote(user?.id || socket.id, data.optionIndex);
                if (user?.id) gamificationService.addXp(user.id, 50, 'poll');
            });

            socket.on('hive:request', (data: { type: any, payload: any, cost: number }) => {
                if (user?.id) {
                    audienceInteractionService.submitDirectorRequest(user.id, user.name || 'Anonymous', data.type, data.payload, data.cost);
                }
            });

            // Chat Sentiment
            socket.on('chat:message', (data: { text: string }) => {
                audienceInteractionService.ingestChatMessage(data.text);
                analyticsService.trackMessage();
                if (user?.id) gamificationService.addXp(user.id, 10, 'chat');
            });

            // AI Director Controls
            socket.on('director:voice_activity', (data: { level: number }) => {
                if (user?.id) autoDirectorService.handleVoiceActivity(user.id, data.level);
            });

            socket.on('director:toggle_mode', (data: { enabled: boolean }) => {
                if (user?.id) autoDirectorService.toggleDirector(data.enabled);
            });

            // Economy
            socket.on('economy:purchase_item', async (data: { itemId: string }) => {
                if (user?.id) {
                    const result = await virtualEconomyService.purchaseItem(user.id, data.itemId);
                    if (!result.success) {
                        socket.emit('economy:error', { message: result.message });
                    } else {
                        const item = virtualEconomyService.getCatalog().find(i => i.id === data.itemId);
                        if (item) analyticsService.trackSpend(item.cost);
                        analyticsService.trackEvent('purchase', `User ${user.id} bought ${data.itemId}`, item?.cost);
                    }
                }
            });

            // --- 3. Guest Management ---
            socket.on('guest:join', (payload: { displayName: string, streamId?: string }) => {
                if (roomId && user?.role === 'guest') {
                    socket.to(roomId).emit('guest:request', {
                        id: socket.id,
                        userId: user.id,
                        name: payload.displayName,
                        streamId: payload.streamId || `guest_${socket.id}`,
                        joinedAt: new Date()
                    });
                }
            });

            socket.on('guest:approve', (payload: { guestId: string, permissions: any }) => {
                if (roomId && user?.role === 'host' && this.io) {
                    this.io.to(payload.guestId).emit('guest:approved', {
                        roomId,
                        hostId: socket.id,
                        permissions: payload.permissions
                    });
                }
            });

            socket.on('guest:reject', (payload: { guestId: string }) => {
                if (roomId && user?.role === 'host' && this.io) {
                    this.io.to(payload.guestId).emit('guest:rejected');
                }
            });

            socket.on('guest:control', (payload: { guestId: string, action: string, value: any }) => {
                if (roomId && user?.role === 'host' && this.io) {
                    this.io.to(payload.guestId).emit('guest:control', {
                        action: payload.action,
                        value: payload.value
                    });
                }
            });

            socket.on('guest:signal', (payload: { to: string, signal: any }) => {
                if (this.io) {
                    this.io.to(payload.to).emit('guest:signal', {
                        from: socket.id,
                        signal: payload.signal
                    });
                }
            });

            // --- 4. Mobile Collaboration & Updates ---
            socket.on('cursor:move', (data: { timestamp: number, trackId?: string }) => {
                if (roomId && user) {
                    socket.to(roomId).emit('cursor:move', {
                        userId: user.id,
                        position: {
                            userId: user.id,
                            timestamp: data.timestamp,
                            trackId: data.trackId
                        }
                    });
                }
            });

            socket.on('comment:add', (data: { content: string, timestamp: number }) => {
                if (roomId && user && this.io) {
                    const comment = {
                        id: Date.now().toString(),
                        userId: user.id,
                        userName: user.name,
                        content: data.content,
                        timestamp: data.timestamp,
                        createdAt: new Date().toISOString()
                    };
                    this.io.to(roomId).emit('comment:new', comment);
                }
            });

            socket.on('project:update', (data: { action: string, data: any }) => {
                if (roomId && user) {
                    socket.to(roomId).emit('project:update', {
                        userId: user.id,
                        action: data.action,
                        data: data.data
                    });
                }
            });

            // Lifecycle
            socket.on('disconnect', () => {
                if (user?.id) {
                    console.log(`❌ [SocketServer] User disconnected: ${user.name} (${socket.id})`);
                    
                    // Tracking cleanup
                    const userSocketSet = this.userSockets.get(user.id);
                    if (userSocketSet) {
                        userSocketSet.delete(socket.id);
                        if (userSocketSet.size === 0) this.userSockets.delete(user.id);
                    }

                    if (roomId) {
                        this.io?.to(roomId).emit('guest:leave', { guestId: socket.id });
                        setTimeout(() => this.broadcastRoomUsers(roomId), 1000);
                    }
                }
            });
        });
    }

    /**
     * Broadcasts the list of active users in a room
     */
    private async broadcastRoomUsers(roomId: string) {
        if (!this.io) return;
        try {
            const sockets = await this.io.in(roomId).fetchSockets();
            const users = sockets.map(s => s.data.user).filter(u => u);
            const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
            this.io.to(roomId).emit('users:update', uniqueUsers);
        } catch (error) {
            console.error('[SocketServer] Error broadcasting room users:', error);
        }
    }

    /** Utility methods for external services **/

    public emitToUser(userId: string, event: string, data: any) {
        if (!this.io) return;
        this.io.to(`user:${userId}`).emit(event, data);
    }

    public emitToAll(event: string, data: any) {
        if (!this.io) return;
        this.io.emit(event, data);
    }

    public emitProjectUpdate(userId: string, projectId: string, update: any) {
        this.emitToUser(userId, 'project:updated', {
            projectId,
            ...update,
            timestamp: new Date().toISOString()
        });
    }

    public emitJobCompleted(userId: string, jobId: string, result: any) {
        this.emitToUser(userId, 'job:completed', {
            jobId,
            result,
            timestamp: new Date().toISOString()
        });
    }

    public emitNotification(userId: string, notification: any) {
        this.emitToUser(userId, 'notification:new', {
            ...notification,
            timestamp: new Date().toISOString()
        });
    }

    public getConnectedUsers(): string[] {
        return Array.from(this.userSockets.keys());
    }

    public isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId);
    }

    public getIO() {
        return this.io;
    }

    /** Internal service listeners & workers **/

    private setupServiceListeners() {
        if (!this.io) return;

        // Auto-Director Cut Handover
        autoDirectorService.on('cut', (payload) => {
            this.io?.emit('director:cut', payload);
        });

        // Gemini Live & Quests
        geminiLiveService.on('audio:chunk', (data) => this.io?.to(data.sessionId).emit('ai:audio', data));
        geminiLiveService.on('text:response', (data) => this.io?.to(data.sessionId).emit('ai:text', data));
        geminiLiveService.on('user:transcript', (data) => this.io?.to(data.sessionId).emit('ai:user_transcript', data));
        geminiLiveService.on('tool:call', (data) => this.io?.to(data.sessionId).emit('ai:tool_call', data));
        geminiLiveService.on('quest:created', (data) => this.io?.to(data.sessionId).emit('quest:created', data.quest));
        geminiLiveService.on('quest:updated', (data) => this.io?.to(data.sessionId).emit('quest:updated', data));
        geminiLiveService.on('quest:evaluated', (data) => this.io?.to(data.sessionId).emit('quest:evaluated', data));
        geminiLiveService.on('quest:floor_assigned', (data) => this.io?.to(data.sessionId).emit('quest:floor_assigned', data));
        geminiLiveService.on('swarm:message', (data) => this.io?.to(data.sessionId).emit('ai:swarm_message', data));
        geminiLiveService.on('session:interrupted', (data) => this.io?.to(data.sessionId).emit('ai:interrupted', data));
        geminiLiveService.on('session:error', (data) => this.io?.to(data.sessionId).emit('ai:error', data));
    }

    private startChatSyncWorker() {
        setInterval(async () => {
            if (!this.io) return;
            try {
                const activeSessions = await StreamSessionModel.find({
                    status: 'live',
                    'targets.externalChatId': { $exists: true, $ne: null }
                });

                for (const session of activeSessions) {
                    for (const target of session.targets) {
                        if (!target.externalChatId) continue;
                        const account = await UserPlatformAccount.findById(target.accountId);
                        if (!account) continue;

                        try {
                            const credentials = await PlatformAuthService.getValidCredentials(account);
                            const messages = await PlatformAuthService.getLiveChatMessages(
                                account.platform as any,
                                credentials,
                                target.externalChatId
                            );

                            if (messages.length > 0) {
                                this.io.to(session.sessionId).emit('chat:external', {
                                    sessionId: session.sessionId,
                                    platform: account.platform,
                                    messages
                                });
                            }
                        } catch (err: any) {
                            console.error(`[ChatSync] Worker error for ${account.platform}:`, err.message);
                        }
                    }
                }
            } catch (error) {
                console.error('[ChatSync] Global worker error:', error);
            }
        }, 8000);
    }
}

export const socketServer = new SocketServer();
