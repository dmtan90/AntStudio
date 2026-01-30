import io, { Socket } from 'socket.io-client';
import { create } from 'zustand';
import { authStorage } from '../api/authStorage';
import { SOCKET_URL } from '../config';

interface User {
    id: string;
    name: string;
    avatar?: string;
    color?: string;
}

interface CursorPosition {
    userId: string;
    timestamp: number; // Timeline position in seconds
    trackId?: string;
}

interface Comment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
    createdAt: string;
}

interface CollaborationState {
    isConnected: boolean;
    activeUsers: User[];
    cursors: Record<string, CursorPosition>; // userId -> position
    comments: Comment[];
    setConnected: (connected: boolean) => void;
    setUsers: (users: User[]) => void;
    updateCursor: (userId: string, position: CursorPosition) => void;
    addComment: (comment: Comment) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
    isConnected: false,
    activeUsers: [],
    cursors: {},
    comments: [],
    setConnected: (isConnected) => set({ isConnected }),
    setUsers: (activeUsers) => set({ activeUsers }),
    updateCursor: (userId, position) =>
        set((state) => ({
            cursors: { ...state.cursors, [userId]: position },
        })),
    addComment: (comment) =>
        set((state) => ({
            comments: [...state.comments, comment],
        })),
}));

class CollaborationService {
    private socket: Socket | null = null;
    private projectId: string | null = null;

    async connect(projectId: string) {
        if (this.socket?.connected && this.projectId === projectId) return;

        this.disconnect();
        this.projectId = projectId;

        const token = await authStorage.getToken();

        if (!token) {
            console.error('Cannot connect to collaboration: No token');
            return;
        }

        this.socket = io(SOCKET_URL, {
            path: '/api/socket.io',
            auth: { token },
            query: { projectId },
            transports: ['websocket'],
        });

        this.setupListeners();
    }

    private setupListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to collaboration server');
            useCollaborationStore.getState().setConnected(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from collaboration server');
            useCollaborationStore.getState().setConnected(false);
        });

        this.socket.on('users:update', (users: User[]) => {
            useCollaborationStore.getState().setUsers(users);
        });

        this.socket.on('cursor:move', (data: { userId: string; position: CursorPosition }) => {
            useCollaborationStore.getState().updateCursor(data.userId, data.position);
        });

        this.socket.on('comment:new', (comment: Comment) => {
            useCollaborationStore.getState().addComment(comment);
        });

        // Handle project updates (OT/Conflict resolution would go here)
        this.socket.on('project:update', (data: any) => {
            console.log('Project updated remotely:', data);
            // In a real app, apply these changes to the editor store
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.projectId = null;
        useCollaborationStore.getState().setConnected(false);
        useCollaborationStore.getState().setUsers([]);
    }

    sendCursorMove(position: number, trackId?: string) {
        if (this.socket?.connected) {
            this.socket.emit('cursor:move', { timestamp: position, trackId });
        }
    }

    sendComment(text: string, timestamp: number) {
        if (this.socket?.connected) {
            this.socket.emit('comment:add', { text, timestamp });
        }
    }

    sendProjectUpdate(action: string, data: any) {
        if (this.socket?.connected) {
            this.socket.emit('project:update', { action, data });
        }
    }
}

export const collaborationService = new CollaborationService();
