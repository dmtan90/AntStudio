import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import config from '../utils/config.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userEmail?: string;
}

class SocketService {
    private io: SocketIOServer | null = null;
    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs

    initialize(httpServer: HTTPServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: '*', // Configure appropriately for production
                methods: ['GET', 'POST']
            }
        });

        // Authentication middleware
        this.io.use((socket: AuthenticatedSocket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            try {
                const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
                socket.userId = decoded.userId;
                socket.userEmail = decoded.email;
                next();
            } catch (error) {
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this.io.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);

            // Track user's sockets
            if (socket.userId) {
                if (!this.userSockets.has(socket.userId)) {
                    this.userSockets.set(socket.userId, new Set());
                }
                this.userSockets.get(socket.userId)!.add(socket.id);
            }

            // Join user's personal room
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
            }

            socket.on('disconnect', () => {
                console.log(`❌ Socket disconnected: ${socket.id}`);
                if (socket.userId) {
                    const userSocketSet = this.userSockets.get(socket.userId);
                    if (userSocketSet) {
                        userSocketSet.delete(socket.id);
                        if (userSocketSet.size === 0) {
                            this.userSockets.delete(socket.userId);
                        }
                    }
                }
            });
        });

        console.log('🔌 Socket.IO initialized');
    }

    // Emit to specific user (all their connected devices)
    emitToUser(userId: string, event: string, data: any) {
        if (!this.io) return;
        this.io.to(`user:${userId}`).emit(event, data);
    }

    // Emit to all connected clients
    emitToAll(event: string, data: any) {
        if (!this.io) return;
        this.io.emit(event, data);
    }

    // Project-specific events
    emitProjectUpdate(userId: string, projectId: string, update: any) {
        this.emitToUser(userId, 'project:updated', {
            projectId,
            ...update,
            timestamp: new Date().toISOString()
        });
    }

    emitJobCompleted(userId: string, jobId: string, result: any) {
        this.emitToUser(userId, 'job:completed', {
            jobId,
            result,
            timestamp: new Date().toISOString()
        });
    }

    emitNotification(userId: string, notification: any) {
        this.emitToUser(userId, 'notification:new', {
            ...notification,
            timestamp: new Date().toISOString()
        });
    }

    getConnectedUsers(): string[] {
        return Array.from(this.userSockets.keys());
    }

    isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId);
    }
}

export const socketService = new SocketService();
