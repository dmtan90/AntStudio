import { ref, onMounted, onUnmounted, watch } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/user';

interface UserPresence {
    userId: string;
    userName: string;
    avatar?: string;
    cursor?: { x: number; y: number };
    activeSegment?: string;
}

export function useCollaboration(projectId: string) {
    const socket = ref<Socket | null>(null);
    const activeUsers = ref<UserPresence[]>([]);
    const isConnected = ref(false);
    const authStore = useUserStore();

    const connect = () => {
        if (!authStore.token || !projectId) return;
        const endpoint = window.location.origin;
        console.log(`[useCollaboration] Connecting to ${endpoint} with path /socket.io`);
        socket.value = io(endpoint, {
			//allowEIO3: true, // Enables compatibility with Socket.IO v2 clients
            path: '/socket.io/collaboration',
            auth: { token: authStore.token },
            transports: ['websocket']
        });

        socket.value.on('connect', () => {
            console.log('✅ Connected to collaboration server');
            isConnected.value = true;
            socket.value!.emit('project:join', projectId);
        });

        socket.value.on('disconnect', () => {
            console.log('❌ Disconnected from collaboration server');
            isConnected.value = false;
            activeUsers.value = [];
        });

        socket.value.on('presence:sync', (data: { activeUsers: UserPresence[] }) => {
            activeUsers.value = data.activeUsers;
            console.log(`👥 ${data.activeUsers.length} users in project`);
        });

        socket.value.on('user:joined', (data: any) => {
            activeUsers.value = data.activeUsers;
            console.log(`👤 ${data.userName} joined`);
        });

        socket.value.on('user:left', (data: any) => {
            activeUsers.value = data.activeUsers;
            console.log(`👋 User left`);
        });

        socket.value.on('project:update', (data: any) => {
            console.log('📝 Project updated by:', data.userName);
            // Emit custom event for project to handle
            window.dispatchEvent(new CustomEvent('collaboration:project-update', {
                detail: data
            }));
        });

        socket.value.on('cursor:update', (data: { userId: string; cursor: { x: number; y: number } }) => {
            // Update cursor position for specific user
            const user = activeUsers.value.find(u => u.userId === data.userId);
            if (user) {
                user.cursor = data.cursor;
            }
        });

        socket.value.on('segment:focus', (data: { userId: string; segmentId: string }) => {
            // Update active segment for specific user
            const user = activeUsers.value.find(u => u.userId === data.userId);
            if (user) {
                user.activeSegment = data.segmentId;
            }
        });

        socket.value.on('user:typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
            window.dispatchEvent(new CustomEvent('collaboration:user-typing', {
                detail: data
            }));
        });
    };

    const disconnect = () => {
        if (socket.value) {
            socket.value.emit('project:leave', projectId);
            socket.value.disconnect();
            socket.value = null;
            isConnected.value = false;
            activeUsers.value = [];
        }
    };

    const broadcastEdit = (changes: any) => {
        if (!socket.value || !isConnected.value) return;
        socket.value.emit('project:edit', { projectId, changes });
    };

    const moveCursor = (x: number, y: number) => {
        if (!socket.value || !isConnected.value) return;
        socket.value.emit('cursor:move', { projectId, x, y });
    };

    const focusSegment = (segmentId: string) => {
        if (!socket.value || !isConnected.value) return;
        socket.value.emit('segment:focus', { projectId, segmentId });
    };

    const setTyping = (isTyping: boolean) => {
        if (!socket.value || !isConnected.value) return;
        socket.value.emit('comment:typing', { projectId, isTyping });
    };

    // Auto-connect on mount
    onMounted(() => {
        connect();
    });

    // Auto-disconnect on unmount
    onUnmounted(() => {
        disconnect();
    });

    // Reconnect if projectId changes
    watch(() => projectId, (newId, oldId) => {
        if (oldId) disconnect();
        if (newId) connect();
    });

    return {
        isConnected,
        activeUsers,
        broadcastEdit,
        moveCursor,
        focusSegment,
        setTyping,
        connect,
        disconnect
    };
}
