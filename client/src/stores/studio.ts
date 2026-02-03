import { defineStore } from 'pinia';
import { ref, reactive, onMounted, onUnmounted, watch, type Ref } from 'vue';
import api from '@/utils/api';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { toast } from 'vue-sonner';

// ============================================
// Types & Interfaces
// ============================================

export type SceneType = 'standard' | 'interview' | 'grid' | 'shoutout' | 'fullscreen' | 'pip' | 'sidebyside';
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'wipe' | 'instant';

export interface Scene {
    id: string;
    type: SceneType;
    name: string;
    icon: string;
    description: string;
    layout: SceneLayout;
    hotkey?: string;
}

export interface SceneLayout {
    regions: LayoutRegion[];
}

export interface LayoutRegion {
    id: string;
    x: number;        // Percentage (0-100)
    y: number;        // Percentage (0-100)
    width: number;    // Percentage (0-100)
    height: number;   // Percentage (0-100)
    source: 'host' | 'guest1' | 'guest2' | 'guest3' | 'guest4' | 'screen' | 'media';
    zIndex: number;
    shape?: 'rect' | 'circle' | 'square';
    borderRadius?: number;
    border?: { width: number; color: string };
    shadow?: { blur: number; color: string; x: number; y: number };
}

export interface Effect {
    id: string;
    type: 'filter' | 'overlay' | 'animation';
    name: string;
    enabled: boolean;
    config: any;
}

export interface Overlay {
    id: string;
    type: 'lowerThird' | 'ticker' | 'chat' | 'product' | 'custom';
    position: { x: number; y: number };
    content: any;
    visible: boolean;
}

export interface Guest {
    id: string; // Internal unique ID or socket ID
    name: string;
    type: 'real' | 'ai';
    stream?: MediaStream;
    streamId?: string; // Standardized for WebRTC (usually guest_socketId)
    socketId?: string; // The underlying socket connection ID
    avatar?: string;
    status: 'waiting' | 'live' | 'disconnected';
    audioEnabled: boolean;
    videoEnabled: boolean;
    slotIndex?: number; // 0-3 for layout mapping
    joinedAt?: Date;
}

export interface CoHost {
    id: string;
    name: string;
    avatar?: string;
    permissions: string[];
    status: 'online' | 'offline';
}

export interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    link: string;
    stock?: number;
}

export interface EngagementMetrics {
    viewerCount: number;
    peakViewers: number;
    chatMessagesPerMin: number;
    likes: number;
    shares: number;
}

export interface ResourceAsset {
    id: string;
    name: string;
    type: 'image' | 'video';
    url: string;
    thumbnail: string;
    addedAt: number;
}

export interface StreamHealth {
    bitrate: number;
    rtt: number;
    fps: number;
    packetLoss: number;
    status: 'good' | 'fair' | 'poor';
}

export interface AutoDirectorConfig {
    enabled: boolean;
    sensitivity: number;        // 0-100
    transitionStyle: TransitionType;
    autoSwitchOnSpeaker: boolean;
    autoZoom: boolean;
    effectTriggers: { keyword: string; effectId: string }[];
}

// ============================================
// Scene Presets
// ============================================

const SCENE_PRESETS: Scene[] = [
    {
        id: 'standard',
        type: 'standard',
        name: 'Standard',
        icon: 'User',
        description: 'Single host, centered',
        hotkey: '1',
        layout: {
            regions: [
                { id: 'main', x: 0, y: 0, width: 100, height: 100, source: 'host', zIndex: 1 }
            ]
        }
    },
    {
        id: 'interview',
        type: 'interview',
        name: 'Interview',
        icon: 'PeopleBottom',
        description: 'Split screen (host + guest)',
        hotkey: '2',
        layout: {
            regions: [
                { id: 'host', x: 0, y: 0, width: 50, height: 100, source: 'host', zIndex: 1 },
                { id: 'guest1', x: 50, y: 0, width: 50, height: 100, source: 'guest1', zIndex: 1 }
            ]
        }
    },
    {
        id: 'grid',
        type: 'grid',
        name: 'Grid',
        icon: 'FourRoundPoint',
        description: 'Multi-guest conference (2x2)',
        hotkey: '3',
        layout: {
            regions: [
                { id: 'host', x: 0, y: 0, width: 50, height: 50, source: 'host', zIndex: 1 },
                { id: 'guest1', x: 50, y: 0, width: 50, height: 50, source: 'guest1', zIndex: 1 },
                { id: 'guest2', x: 0, y: 50, width: 50, height: 50, source: 'guest2', zIndex: 1 },
                { id: 'guest3', x: 50, y: 50, width: 50, height: 50, source: 'guest3', zIndex: 1 }
            ]
        }
    },
    {
        id: 'shoutout',
        type: 'shoutout',
        name: 'Shoutout',
        icon: 'Star',
        description: 'Full-screen guest highlight',
        hotkey: '4',
        layout: {
            regions: [
                { id: 'guest1', x: 0, y: 0, width: 100, height: 100, source: 'guest1', zIndex: 1 }
            ]
        }
    },
    {
        id: 'fullscreen',
        type: 'fullscreen',
        name: 'Studio Full',
        icon: 'FullScreen',
        description: 'Wide angle, full setup',
        hotkey: '5',
        layout: {
            regions: [
                { id: 'main', x: 0, y: 0, width: 100, height: 100, source: 'host', zIndex: 1 }
            ]
        }
    },
    {
        id: 'pip',
        type: 'pip',
        name: 'Picture-in-Picture',
        icon: 'ReduceOne',
        description: 'Main + small overlay',
        hotkey: '6',
        layout: {
            regions: [
                { id: 'main', x: 0, y: 0, width: 100, height: 100, source: 'host', zIndex: 1 },
                {
                    id: 'overlay',
                    x: 70,
                    y: 70,
                    width: 25,
                    height: 25,
                    source: 'guest1',
                    zIndex: 2,
                    shape: 'rect',
                    borderRadius: 16,
                    border: { width: 2, color: '#3b82f6' },
                    shadow: { blur: 15, color: 'rgba(0,0,0,0.5)', x: 0, y: 4 }
                }
            ]
        }
    },
    {
        id: 'sidebyside',
        type: 'sidebyside',
        name: 'Side-by-Side',
        icon: 'AlignLeftTwo',
        description: 'Dual camera comparison',
        hotkey: '7',
        layout: {
            regions: [
                { id: 'left', x: 5, y: 10, width: 42, height: 80, source: 'host', zIndex: 1, borderRadius: 12 },
                { id: 'right', x: 53, y: 10, width: 42, height: 80, source: 'guest1', zIndex: 1, borderRadius: 12 }
            ]
        }
    },
    {
        id: 'supergrid',
        type: 'grid',
        name: 'Super Grid',
        icon: 'ApplicationTwo',
        description: 'Host focused + 4 guest sidebar',
        hotkey: '8',
        layout: {
            regions: [
                { id: 'main', x: 2, y: 10, width: 66, height: 80, source: 'host', zIndex: 1, borderRadius: 16 },
                { id: 'g1', x: 70, y: 10, width: 28, height: 18, source: 'guest1', zIndex: 1, borderRadius: 8 },
                { id: 'g2', x: 70, y: 31, width: 28, height: 18, source: 'guest2', zIndex: 1, borderRadius: 8 },
                { id: 'g3', x: 70, y: 52, width: 28, height: 18, source: 'guest3', zIndex: 1, borderRadius: 8 },
                { id: 'g4', x: 70, y: 73, width: 28, height: 18, source: 'guest4', zIndex: 1, borderRadius: 8 }
            ]
        }
    },
    {
        id: 'guestfocus',
        type: 'pip',
        name: 'Guest Focus',
        icon: 'Association',
        description: '4-Guest Grid + Host PiP',
        hotkey: '9',
        layout: {
            regions: [
                { id: 'g1', x: 2, y: 10, width: 47, height: 39, source: 'guest1', zIndex: 1, borderRadius: 12 },
                { id: 'g2', x: 51, y: 10, width: 47, height: 39, source: 'guest2', zIndex: 1, borderRadius: 12 },
                { id: 'g3', x: 2, y: 51, width: 47, height: 39, source: 'guest3', zIndex: 1, borderRadius: 12 },
                { id: 'g4', x: 51, y: 51, width: 47, height: 39, source: 'guest4', zIndex: 1, borderRadius: 12 },
                {
                    id: 'host-pip',
                    x: 80, y: 80, width: 18, height: 18,
                    source: 'host', zIndex: 2, shape: 'rect', borderRadius: 12,
                    border: { width: 2, color: '#3b82f6' },
                    shadow: { blur: 10, color: 'rgba(0,0,0,0.5)', x: 0, y: 2 }
                }
            ]
        }
    }
];

// ============================================
// Studio Store
// ============================================

export const useStudioStore = defineStore('studio', () => {
    // ============================================
    // State
    // ============================================

    // Scene Management
    const activeScene = ref<Scene>(SCENE_PRESETS[0]);
    const nextScene = ref<Scene | null>(null);
    const scenes = ref<Scene[]>([...SCENE_PRESETS]);
    const transitionType = ref<TransitionType>('fade');
    const isTransitioning = ref(false);

    // Effects & Overlays
    const activeEffects = ref<Effect[]>([]);
    const overlays = ref<Overlay[]>([]);

    // Guests & Collaboration
    const liveGuests = ref<Guest[]>([]);
    const waitingGuests = ref<Guest[]>([]);

    const guestJoinLink = ref<string | null>(null);
    const coHosts = ref<CoHost[]>([]);
    const maxGuests = ref(4);

    const guestPermissions = ref({
        autoApprove: false,
        micEnabled: true,
        camEnabled: true
    });

    const visualSettings = ref({
        beauty: {
            smoothing: 0,
            brightness: 0.5,
            sharpen: 0,
            denoise: 0,
            redEye: false
        },
        background: {
            mode: 'none' as 'none' | 'blur' | 'virtual',
            blurLevel: 'low' as 'low' | 'medium' | 'high',
            assetUrl: null as string | null,
            isAssetVideo: false
        }
    });

    const backgroundAssets = ref([
        { id: 'none', name: 'None', url: '', thumbnail: '', isVideo: false },
        { id: 'blur', name: 'Blur', url: '', thumbnail: '', isVideo: false },
        { id: 'office', name: 'Modern Office', url: '/bg/office.jpg', thumbnail: '/bg/office.jpg', isVideo: false },
        { id: 'studio', name: 'Pro Studio', url: '/bg/neon.jpg', thumbnail: '/bg/neon.jpg', isVideo: false },
        { id: 'cyberpunk', name: 'Cyberpunk City', url: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80', thumbnail: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=150', isVideo: false },
        { id: 'nebula', name: 'Nebula Space', url: 'https://images.unsplash.com/photo-1464802686167-b939a67e06a1?auto=format&fit=crop&q=80', thumbnail: 'https://images.unsplash.com/photo-1464802686167-b939a67e06a1?auto=format&fit=crop&w=150', isVideo: false }
    ]);

    // Commerce
    const featuredProducts = ref<Product[]>([]);
    const liveProducts = ref<any[]>([]);
    const activeProductId = ref<string | null>(null);
    const activeFlashSale = ref<any>(null);
    const currentSessionId = ref<string | null>(null);

    // Analytics & Health
    const viewerCount = ref(0);
    const engagement = ref<EngagementMetrics>({
        viewerCount: 0,
        peakViewers: 0,
        chatMessagesPerMin: 0,
        likes: 0,
        shares: 0
    });
    const health = ref<StreamHealth>({
        bitrate: 0,
        rtt: 0,
        fps: 0,
        packetLoss: 0,
        status: 'good'
    });
    const sessionInfra = ref<any>(null);
    const clientHighlightBuffer = ref<{ data: Blob, timestamp: number }[]>([]);
    const MAX_HIGHLIGHT_BUFFER_MS = 30000; // 30 seconds
    const myGuestId = ref<string | null>(null);

    // God Mode
    const godModeEnabled = ref(false);
    const autoDirectorSettings = ref<AutoDirectorConfig>({
        enabled: false,
        sensitivity: 0.5,
        transitionStyle: 'instant',

        autoSwitchOnSpeaker: true,
        autoZoom: false,
        effectTriggers: []
    });


    const isRemoteUpdate = ref(false);

    // Screen Sharing
    const isScreenSharing = ref(false);
    const screenStreamId = ref<string | null>(null);

    // Resource Pool
    const resourcePool = ref<ResourceAsset[]>([]);
    const activeMediaId = ref<string | null>(null);

    // ============================================
    // Computed
    // ============================================

    const guestSlotMap = computed(() => {
        const map: Record<string, Guest> = {};
        const guests = liveGuests.value;

        // 1. First Pass: Assign manual slots (S1-S4)
        guests.forEach(g => {
            if (g.slotIndex !== undefined) {
                map[`guest${g.slotIndex + 1}`] = g;
            }
        });

        // 2. Second Pass: Assign auto slots for the rest
        let autoIdx = 0;
        guests.forEach(g => {
            if (g.slotIndex === undefined) {
                while (map[`guest${autoIdx + 1}`]) {
                    autoIdx++;
                }
                map[`guest${autoIdx + 1}`] = g;
            }
        });

        return map;
    });

    const availableGuestSlots = computed(() => {
        return maxGuests.value - liveGuests.value.length;
    });

    // liveGuests is now a state variable, no longer a computed property
    // const liveGuests = computed(() => {
    //     return guests.value.filter(g => g.status === 'live');
    // });

    const hasProducts = computed(() => featuredProducts.value.length > 0);

    // ============================================
    // Actions: Scene Management
    // ============================================

    async function switchScene(sceneId: string, transition: TransitionType = transitionType.value) {
        const scene = scenes.value.find(s => s.id === sceneId);
        if (!scene || scene.id === activeScene.value.id) return;

        isTransitioning.value = true;
        transitionType.value = transition;
        nextScene.value = scene;

        // Simulate transition duration
        await new Promise(resolve => setTimeout(resolve, transition === 'instant' ? 0 : 600));

        activeScene.value = scene;
        nextScene.value = null;
        isTransitioning.value = false;

        console.log(`[Studio] Switched to scene: ${scene.name}`);

        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    function addCustomScene(scene: Scene) {
        scenes.value.push(scene);
    }

    function removeScene(sceneId: string) {
        scenes.value = scenes.value.filter(s => s.id !== sceneId);
    }

    // ============================================
    // Actions: Effects
    // ============================================

    function addEffect(effect: Effect) {
        activeEffects.value.push(effect);
    }

    function removeEffect(effectId: string) {
        activeEffects.value = activeEffects.value.filter(e => e.id !== effectId);
    }

    function toggleEffect(effectId: string) {
        const effect = activeEffects.value.find(e => e.id === effectId);
        if (effect) effect.enabled = !effect.enabled;
    }

    // ============================================
    // Actions: Overlays
    // ============================================

    function addOverlay(overlay: Overlay) {
        overlays.value.push(overlay);
    }

    function removeOverlay(overlayId: string) {
        overlays.value = overlays.value.filter(o => o.id !== overlayId);
    }

    function updateOverlay(overlayId: string, updates: Partial<Overlay>) {
        const overlay = overlays.value.find(o => o.id === overlayId);
        if (overlay) Object.assign(overlay, updates);
    }

    // ============================================
    // Actions: Guests
    // ============================================

    async function generateInvite(sessionId: string) {
        try {
            const response = await api.post('/streaming/invite', { sessionId });
            if (response.data?.inviteUrl) {
                const { token, inviteUrl } = response.data;
                guestJoinLink.value = inviteUrl;
                return guestJoinLink.value;
            }
        } catch (error) {
            console.error('[StudioStore] Failed to generate guest invite:', error);
            toast.error('Failed to generate secure invite link');
        }
        return null;
    }

    function generateGuestLink() {
        // Mock method retired. Early session preparation ensures real tokens are always available.
        return guestJoinLink.value || '';
    }

    function addGuest(guest: Guest) {
        // Deduplicate: If guest already exists in waiting or live, don't add again
        const exists = waitingGuests.value.some(g => g.id === guest.id) ||
            liveGuests.value.some(g => g.id === guest.id);

        if (exists) {
            console.log(`[Studio] Guest ${guest.name} already in lists, skipping duplicate.`);
            return true;
        }

        if (liveGuests.value.length + waitingGuests.value.length >= maxGuests.value) {
            console.warn('[Studio] Max guests reached');
            return false;
        }

        // Auto-approve if enabled
        if (guestPermissions.value.autoApprove) {
            console.log('[Studio] Auto-approving guest joining:', guest.name);
            // Add directly to live with live status
            const approvedGuest = { ...guest, status: 'live' as const };
            liveGuests.value.push(approvedGuest);

            // Signal approval after a short delay to ensure socket stability and guest readiness
            setTimeout(() => {
                console.log('[Studio] Triggering approval signal for auto-approved guest:', guest.id);
                approveGuest(guest.id);
            }, 1000);
            return true;
        }

        waitingGuests.value.push(guest);
        return true;
    }

    function approveGuest(guestId: string) {
        const index = waitingGuests.value.findIndex(g => g.id === guestId);

        if (index !== -1) {
            const guest = waitingGuests.value[index];
            liveGuests.value.push({ ...guest, status: 'live' });
            waitingGuests.value.splice(index, 1);
        } else {
            // Check if they are already in live (e.g. from auto-approve path)
            const guestInLive = liveGuests.value.find(g => g.id === guestId);
            if (guestInLive) {
                guestInLive.status = 'live';
            }
        }

        // Notify via signaling
        const socket = ActionSyncService.getSocket();
        if (socket) {
            console.log('[Studio] Sending approval signal to guest:', guestId);
            socket.emit('guest:approve', {
                guestId,
                permissions: {
                    micEnabled: guestPermissions.value.micEnabled,
                    camEnabled: guestPermissions.value.camEnabled
                }
            });
        }
    }

    function rejectGuest(guestId: string) {
        waitingGuests.value = waitingGuests.value.filter(g => g.id !== guestId);

        // Notify via signaling
        const socket = ActionSyncService.getSocket();
        if (socket) {
            socket.emit('guest:reject', { guestId });
        }
    }

    function removeGuest(guestId: string) {
        console.log(`[StudioStore] Removing guest: ${guestId}`);
        liveGuests.value = liveGuests.value.filter(g => g.id !== guestId && g.socketId !== guestId);
        waitingGuests.value = waitingGuests.value.filter(g => g.id !== guestId && g.socketId !== guestId);
        broadcastCurrentState();
    }


    function updateGuestStatus(guestId: string, status: Guest['status']) {
        let guest = liveGuests.value.find(g => g.id === guestId);
        if (guest) {
            guest.status = status;
        } else {
            guest = waitingGuests.value.find(g => g.id === guestId);
            if (guest) guest.status = status;
        }
    }

    function muteGuest(guestId: string, enabled: boolean) {
        const guest = liveGuests.value.find(g => g.id === guestId);
        if (guest) {
            guest.audioEnabled = enabled;
            ActionSyncService.sendGuestControl(guestId, 'audio', enabled);
        }
    }

    function toggleGuestCamera(guestId: string, enabled: boolean) {
        const guest = liveGuests.value.find(g => g.id === guestId);
        if (guest) {
            guest.videoEnabled = enabled;
            ActionSyncService.sendGuestControl(guestId, 'video', enabled);
        }
    }

    function kickGuest(guestId: string) {
        // First tell the guest they are kicked
        ActionSyncService.sendGuestControl(guestId, 'kick', true);
        // Then remove locally
        removeGuest(guestId);
    }

    function assignGuestToSlot(guestId: string, slotIndex: number | undefined) {
        // 1. If slotIndex is provided, clear it from any other guest first
        if (slotIndex !== undefined) {
            liveGuests.value.forEach(g => {
                if (g.slotIndex === slotIndex && g.id !== guestId) {
                    g.slotIndex = undefined;
                }
            });
        }

        // 2. Assign the new slot
        const guest = liveGuests.value.find(g => g.id === guestId);
        if (guest) {
            guest.slotIndex = slotIndex;
            broadcastCurrentState();
        }
    }


    async function swapWithHost(guestId: string) {
        if (activeScene.value.type !== 'standard' && activeScene.value.type !== 'fullscreen') {
            // Force a standard scene for solo focus if not already in one
            await switchScene('standard');
        }

        const guest = liveGuests.value.find(g => g.id === guestId);
        if (!guest) return;

        // Implementation of 'Solo' mode: 
        // We temporarily override the host region's source or swap slots.
        // For standard AntFlow logic, we assign the guest to Slot 1 
        // and if it's a 'shoutout' or 'standard' scene, it will show them.

        // Let's create a temporary scene override or just assign to Slot 0 (S1) 
        // and ensure the scene uses guest1 as source if soloing.

        // Simpler: Just switch to shoutout scene for that guest
        await switchScene('shoutout');
        assignGuestToSlot(guestId, 0); // Map to guest1
    }


    // ============================================
    // Actions: Co-Hosts
    // ============================================

    function addCoHost(coHost: CoHost) {
        if (!coHosts.value.find(c => c.id === coHost.id)) {
            coHosts.value.push(coHost);
        }
    }

    function removeCoHost(coHostId: string) {
        coHosts.value = coHosts.value.filter(c => c.id !== coHostId);
    }

    function hasPermission(coHostId: string, permission: string) {
        const coHost = coHosts.value.find(c => c.id === coHostId);
        return coHost?.permissions.includes(permission) || false;
    }

    // ============================================
    // Actions: Commerce
    // ============================================

    const demoMode = ref(false);

    function toggleDemoMode() {
        demoMode.value = !demoMode.value;
    }

    async function fetchCommerceProducts() {
        try {
            const response = await api.get('/commerce/products');
            liveProducts.value = response.data;
            return response.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch products:', error);
            throw error;
        }
    }

    function showcaseProduct(product: any) {
        activeProductId.value = product.id || product._id;
        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    function removeProduct(productId: string) {
        if (activeProductId.value === productId) {
            activeProductId.value = null;
            if (!isRemoteUpdate.value) {
                broadcastCurrentState();
            }
        }
    }

    function appendHighlightChunk(blob: Blob) {
        const now = Date.now();
        clientHighlightBuffer.value.push({ data: blob, timestamp: now });

        // Cleanup old chunks (older than 30s)
        const cutoff = now - MAX_HIGHLIGHT_BUFFER_MS;
        while (clientHighlightBuffer.value.length > 0 && clientHighlightBuffer.value[0].timestamp < cutoff) {
            clientHighlightBuffer.value.shift();
        }
    }

    async function captureHighlight(sessionId: string) {
        // High-level Logic:
        // 1. If we have a local buffer (AMS mode), process it locally for zero-latency capture
        // 2. If not, fallback to server-side capture (Relay mode)

        if (clientHighlightBuffer.value.length > 0) {
            try {
                const now = Date.now();
                const durationMs = 15000; // Last 15 seconds
                const cutoff = now - durationMs;
                const relevantChunks = clientHighlightBuffer.value.filter(c => c.timestamp >= cutoff);

                if (relevantChunks.length === 0) {
                    toast.error('Highlight buffer is still warming up...');
                    return null;
                }

                const blob = new Blob(relevantChunks.map(c => c.data), { type: 'video/webm' });
                const fileName = `highlights/${sessionId}/${Math.random().toString(36).substring(7)}.webm`;

                // Upload directly to S3 via projects endpoint or generic S3 helper
                const formData = new FormData();
                formData.append('file', blob, 'highlight.webm');
                formData.append('path', fileName);
                formData.append('contentType', 'video/webm');

                const response = await api.post('/s3/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                toast.success('Viral moment captured locally!');
                return response.data;
            } catch (error: any) {
                console.error('[StudioStore] Local highlight capture failed:', error);
                // Fallback to backend anyway just in case
            }
        }

        try {
            const response = await api.post(`/streaming/status/${sessionId}/highlight`);
            toast.success('Viral moment captured via Cloud!');
            return response.data;
        } catch (error: any) {
            console.error('[StudioStore] Highlight capture failed:', error);
            toast.error('Failed to capture highlight');
            return null;
        }
    }

    const shadowStats = ref<any[]>([]);

    async function fetchShadowStats(sessionId: string) {
        try {
            const response = await api.get(`/streaming/status/${sessionId}/shadow`);
            shadowStats.value = response.data;
            return response.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch shadow stats:', error);
            return [];
        }
    }

    async function fetchSessionInfra(sessionId: string) {
        try {
            const response = await api.get(`/streaming/status/${sessionId}/infra`);
            sessionInfra.value = response.data;
            return response.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch session infra:', error);
            return null;
        }
    }

    async function startFlashSale(saleData: any) {
        try {
            // Forward to API to trigger global notification (Host only)
            if (!isRemoteUpdate.value) {
                await api.post('/commerce/flash-sale', saleData);
            }
            activeFlashSale.value = saleData;

            if (!isRemoteUpdate.value) {
                broadcastCurrentState();
            }
            return true;
        } catch (error) {
            console.error('[StudioStore] Flash sale failed:', error);
            return false;
        }
    }

    function endFlashSale() {
        activeFlashSale.value = null;
        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    async function fetchAnalytics(projectId: string) {
        try {
            const response = await api.get(`/projects/${projectId}/analytics`);
            const metrics = response.data.metrics;
            updateEngagement({
                viewerCount: metrics.viewCount,
                peakViewers: metrics.peakViewers,
                likes: metrics.likeCount,
                shares: metrics.shareCount
            });
            return response.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch analytics:', error);
            throw error;
        }
    }

    function updateEngagement(metrics: Partial<EngagementMetrics>) {
        Object.assign(engagement.value, metrics);
        if (metrics.viewerCount !== undefined) {
            viewerCount.value = metrics.viewerCount;
            if (metrics.viewerCount > engagement.value.peakViewers) {
                engagement.value.peakViewers = metrics.viewerCount;
            }
        }
    }

    // ============================================
    // Actions: God Mode
    // ============================================

    function toggleGodMode() {
        godModeEnabled.value = !godModeEnabled.value;
        autoDirectorSettings.value.enabled = godModeEnabled.value;
    }

    function updateAutoDirector(settings: Partial<AutoDirectorConfig>) {
        Object.assign(autoDirectorSettings.value, settings);
    }

    // ============================================
    // Actions: Synchronization
    // ============================================

    let broadcastTimeout: any = null;
    function broadcastCurrentState() {
        if (broadcastTimeout) clearTimeout(broadcastTimeout);
        broadcastTimeout = setTimeout(() => {
            ActionSyncService.broadcastStudioState({
                activeSceneId: activeScene.value.id,
                activeProductId: activeProductId.value,
                activeFlashSale: activeFlashSale.value,
                activeGuests: liveGuests.value.map(g => ({
                    id: g.id,
                    name: g.name,
                    type: g.type,
                    avatar: g.avatar,
                    status: g.status,
                    audioEnabled: g.audioEnabled,
                    videoEnabled: g.videoEnabled,
                    slotIndex: g.slotIndex,
                    joinedAt: g.joinedAt,
                    streamId: (g as any).stream?.id || g.streamId // Ensure we send the stream ID
                }))
            });
            broadcastTimeout = null;
        }, 120);
    }

    function applyRemoteState(state: any) {
        isRemoteUpdate.value = true;
        try {
            if (state.activeSceneId && state.activeSceneId !== activeScene.value.id) {
                switchScene(state.activeSceneId);
            }
            if (state.activeProductId !== undefined) {
                activeProductId.value = state.activeProductId;
            }
            if (state.activeFlashSale !== undefined) {
                activeFlashSale.value = state.activeFlashSale;
            }
            if (state.activeGuests && Array.isArray(state.activeGuests)) {
                // Determine if we need to update guests
                // We naively replace the list but we should check if it actually changed to avoid reactivity thrashing if possible
                // For now, simple replacement is safer for consistency

                // Preserve local stream objects if they were somehow attached (though useStudioP2P handles streams)
                // We just update the metadata
                const newGuestIds = new Set(state.activeGuests.map((g: any) => g.id));

                // Sync liveGuests
                liveGuests.value = state.activeGuests;

                // Also cleanup waiting guests if they are now live
                waitingGuests.value = waitingGuests.value.filter(g => !newGuestIds.has(g.id));
            }
        } finally {
            setTimeout(() => {
                isRemoteUpdate.value = false;
            }, 100);
        }
    }

    function updateHealth(stats: Partial<StreamHealth>) {
        Object.assign(health.value, stats);
        if (health.value.bitrate < 500 || health.value.rtt > 300) {
            health.value.status = 'poor';
        } else if (health.value.bitrate < 1500 || health.value.rtt > 150) {
            health.value.status = 'fair';
        } else {
            health.value.status = 'good';
        }
    }

    // ============================================
    // Return
    // ============================================

    function updateVisualSettings(settings: Partial<typeof visualSettings.value>) {
        visualSettings.value = {
            ...visualSettings.value,
            ...settings
        };
        broadcastCurrentState();
    }

    function resetVisualSettings() {
        visualSettings.value = {
            beauty: {
                smoothing: 0,
                brightness: 0.5,
                sharpen: 0,
                denoise: 0,
                redEye: false
            },
            background: {
                mode: 'none',
                blurLevel: 'low',
                assetUrl: null,
                isAssetVideo: false
            }
        };
        broadcastCurrentState();
    }

    const addCustomBackground = (asset: any) => {
        backgroundAssets.value.push(asset);
    };

    return {
        // State
        activeScene,
        nextScene,
        scenes,
        transitionType,
        isTransitioning,
        activeEffects,
        overlays,
        liveGuests,
        waitingGuests,
        guestJoinLink,
        coHosts,
        maxGuests,
        guestPermissions,
        visualSettings,
        featuredProducts,
        liveProducts,
        activeProductId,
        activeFlashSale,
        currentSessionId,
        viewerCount,
        engagement,
        health,
        godModeEnabled,
        autoDirectorSettings,
        myGuestId,
        backgroundAssets,

        // Computed
        guestSlotMap,
        availableGuestSlots,
        // liveProducts, // Duplicate removed

        // liveGuests, // liveGuests is now a state variable
        hasProducts,

        // Actions
        switchScene,
        addCustomScene,
        removeScene,
        addEffect,
        removeEffect,
        toggleEffect,
        addOverlay,
        removeOverlay,
        updateOverlay,
        generateInvite,
        generateGuestLink,
        addGuest,
        approveGuest,
        rejectGuest,
        removeGuest,
        updateGuestStatus,
        muteGuest,
        toggleGuestCamera,
        kickGuest,
        assignGuestToSlot,
        swapWithHost,
        addCoHost,

        removeCoHost,
        hasPermission,
        showcaseProduct,
        removeProduct,
        startFlashSale,
        endFlashSale,
        captureHighlight,
        shadowStats,
        fetchShadowStats,
        demoMode,
        toggleDemoMode,
        fetchCommerceProducts,
        updateEngagement,
        fetchAnalytics,
        updateHealth,
        toggleGodMode,
        updateAutoDirector,
        sessionInfra,
        fetchSessionInfra,
        appendHighlightChunk,
        broadcastCurrentState,
        applyRemoteState,
        updateVisualSettings,
        resetVisualSettings,
        addCustomBackground,

        // Screen Sharing & Resources
        isScreenSharing,
        screenStreamId,
        resourcePool,
        activeMediaId,
        addResource(resource: ResourceAsset) {
            resourcePool.value.unshift(resource);
        },
        removeResource(id: string) {
            resourcePool.value = resourcePool.value.filter(r => r.id !== id);
        },
        setMedia(id: string | null) {
            activeMediaId.value = id;
            broadcastCurrentState();
        }
    };
});
