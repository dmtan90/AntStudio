import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { BinaryStreamService } from './BinaryStreamService.js';

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
    }

    /**
     * Middleware to authenticate socket connections with JWT.
     */
    private setupAuthentication() {
        this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
            const token = socket.handshake.auth.token;
            const roomId = socket.handshake.auth.roomId;

            if (!token || !roomId) {
                return next(new Error('Authentication failed: Missing token or roomId'));
            }

            try {
                const decoded = verifyToken(token);
                if (!decoded) return next(new Error('Invalid token'));

                const user = await User.findById(decoded.userId);
                if (!user) return next(new Error('User not found'));

                // Attach user and room info to socket
                socket.data.user = { id: user._id.toString(), name: user.name };
                socket.data.roomId = roomId;

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
            const { roomId } = socket.data;
            const { name, id } = socket.data.user;

            console.log(`👤 User ${name} joined Studio Room: ${roomId}`);
            socket.join(roomId);

            // 1. Layer Property Sync
            socket.on('layer:update', (payload: { id: string, props: any }) => {
                // Broadcast to everyone else in the room
                socket.to(roomId).emit('layer:update', payload);
            });

            // 2. Selection Sync
            socket.on('layer:select', (payload: { id: string }) => {
                socket.to(roomId).emit('layer:select', {
                    id: payload.id,
                    userId: id,
                    userName: name
                });
            });

            socket.on('studio:state', (state: any) => {
                socket.to(roomId).emit('studio:state', state);
            });

            // 4. Low-Latency Neural Streaming
            socket.on('neural:stream', (payload: { type: 'audio' | 'video' | 'meta', chunk: any }) => {
                BinaryStreamService.streamChunk(this.io, roomId, payload.type, payload.chunk);
            });

            // 5. Neural Handover (Assembly)
            socket.on('neural:handover', async (payload: any) => {
                await BinaryStreamService.handleNeuralHandover(socket, payload);
            });

            socket.on('disconnect', () => {
                console.log(`👤 User ${name} left Studio Room: ${roomId}`);
            });
        });
    }
}
