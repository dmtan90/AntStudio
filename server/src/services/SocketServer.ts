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
import { Logger } from '../utils/Logger.js';

const SOCKET_PORT = process.env.SOCKET_PORT || 4001;

/**
 * Unified Socket.io Server Manager for collaboration, gaming, and engagement.
 * Merged from legacy SocketService and SocketServer.
 */
export class SocketServer {
    private io: Server | null = null;
    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs
    private disconnectGracePeriods: Map<string, NodeJS.Timeout> = new Map();
    private chatPageTokens: Map<string, string> = new Map(); // targetId -> nextPageToken
    private chatNextPollTimes: Map<string, number> = new Map(); // tokenKey -> nextAllowedTimestamp
    private chatSyncInterval: NodeJS.Timeout | null = null; // Track chat sync interval
    private engagementSyncInterval: NodeJS.Timeout | null = null; // Track engagement sync interval


    constructor() {
        // Singleton pattern: initialization happens via .initialize(server)
    }

    /**
     * Initializes the Socket.io server with the given HTTP server.
     */
    public initialize(httpServer: HTTPServer) {
        if (this.io) {
            Logger.warn('⚠️ [SocketServer] Already initialized', 'SocketServer');
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
		this.io.listen(Number(SOCKET_PORT));

        this.setupAuthentication();
        this.setupHandlers();
        this.setupServiceListeners();
        // Chat and engagement sync workers will be started on-demand when sessions go live

        Logger.info(`🚀 [SocketServer] Unified Socket.io running at /socket.io port ${SOCKET_PORT}`);
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

                        // Phase 90: Clear any pending disconnect grace period
                        if (this.disconnectGracePeriods.has(userId)) {
                            Logger.info(`♻️ [SocketServer] Host ${user.name} resumed before grace period expiry.`, 'SocketServer');
                            clearTimeout(this.disconnectGracePeriods.get(userId)!);
                            this.disconnectGracePeriods.delete(userId);
                        }

                        return next();
                    }
                }

                // 2. Try Guest Token Auth (for Anonymous Guests)
                const guestInfo = await streamingService.validateGuestToken(token as string);
                if (guestInfo) {
                    const { sessionId } = guestInfo;
                    const displayName = socket.handshake.auth.displayName || 'Guest';
                    const persistentGuestId = socket.handshake.auth.persistentGuestId;

                    socket.data.user = {
                        id: persistentGuestId ? `guest_${persistentGuestId}` : `guest_${socket.id}`,
                        name: displayName,
                        role: 'guest',
                        isAnonymous: true
                    };
                    socket.data.roomId = sessionId;
                    socket.join(sessionId);
                    socket.join(`user:${socket.data.user.id}`);

                    // Phase 90: Clear any pending disconnect grace period
                    if (this.disconnectGracePeriods.has(socket.data.user.id)) {
                        Logger.info(`♻️ [SocketServer] Guest ${displayName} resumed before grace period expiry.`, 'SocketServer');
                        clearTimeout(this.disconnectGracePeriods.get(socket.data.user.id)!);
                        this.disconnectGracePeriods.delete(socket.data.user.id);
                    }

                    Logger.info(`📡 [SocketServer] Anonymous Guest "${displayName}" joined Room: ${sessionId}`, 'SocketServer');
                    return next();
                }

                return next(new Error('Authentication error: Invalid token'));
            } catch (err: any) {
                Logger.error('❌ [SocketServer] Auth error:', 'SocketServer', err);
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
            Logger.info(`🔌 [SocketServer] New connection: ${socket.id} (${transportName})`, 'SocketServer');

            socket.conn.on('upgrade', () => {
                Logger.info(`🚀 [SocketServer] Upgraded to ${socket.conn.transport.name} for ${socket.id}`, 'SocketServer');
            });

            const roomId = socket.data.roomId;
            const user = socket.data.user;

            if (roomId && user) {
                Logger.info(`👤 User ${user.name} joined Room: ${roomId} with ID: ${user.id}`, 'SocketServer');
                
                // Phase 90: Clear any pending disconnect grace period (redundant but safe)
                if (this.disconnectGracePeriods.has(user.id)) {
                    clearTimeout(this.disconnectGracePeriods.get(user.id)!);
                    this.disconnectGracePeriods.delete(user.id);
                }

                // Notify client of their stabilized identity
                socket.emit('session:connected', { 
                    userId: user.id,
                    role: user.role,
                    name: user.name
                });

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

            socket.on('ping_heartbeat', (data: any, callback: Function) => {
                if (typeof callback === 'function') callback();
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
                        id: user.id, // Phase 90: Use stabilized user.id
                        userId: user.id,
                        name: payload.displayName,
                        streamId: payload.streamId || `guest_${user.id}`,
                        joinedAt: new Date()
                    });
                }
            });

            socket.on('guest:approve', (payload: { guestId: string, permissions: any }) => {
                if (roomId && user?.role === 'host' && this.io) {
                    this.io.to(`user:${payload.guestId}`).emit('guest:approved', {
                        roomId,
                        hostId: socket.id,
                        permissions: payload.permissions
                    });
                }
            });

            socket.on('guest:reject', (payload: { guestId: string }) => {
                if (roomId && user?.role === 'host' && this.io) {
                    this.io.to(`user:${payload.guestId}`).emit('guest:rejected');
                }
            });

            socket.on('guest:control', (payload: { guestId: string, action: string, value: any }) => {
                if (roomId && user?.role === 'host' && this.io) {
                    this.io.to(`user:${payload.guestId}`).emit('guest:control', {
                        action: payload.action,
                        value: payload.value
                    });
                }
            });

            socket.on('ping_heartbeat', (data, callback) => {
                if (typeof callback === 'function') callback({ success: true });
            });

            socket.on('guest:signal', (payload: { to: string, signal: any }) => {
                if (this.io && user) {
                    // Phase 90: Use stabilized user.id instead of socket.id
                    // Note: 'to' can be either a socket.id or a user.id room
                    const target = payload.to.startsWith('guest_') || payload.to.length > 20 ? `user:${payload.to}` : payload.to;
                    this.io.to(target).emit('guest:signal', {
                        from: user.id,
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
            socket.on('disconnect', (reason) => {
                if (user?.id) {
                    Logger.info(`❌ [SocketServer] User disconnected: ${user.name} (${socket.id}). Reason: ${reason}`, 'SocketServer');
                    
                    // Tracking cleanup
                    const userSocketSet = this.userSockets.get(user.id);
                    if (userSocketSet) {
                        userSocketSet.delete(socket.id);
                        if (userSocketSet.size === 0) this.userSockets.delete(user.id);
                    }

                    if (roomId) {
                        // Phase 90: Implement 60s grace period for reconnection
                        // Only start grace period if NO other sockets for this user are connected
                        const isFullyDisconnected = !this.userSockets.has(user.id);
                        
                        if (isFullyDisconnected) {
                            Logger.info(`⏳ [SocketServer] Starting 60s grace period for user ${user.name} (${user.id})`, 'SocketServer');
                            const timer = setTimeout(() => {
                                Logger.info(`💀 [SocketServer] Grace period expired for user ${user.name}. Cleaning up...`, 'SocketServer');
                                this.io?.to(roomId).emit('guest:leave', { guestId: user.id });
                                this.broadcastRoomUsers(roomId);
                                this.disconnectGracePeriods.delete(user.id);
                            }, 60000); // 60 seconds
                            
                            this.disconnectGracePeriods.set(user.id, timer);
                        } else {
                            Logger.info(`ℹ️ [SocketServer] User ${user.name} still has other active sockets. Skipping grace period.`, 'SocketServer');
                            this.broadcastRoomUsers(roomId);
                        }
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
        } catch (error: any) {
            Logger.error('[SocketServer] Error broadcasting room users:', 'SocketServer', error);
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

    /**
     * Starts the chat sync worker if not already running.
     * Only polls when there are active live sessions.
     */
    private startChatSyncWorker() {
        // Prevent multiple intervals
        if (this.chatSyncInterval) {
            Logger.debug('[ChatSync] Worker already running', 'SocketServer');
            return;
        }

        Logger.info('[ChatSync] Starting chat sync worker', 'SocketServer');
        this.chatSyncInterval = setInterval(async () => {
            if (!this.io) return;
            try {
                const activeSessions = await StreamSessionModel.find({
                    status: 'live',
                    'targets.externalChatId': { $exists: true, $ne: null }
                });

                // If no active sessions, stop the worker
                if (activeSessions.length === 0) {
                    Logger.info('[ChatSync] No active sessions, stopping worker', 'SocketServer');
                    this.stopChatSyncWorker();
                    return;
                }

                for (const session of activeSessions) {
                    for (const target of session.targets) {
                        if (!target.externalChatId) continue;
                        const account = await UserPlatformAccount.findById(target.accountId);
                        if (!account) continue;

                        try {
                            const tokenKey = `${session.sessionId}:${target.accountId}`;
                            
                            // Quota Protection: Check if we are allowed to poll yet
                            const now = Date.now();
                            const nextAllowed = this.chatNextPollTimes.get(tokenKey) || 0;
                            if (now < nextAllowed) continue;

                            const credentials = await PlatformAuthService.getValidCredentials(account);
                            const currentPageToken = this.chatPageTokens.get(tokenKey);

                            const { messages, nextPageToken, isOffline, pollingIntervalMillis } = await PlatformAuthService.getLiveChatMessages(
                                account.platform as any,
                                credentials,
                                target.externalChatId,
                                currentPageToken
                            );

                            // Set next allowed poll time (Default to 15s for YouTube if not provided, 8s for others)
                            const defaultDelay = account.platform === 'youtube' ? 15000 : 8000;
                            const delay = pollingIntervalMillis || defaultDelay;
                            this.chatNextPollTimes.set(tokenKey, now + delay);

                            // Detect Offline/Stale Chat for YouTube
                            if (account.platform === 'youtube' && (isOffline || (messages.length === 0 && !nextPageToken))) {
                                Logger.info(`[ChatSync] Refreshing YouTube chat ID for session ${session.sessionId}`, 'SocketServer');
                                try {
                                    const project = await (await import('../models/Project.js')).Project.findById((session as any).projectId);
                                    const liveInfo = await PlatformAuthService.getLiveStreamInfo(
                                        'youtube' as any,
                                        credentials,
                                        { title: project?.title || 'AntStudio Live', description: project?.description || '' }
                                    );
                                    if (liveInfo.externalChatId && liveInfo.externalChatId !== target.externalChatId) {
                                        Logger.info(`[ChatSync] Found NEW YouTube Chat ID: ${liveInfo.externalChatId}`, 'SocketServer');
                                        target.externalChatId = liveInfo.externalChatId;
                                        // Clear token for new ID
                                        this.chatPageTokens.delete(tokenKey);
                                        // Persist to DB
                                        await StreamSessionModel.updateOne(
                                            { _id: session._id, 'targets.accountId': target.accountId },
                                            { $set: { 'targets.$.externalChatId': liveInfo.externalChatId } }
                                        );
                                    }
                                } catch (refreshErr: any) {
                                    Logger.warn(`[ChatSync] Failed to refresh YouTube chat ID: ${refreshErr.message}`, 'SocketServer');
                                }
                            }

                            if (nextPageToken) {
                                this.chatPageTokens.set(tokenKey, nextPageToken);
                            }

                            if (messages.length > 0) {
                                this.io.to(session.sessionId).emit('chat:external', {
                                    platform: account.platform,
                                    messages
                                });
                            }
                        } catch (err: any) {
                            Logger.error(`[ChatSync] Error fetching chat for ${target.platform}: ${err.message}`, 'SocketServer', err);
                        }
                    }
                }
            } catch (error: any) {
                Logger.error('[ChatSync] Global worker error:', 'SocketServer', error);
            }
        }, 8000);
    }

    /**
     * Stops the chat sync worker.
     */
    private stopChatSyncWorker() {
        if (this.chatSyncInterval) {
            clearInterval(this.chatSyncInterval);
            this.chatSyncInterval = null;
            Logger.info('[ChatSync] Chat sync worker stopped', 'SocketServer');
        }
    }

    /**
     * Periodically fetches engagement metrics (likes, shares, external viewers) from platforms.
     */
    private startEngagementSyncWorker() {
        // Prevent multiple intervals
        if (this.engagementSyncInterval) {
            Logger.debug('[EngagementSync] Worker already running', 'SocketServer');
            return;
        }

        Logger.info('[EngagementSync] Starting engagement sync worker', 'SocketServer');
        this.engagementSyncInterval = setInterval(async () => {
            try {
                const liveSessions = await StreamSessionModel.find({ status: 'live' });
                
                // If no active sessions, stop the worker
                if (liveSessions.length === 0) {
                    Logger.info('[EngagementSync] No active sessions, stopping worker', 'SocketServer');
                    this.stopEngagementSyncWorker();
                    return;
                }

                for (const session of liveSessions) {
                    const roomEngagement = {
                        likes: 0,
                        shares: 0,
                        externalViewers: 0,
                        comments: 0
                    };

                    let hasExternalStats = false;

                    for (const target of session.targets) {
                        if (target.externalId && (target.platform === 'youtube' || target.platform === 'facebook' || target.platform === 'tiktok')) {
                            try {
                                const account = await UserPlatformAccount.findById(target.accountId);
                                if (!account) continue;

                                const credentials = await PlatformAuthService.getValidCredentials(account);
                                const stats = await PlatformAuthService.getVideoStats(target.platform, credentials, target.externalId);

                                if (stats) {
                                    roomEngagement.likes += (stats.likes || 0);
                                    roomEngagement.shares += (stats.shares || 0);
                                    roomEngagement.externalViewers += (stats.views || 0); // Note: views might be total, not CCU for some platforms
                                    roomEngagement.comments += (stats.comments || 0);
                                    hasExternalStats = true;
                                }
                            } catch (err: any) {
                                Logger.warn(`[EngagementSync] Failed to fetch stats for ${target.platform}: ${err.message}`, 'SocketServer');
                            }
                        }
                    }

                    if (hasExternalStats && this.io) {
                        // Broadcast aggregated engagement to the studio room
                        this.io?.to(session.sessionId).emit('studio:engagement', {
                            sessionId: session.sessionId,
                            ...roomEngagement,
                            timestamp: Date.now()
                        });
                        
                        // Also update analytics service
                        analyticsService.trackEvent('levelup' as any, `Platform Engagement Sync: ${roomEngagement.likes} likes`);
                    }
                }
            } catch (error: any) {
                Logger.error(`[EngagementSync] Worker error: ${error.message}`, 'SocketServer');
            }
        }, 60000); // Poll every 60 seconds
    }

    /**
     * Stops the engagement sync worker.
     */
    private stopEngagementSyncWorker() {
        if (this.engagementSyncInterval) {
            clearInterval(this.engagementSyncInterval);
            this.engagementSyncInterval = null;
            Logger.info('[EngagementSync] Engagement sync worker stopped', 'SocketServer');
        }
    }

    /**
     * Public method to ensure sync workers are running.
     * Called when a session goes live.
     */
    public ensureSyncWorkersRunning() {
        this.startChatSyncWorker();
        this.startEngagementSyncWorker();
    }
}

export const socketServer = new SocketServer();
