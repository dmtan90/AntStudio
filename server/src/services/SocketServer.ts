import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { BinaryStreamService } from './BinaryStreamService.js';
import { streamingService } from './StreamingService.js';

/**
 * Socket.io Server Manager for real-time collaboration.
 */
export class SocketServer {
    private io: Server;

    constructor(httpServer: any) {
        this.io = new Server(httpServer, {
            path: '/api/socket.io',
            cors: {
                origin: '*', // Adjust based on production needs
                methods: ['GET', 'POST']
            }
        });

        this.setupAuthentication();
        this.setupHandlers();
        this.setupServiceListeners();
    }

    /**
     * Middleware to authenticate socket connections with JWT.
     */
    private setupAuthentication() {
        this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            // Mobile app sends projectId in query, web might send roomId in auth
            const roomId = socket.handshake.auth.roomId || socket.handshake.query.projectId || socket.handshake.query.roomId;

            if (!token) {
                return next(new Error('Authentication failed: Missing token'));
            }

            try {
                const decoded = verifyToken(token as string);
                if (!decoded) return next(new Error('Invalid token'));

                const user = await User.findById(decoded.userId);
                if (!user) return next(new Error('User not found'));

                // Attach user and room info to socket
                socket.data.user = {
                    id: user._id.toString(),
                    name: user.name,
                    avatar: user.avatar, // Add avatar if available
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random color for cursor
                };

                // If roomId/projectId is present, join that room immediately
                if (roomId) {
                    socket.data.roomId = roomId;
                    socket.join(roomId);
                }

                // Join user's personal room for mobile notifications
                socket.join(`user:${user._id.toString()}`);

                next();
            } catch (err) {
                next(new Error('Authentication error'));
            }
        });
    }

    /**
     * Setups event handlers for collaborative actions.
     */
    private setupHandlers() {
        this.io.on('connection', (socket: Socket) => {
            const roomId = socket.data.roomId;
            const user = socket.data.user;

            if (roomId) {
                console.log(`👤 User ${user.name} joined Room: ${roomId}`);

                // Notify others in the room
                this.broadcastRoomUsers(roomId);
            }

            // 1. Layer Property Sync
            socket.on('layer:update', (payload: { id: string, props: any }) => {
                if (roomId) socket.to(roomId).emit('layer:update', payload);
            });

            // 2. Selection Sync
            socket.on('layer:select', (payload: { id: string }) => {
                if (roomId) {
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

            // 4. Low-Latency Neural Streaming
            socket.on('neural:stream', (payload: { type: 'audio' | 'video' | 'meta', chunk: any }) => {
                if (roomId) BinaryStreamService.streamChunk(this.io, roomId, payload.type, payload.chunk);
            });

            // 5. Global WebRTC Ingest Relay (AMS Fallback)
            socket.on('stream:relay', (payload: { sessionId: string, chunk: Buffer }) => {
                streamingService.ingestRelayChunk(payload.sessionId, payload.chunk);
            });

            // 6. Neural Handover (Assembly)
            socket.on('neural:handover', async (payload: any) => {
                await BinaryStreamService.handleNeuralHandover(socket, payload);
            });

            // --- Mobile Collaboration Events ---

            // Cursor Movement
            socket.on('cursor:move', (data: { timestamp: number, trackId?: string }) => {
                if (roomId) {
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

            // Comments
            socket.on('comment:add', (data: { text: string, timestamp: number }) => {
                if (roomId) {
                    const comment = {
                        id: Date.now().toString(), // Simple ID generation
                        userId: user.id,
                        userName: user.name,
                        text: data.text,
                        timestamp: data.timestamp,
                        createdAt: new Date().toISOString()
                    };

                    // Broadcast to everyone INCLUDING sender (so they see their own comment confirmed)
                    this.io.to(roomId).emit('comment:new', comment);
                }
            });

            // Project Updates
            socket.on('project:update', (data: { action: string, data: any }) => {
                if (roomId) {
                    socket.to(roomId).emit('project:update', {
                        userId: user.id,
                        action: data.action,
                        data: data.data
                    });
                }
            });

            socket.on('disconnect', () => {
                if (roomId) {
                    console.log(`👤 User ${user.name} left Room: ${roomId}`);
                    // Notify others
                    setTimeout(() => this.broadcastRoomUsers(roomId), 1000);
                }
            });
        });
    }

    /**
     * Broadcasts the list of active users in a room
     */
    private async broadcastRoomUsers(roomId: string) {
        try {
            const sockets = await this.io.in(roomId).fetchSockets();
            const users = sockets.map(s => s.data.user).filter(u => u);

            // Deduplicate users (in case same user has multiple connections)
            const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());

            this.io.to(roomId).emit('users:update', uniqueUsers);
        } catch (error) {
            console.error('Error broadcasting room users:', error);
        }
    }

    /**
     * Emit project update to specific user (for mobile app)
     */
    emitProjectUpdate(userId: string, projectId: string, update: any) {
        this.io.to(`user:${userId}`).emit('project:updated', {
            projectId,
            ...update,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Emit job completion to specific user (for mobile app)
     */
    emitJobCompleted(userId: string, jobId: string, result: any) {
        this.io.to(`user:${userId}`).emit('job:completed', {
            jobId,
            result,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Listen to internal service events and broadcast to sockets
     */
    private setupServiceListeners() {
        streamingService.on('session:stopped', (data: { sessionId: string, reason: string, status: string }) => {
            // We need to find the user/room associated with this session?
            // Currently session doesn't store room ID, but we can emit to the user directly
            const session = streamingService.getSessionStatus(data.sessionId);
            if (session) {
                // If we knew the room, we could emit to room
                // For now, emit to user's personal channel
                this.io.to(`user:${session.userId}`).emit('stream:status', {
                    sessionId: data.sessionId,
                    status: data.status,
                    error: data.reason
                });
            }
        });
    }

    /**
     * Emit notification to specific user (for mobile app)
     */
    emitNotification(userId: string, notification: any) {
        this.io.to(`user:${userId}`).emit('notification:new', {
            ...notification,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get Socket.IO instance for external use
     */
    getIO() {
        return this.io;
    }
}
