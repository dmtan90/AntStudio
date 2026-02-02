import { io, Socket } from 'socket.io-client';
import { useEditorStore } from 'video-editor/store/editor';

/**
 * Service for real-time collaboration and state synchronization.
 * Connects hots in a Studio Room via WebSockets.
 */
export class ActionSyncService {
    private static socket: Socket | null = null;
    private static roomId: string | null = null;

    /**
     * Connects to the collaboration server for a specific room.
     */
    public static connect(roomId: string, token: string, extraAuth: any = {}) {
        if (this.socket?.connected && this.roomId === roomId) {
            console.log(`[ActionSync] Already connected to room ${roomId}`);
            return;
        }

        this.roomId = roomId;
        const endpoint = window.location.origin;
        console.log(`[ActionSync] Connecting to ${endpoint} with path /api/socket.io`);

        this.socket = io(endpoint, {
            path: '/api/socket.io',
            auth: { token, roomId, ...extraAuth },
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            transports: ['polling', 'websocket'] // Try polling first as it is more proxy-friendly
        });

        this.socket.on('connect', async () => {
            console.log(`✅ [ActionSync] Connected to room: ${roomId} (ID: ${this.socket?.id})`);
            const studio = (await import('@/stores/studio')).useStudioStore();
            studio.myGuestId = this.socket?.id || null;
        });

        this.socket.on('connect_error', (err) => {
            console.error(`❌ [ActionSync] Connection error:`, err.message);
        });

        this.setupListeners();
    }

    /**
     * Setups listeners for remote actions.
     */
    private static async setupListeners() {
        if (!this.socket) return;

        const editor = useEditorStore();
        const studio = (await import('@/stores/studio')).useStudioStore();

        // Sync Layer Property Changes
        this.socket.on('layer:update', (payload: { id: string, props: any }) => {
            console.log('[ActionSync] Remote Layer Update:', payload);
            editor.canvas.updateLayerProps(payload.id, payload.props, { remote: true });
        });

        // Sync Layer Selection (Presence)
        this.socket.on('layer:select', (payload: { id: string, userId: string, userName: string }) => {
            console.log(`[ActionSync] User ${payload.userName} selected layer ${payload.id}`);
            // TODO: Show visual indicator of remote selection
        });

        // Sync Global State (e.g. Scenery changes)
        this.socket.on('studio:state', (state: any) => {
            console.log('[ActionSync] Received Global State Sync:', state);
            studio.applyRemoteState(state);
        });

        // Guest Management


        this.socket.on('guest:request', (payload: { id: string, name: string, streamId: string, joinedAt: Date }) => {
            console.log('[ActionSync] Guest Request:', payload);
            studio.addGuest({
                id: payload.id,
                name: payload.name,
                streamId: payload.streamId,
                socketId: payload.id,
                type: 'real',
                status: 'waiting',
                audioEnabled: true,
                videoEnabled: true,
                joinedAt: payload.joinedAt
            });
            // Show notification for host
            import('vue-sonner').then(({ toast }) => {
                toast.info(`Guest Join Request: ${payload.name}`, {
                    description: 'Check the Guests panel to approve/reject.',
                    duration: 10000
                });
            });
        });

        this.socket.on('guest:approved', (payload: any) => {
            console.log('[ActionSync] You have been approved!');
            window.dispatchEvent(new CustomEvent('guest:approved', { detail: payload }));
        });

        this.socket.on('guest:rejected', () => {
            console.log('[ActionSync] You have been rejected.');
            window.dispatchEvent(new CustomEvent('guest:rejected'));
        });

        this.socket.on('guest:signal', (payload: { from: string, signal: any }) => {
            console.log('[ActionSync] Guest Signal from:', payload.from);
            window.dispatchEvent(new CustomEvent('guest:signal', { detail: payload }));
        });

        this.socket.on('guest:leave', (payload: { guestId: string }) => {
            console.log('[ActionSync] Guest left:', payload.guestId);
            // Attempt cleanup for raw ID, prefixed ID, and unprefixed ID
            studio.removeGuest(payload.guestId);
            studio.removeGuest(`guest_${payload.guestId}`);
            if (payload.guestId.startsWith('guest_')) {
                studio.removeGuest(payload.guestId.replace('guest_', ''));
            }
        });

        this.socket.on('guest:control', (payload: { action: 'audio' | 'video' | 'kick', value: any }) => {
            console.log('[ActionSync] Received guest control:', payload);
            window.dispatchEvent(new CustomEvent('guest:control', { detail: payload }));
        });
    }

    /**
     * Send remote control action to a specific guest.
     */
    public static sendGuestControl(guestId: string, action: 'audio' | 'video' | 'kick' | 'slot', value: any) {
        if (!this.socket) return;
        this.socket.emit('guest:control', { guestId, action, value });
    }

    /**
     * Send WebRTC signaling for P2P guest connection
     */
    public static sendGuestSignal(to: string, signal: any) {
        if (!this.socket) return;
        this.socket.emit('guest:signal', { to, signal });
    }

    /**
     * Send binary stream chunk for backend relay (FFmpeg ingest)
     */
    public static sendStreamRelay(sessionId: string, chunk: Blob | Buffer | ArrayBuffer) {
        if (!this.socket?.connected) return;
        this.socket.emit('stream:relay', { sessionId, chunk });
    }

    /**
     * Broadcasts the current studio state (Host only)
     */
    public static broadcastStudioState(state: any) {
        if (!this.socket?.connected) return;
        this.socket.emit('studio:state', state);
    }

    /**
     * Broadcasts a local layer update to all other participants.
     */
    public static broadcastLayerUpdate(layerId: string, props: any) {
        if (!this.socket?.connected) return;
        this.socket.emit('layer:update', { id: layerId, props });
    }

    /**
     * Broadcasts that a local host has selected a layer.
     */
    public static broadcastLayerSelection(layerId: string) {
        if (!this.socket?.connected) return;
        this.socket.emit('layer:select', { id: layerId });
    }

    /**
     * Disconnects from the current room.
     */
    public static disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.roomId = null;
        }
    }

    /**
     * Gets the active socket instance.
     */
    public static getSocket(): Socket | null {
        return this.socket;
    }
}
