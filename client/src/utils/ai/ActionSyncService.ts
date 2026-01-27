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
    public static connect(roomId: string, token: string) {
        if (this.socket?.connected && this.roomId === roomId) return;

        this.roomId = roomId;
        this.socket = io({
            path: '/api/socket.io',
            auth: { token, roomId },
            reconnectionAttempts: 5
        });

        this.setupListeners();
        console.log(`🔗 ActionSyncService connected to room: ${roomId}`);
    }

    /**
     * Setups listeners for remote actions.
     */
    private static setupListeners() {
        if (!this.socket) return;

        const editor = useEditorStore();

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
            console.log('[ActionSync] Received Global State Sync');
            // TODO: Apply complex global state
        });
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
}
