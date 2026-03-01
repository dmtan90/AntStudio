import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

import { Logger } from '../utils/Logger.js';

interface UserPresence {
    userId: string;
    userName: string;
    avatar?: string;
    cursor?: { x: number; y: number };
    activeSegment?: string;
    lastActivity: Date;
}

export class CollaborationService {
    private io!: SocketServer;
    private projectRooms = new Map<string, Map<string, UserPresence>>();

    initialize(io: SocketServer) {
        this.io = io;

        // Create a separate namespace for collaboration
        const collaborationNamespace = this.io.of('/collaboration');

        collaborationNamespace.use(this.authenticateSocket.bind(this));
        collaborationNamespace.on('connection', this.handleConnection.bind(this));
    }

    private async authenticateSocket(socket: Socket, next: any) {
        const token = socket.handshake.auth.token;
        try {
            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Invalid token'));
            }
            socket.data.userId = decoded.userId;
            socket.data.userName = (decoded as any).name || (decoded as any).email;
            socket.data.avatar = (decoded as any).avatar;
            next();
        } catch (e) {
            next(new Error('Authentication failed'));
        }
    }

    private handleConnection(socket: Socket) {
        Logger.info(`✅ Collaboration: User ${socket.data.userName} connected`);

        // Join project room
        socket.on('project:join', (projectId: string) => {
            this.joinProject(socket, projectId);
        });

        // Leave project room
        socket.on('project:leave', (projectId: string) => {
            this.leaveProject(socket, projectId);
        });

        // Broadcast project edits
        socket.on('project:edit', (data: { projectId: string; changes: any }) => {
            this.broadcastEdit(socket, data);
        });

        // Cursor movement
        socket.on('cursor:move', (data: { projectId: string; x: number; y: number }) => {
            this.broadcastCursor(socket, data);
        });

        // Active segment tracking
        socket.on('segment:focus', (data: { projectId: string; segmentId: string }) => {
            this.updateActiveSegment(socket, data);
        });

        // Typing indicator for comments
        socket.on('comment:typing', (data: { projectId: string; isTyping: boolean }) => {
            socket.to(`project:${data.projectId}`).emit('user:typing', {
                userId: socket.data.userId,
                userName: socket.data.userName,
                isTyping: data.isTyping
            });
        });

        // Disconnect
        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });
    }

    private joinProject(socket: Socket, projectId: string) {
        socket.join(`project:${projectId}`);

        if (!this.projectRooms.has(projectId)) {
            this.projectRooms.set(projectId, new Map());
        }

        const presence: UserPresence = {
            userId: socket.data.userId,
            userName: socket.data.userName,
            avatar: socket.data.avatar,
            lastActivity: new Date()
        };

        this.projectRooms.get(projectId)!.set(socket.id, presence);

        // Notify others
        socket.to(`project:${projectId}`).emit('user:joined', {
            userId: socket.data.userId,
            userName: socket.data.userName,
            avatar: socket.data.avatar,
            activeUsers: Array.from(this.projectRooms.get(projectId)!.values())
        });

        // Send current users to new joiner
        socket.emit('presence:sync', {
            activeUsers: Array.from(this.projectRooms.get(projectId)!.values())
        });

        Logger.info(`👥 ${socket.data.userName} joined project ${projectId}`);
    }

    private leaveProject(socket: Socket, projectId: string) {
        socket.leave(`project:${projectId}`);

        const room = this.projectRooms.get(projectId);
        if (room) {
            room.delete(socket.id);

            socket.to(`project:${projectId}`).emit('user:left', {
                userId: socket.data.userId,
                activeUsers: Array.from(room.values())
            });

            // Clean up empty rooms
            if (room.size === 0) {
                this.projectRooms.delete(projectId);
            }
        }

        Logger.info(`👋 ${socket.data.userName} left project ${projectId}`);
    }

    private broadcastEdit(socket: Socket, data: { projectId: string; changes: any }) {
        socket.to(`project:${data.projectId}`).emit('project:update', {
            userId: socket.data.userId,
            userName: socket.data.userName,
            changes: data.changes,
            timestamp: Date.now()
        });

        // Update last activity
        const room = this.projectRooms.get(data.projectId);
        if (room && room.has(socket.id)) {
            room.get(socket.id)!.lastActivity = new Date();
        }
    }

    private broadcastCursor(socket: Socket, data: { projectId: string; x: number; y: number }) {
        const room = this.projectRooms.get(data.projectId);
        if (room && room.has(socket.id)) {
            const presence = room.get(socket.id)!;
            presence.cursor = { x: data.x, y: data.y };
            presence.lastActivity = new Date();

            socket.to(`project:${data.projectId}`).emit('cursor:update', {
                userId: socket.data.userId,
                cursor: presence.cursor
            });
        }
    }

    private updateActiveSegment(socket: Socket, data: { projectId: string; segmentId: string }) {
        const room = this.projectRooms.get(data.projectId);
        if (room && room.has(socket.id)) {
            const presence = room.get(socket.id)!;
            presence.activeSegment = data.segmentId;
            presence.lastActivity = new Date();

            socket.to(`project:${data.projectId}`).emit('segment:focus', {
                userId: socket.data.userId,
                segmentId: data.segmentId
            });
        }
    }

    private handleDisconnect(socket: Socket) {
        // Clean up from all rooms
        this.projectRooms.forEach((room, projectId) => {
            if (room.has(socket.id)) {
                room.delete(socket.id);
                socket.to(`project:${projectId}`).emit('user:left', {
                    userId: socket.data.userId,
                    activeUsers: Array.from(room.values())
                });

                if (room.size === 0) {
                    this.projectRooms.delete(projectId);
                }
            }
        });

        Logger.info(`❌ Collaboration: User ${socket.data.userName} disconnected`);
    }

    // Admin method to get active users in a project
    getActiveUsers(projectId: string): UserPresence[] {
        const room = this.projectRooms.get(projectId);
        return room ? Array.from(room.values()) : [];
    }

    // Admin method to get all active projects
    getActiveProjects(): string[] {
        return Array.from(this.projectRooms.keys());
    }
}

export const collaborationService = new CollaborationService();
