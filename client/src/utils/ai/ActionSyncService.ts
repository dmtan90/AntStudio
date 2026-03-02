import { io, Socket } from 'socket.io-client';
import { useEditorStore } from 'video-editor/store/editor';
import { toast } from 'vue-sonner';

/**
 * Service for real-time collaboration and state synchronization.
 * Connects hots in a Studio Room via WebSockets.
 */
export class ActionSyncService {
    private static socket: Socket | null = null;
    private static roomId: string | null = null;
    private static relayQueue: { sessionId: string, chunk: any }[] = [];
    private static latency: number = 0;

    /**
     * Connects to the collaboration server for a specific room.
     */
    public static connect(roomId: string, token: string, extraAuth: any = {}) {
        if (this.socket?.connected && this.roomId === roomId) {
            console.log(`[ActionSync] Already connected to room ${roomId}`);
            return;
        }

        this.roomId = roomId;
        const endpoint = window.location.origin || (window.location.protocol + '//' + window.location.host);
        console.log(`[ActionSync] Connecting to ${endpoint} with path /api/socket.io`);

        const persistentGuestId = this.getOrCreatePersistentId();
        this.socket = io(endpoint, {
			//allowEIO3: true, // Enables compatibility with Socket.IO v2 clients
            path: '/socket.io',
            auth: { token, roomId, persistentGuestId, ...extraAuth },
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            transports: ['websocket']
        });

        this.socket.on('connect', async () => {
            console.log(`✅ [ActionSync] Connected to signaling transport (Transport: ${this.socket?.id})`);
            
            // Phase 96: Flush buffered relay chunks once connected
            if (this.relayQueue.length > 0) {
                console.log(`[ActionSync] Flushing ${this.relayQueue.length} buffered relay chunks`);
                while (this.relayQueue.length > 0) {
                    const item = this.relayQueue.shift();
                    if (item && this.socket) {
                        this.socket.emit('stream:relay', item);
                    }
                }
            }
        });

        this.socket.on('session:connected', async (data: { userId: string, role: string, name: string }) => {
            console.log(`🆔 [ActionSync] Identity stabilized: ${data.name} (${data.userId}) as ${data.role}`);
            const studio = (await import('@/stores/studio')).useStudioStore();
            studio.myGuestId = data.userId;
        });

        this.socket.on('connect_error', (err) => {
            console.error(`❌ [ActionSync] Connection error:`, err.message);
        });

        // Add periodic latency test for stats
        setInterval(() => {
            if (this.socket?.connected) {
                const start = Date.now();
                this.socket.emit('ping_heartbeat', {}, () => {
                   ActionSyncService.latency = Date.now() - start;
                   //console.log(`[ActionSync] Latency updated: ${ActionSyncService.latency}ms`);
                });
            }
        }, 5000);

        this.setupListeners();
    }

    public static getLatency(): number {
        return ActionSyncService.latency || 0;
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

        // Sync Participant List & Viewer Count
        this.socket.on('users:update', (users: any[]) => {
            console.log('[ActionSync] Room Participants Update:', users);
            
            // 1. Update Viewer Count
            studio.viewerCount = users.length;
            studio.engagement.viewerCount = users.length;

            // 2. Identify Co-hosts (Role exists in socket.data.user)
            const coHosts = users.filter(u => u.role === 'host' && u.id !== studio.myGuestId);
            studio.coHosts = coHosts.map(u => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar || '',
                status: 'online',
                permissions: ['admin'] // Default for now
            }));
        });

        // Sync Chat Messages
        this.socket.on('comment:new', (comment: any) => {
            console.log('[ActionSync] Received Chat Message:', comment);
            window.dispatchEvent(new CustomEvent('studio:chat', { detail: comment }));
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

        // Sync Viral Peaks (Phase 90)
        this.socket.on('studio:viral_peak', (data: any) => {
            console.log('🚀 [ActionSync] Viral Peak Detected:', data);
            
            // 1. Update List
            studio.viralMoments.unshift({
                ...data,
                id: Math.random().toString(36).substring(7),
                timestamp: Date.now()
            });

            // 2. Dispatch window event for UI reaction (optional if using store refs)
            studio.activePeak = data;
            window.dispatchEvent(new CustomEvent('studio:viral_peak', { detail: data }));
            
            // 3. Show local toast
            toast.info(`🚀 VIRAL MOMENT: ${data.reason}`, {
                description: 'AI Producer is clipping this for social media!',
                duration: 8000
            });
        });

        // Sync Engagement Metrics (Real-time from Platforms)
        this.socket.on('studio:engagement', (data: { likes: number, shares: number, externalViewers: number, comments: number }) => {
            console.log('[ActionSync] Received Engagement Update:', data);
            
            // Update Studio Store metrics
            studio.engagement.likes = data.likes;
            studio.engagement.shares = data.shares;
            
            // CCU calculation: Internal Socket Users + External Platform Viewers
            const internalViewers = studio.viewerCount; 
            const totalViewers = internalViewers + (data.externalViewers || 0);
            
            // Update total viewer count in store
            studio.viewerCount = totalViewers;
            studio.engagement.viewerCount = totalViewers;
            
            // Update peak if total is higher
            if (totalViewers > studio.engagement.peakViewers) {
                studio.engagement.peakViewers = totalViewers;
            }
        });

        // Guest Management


        this.socket.on('guest:request', (payload: { id: string, name: string, streamId: string, joinedAt: Date }) => {
            console.log('[ActionSync] Guest Request:', payload);

            // Only host-like roles should add guests to their store to avoid loops
            if (!window.location.search.includes('role=guest')) {
                studio.addGuest({
                    uuid: payload.id,
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
            }
        });

        this.socket.on('guest:approved', (payload: any) => {
            console.log('🎉 [ActionSync] You have been approved!', payload);
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
        });

        this.socket.on('guest:control', (payload: { action: 'audio' | 'video' | 'kick', value: any }) => {
            console.log('[ActionSync] Received guest control:', payload);
            window.dispatchEvent(new CustomEvent('guest:control', { detail: payload }));
        });

        this.socket.on('style:switch', (payload: { style: string }) => {
            console.log('⚖️ [ActionSync] Server-driven Style Switch:', payload);
            window.dispatchEvent(new CustomEvent('style:switch', { detail: payload }));
        });

        // --- Audience Interaction (Phase 66) ---
        this.socket.on('hive:poll_update', (poll: any) => {
            console.log('[ActionSync] Hive Poll Update:', poll);
            studio.activePoll = poll;
        });

        this.socket.on('hive:poll_result', (poll: any) => {
            console.log('[ActionSync] Hive Poll Result:', poll);
            studio.activePoll = poll;
            // Auto clear after 5s is handled in store or component
        });

        this.socket.on('hive:sentiment', (data: { score: number }) => {
            console.log('[ActionSync] Sentiment Update:', data.score);
            studio.studioVibe = data.score > 60 ? 'happy' : data.score < 40 ? 'tense' : 'neutral';
        });

        this.socket.on('show:event', (event: { type: string, payload: any }) => {
             console.log('[ActionSync] Show Event:', event);
             // Dispatch to window for decoupled effect handlers (e.g. confetti, sfx)
             window.dispatchEvent(new CustomEvent('show:event', { detail: event }));
             
             // Also handle direct store updates if needed
             if (event.type === 'visual_confetti') {
                 studio.visualSettings.specialOverlays.confetti = true;
                 setTimeout(() => studio.visualSettings.specialOverlays.confetti = false, 5000);
             }
        });

        // --- Phase 88: Gamification ---
        this.socket.on('gamification:update', async (progress: any) => {
            if (!studio.godModeEnabled) return; // Gate: Only log/process if God Mode is ON
            console.log('[ActionSync] Gamification Update:', progress);
            await studio.processGamificationEvent('gamification:update', progress);
        });

        this.socket.on('gamification:levelup', async (data: { level: number }) => {
            if (!studio.godModeEnabled) return; // Gate: Only log/process if God Mode is ON
            console.log('🎉 [ActionSync] Level Up!', data.level);
            await studio.processGamificationEvent('gamification:levelup', data);
            
            import('vue-sonner').then(({ toast }) => {
                toast.success(`Level Up! You reached Level ${data.level}`, {
                    duration: 5000
                });
            });
        });

        this.socket.on('gamification:quest_complete', (quest: any) => {
             console.log('✅ [ActionSync] Quest Complete:', quest.title);
             import('vue-sonner').then(({ toast }) => {
                toast.success(`Quest Complete: ${quest.title}`, {
                    description: `+${quest.rewardXp} XP earned!`,
                    duration: 4000
                });
            });
        });

        this.socket.on('gamification:shoutout', (data: { userId: string, level: number }) => {
             import('vue-sonner').then(({ toast }) => {
                toast.success(`User ${data.userId} just reached Level ${data.level}! 🚀`, {
                    duration: 5000,
                    style: { background: 'linear-gradient(to right, #ffd700, #ffa500)', color: 'black', border: 'none' }
                });
            });
        });

        // --- Phase 68: Economy ---
        this.socket.on('economy:balance_update', (wallet: any) => {
            console.log('[ActionSync] Wallet Update:', wallet.balance);
            studio.userWallet = wallet;
        });

        this.socket.on('economy:gift_received', (data: { senderId: string, item: any }) => {
            console.log('🎁 [ActionSync] Gift Received:', data.item.name);
            window.dispatchEvent(new CustomEvent('economy:gift', { detail: data }));
            
            import('vue-sonner').then(({ toast }) => {
                toast.success(`${data.item.name} from ${data.senderId}`, {
                    description: data.item.description,
                    duration: 3000,
                    icon: data.item.icon
                });
            });
        });

        this.socket.on('economy:error', (error: { message: string }) => {
             import('vue-sonner').then(({ toast }) => {
                toast.error(error.message);
            });
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
        if (!this.socket?.connected) {
            // Buffer the critical initial chunks (especially the EBML header)
            this.relayQueue.push({ sessionId, chunk });
            if (this.relayQueue.length % 10 === 0) {
                console.warn(`[ActionSync] Socket not connected, queued ${this.relayQueue.length} chunks for ${sessionId}`);
            }
            return;
        }
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
     * Sends a chat message to the room.
     */
    public static sendChatMessage(text: string) {
        if (!this.socket?.connected) return;
        this.socket.emit('comment:add', { 
            text, 
            timestamp: Date.now() 
        });
    }

    /**
     * Sends a performance snapshot (viewer count, chat velocity, etc.) to the server.
     */
    public static sendPerformanceSnapshot(data: any) {
        if (!this.socket?.connected) return;
        this.socket.emit('performance:snapshot', data);
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

    /**
     * Phase 90: Generates or retrieves a persistent ID for reconnection stability.
     */
    private static getOrCreatePersistentId(): string {
        let id = localStorage.getItem('antstudio_persistent_id');
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('antstudio_persistent_id', id);
        }
        return id;
    }
}
