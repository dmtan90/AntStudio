import { io, Socket } from 'socket.io-client';
import { authStorage } from './authStorage';

const SOCKET_URL = 'http://10.0.2.2:4000'; // Android emulator localhost

class SocketClient {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    async connect() {
        const token = await authStorage.getToken();
        if (!token) {
            console.warn('No token available for socket connection');
            return;
        }

        this.socket = io(SOCKET_URL, {
            path: '/api/socket.io',
            auth: { token },
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private setupEventListeners() {
        if (!this.socket) return;

        // Project updates
        this.socket.on('project:updated', (data) => {
            this.emit('project:updated', data);
        });

        // Job completions
        this.socket.on('job:completed', (data) => {
            this.emit('job:completed', data);
        });

        // Notifications
        this.socket.on('notification:new', (data) => {
            this.emit('notification:new', data);
        });
    }

    // Subscribe to events
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    // Unsubscribe from events
    off(event: string, callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    // Emit to local listeners
    private emit(event: string, data: any) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(data));
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketClient = new SocketClient();
