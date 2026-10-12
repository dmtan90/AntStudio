// Studio store types and constants (moved verbatim from stores/studio.ts; re-exported there).

// ============================================
// Types & Interfaces
// ============================================

export type SceneType = 'standard' | 'interview' | 'grid' | 'shoutout' | 'sale_duo' | 'sale_trio' | 'fullscreen' | 'pip' | 'sidebyside';

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'wipe' | 'instant';

export type StreamingContext = 'sales' | 'commentary' | 'talkshow' | 'news' | 'gameshow' | 'music' | 'general' | 'game_streaming' | 'sport' | 'education';

export interface Scene {
    id: string;
    type: SceneType;
    name: string;
    icon: string;
    description: string;
    layout: SceneLayout;
    hotkey?: string;
    media?: string;
    video?: string;
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
    objectFit?: 'contain' | 'cover';
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
    demoMode: boolean;
    currentSpeakerId: string | null;
    studioVibe: string;
    autoCameraEnabled: boolean;
    activeGraphicContent: { title: string; subtitle: string };
    bRollLibrary: { id: string; url: string; topic: string }[];
    activeScript: any;
    scriptIndex: number;
    guestPermissions: { autoApprove: boolean; micEnabled: boolean; camEnabled: boolean };
    showOnboarding: boolean;
}

export interface Guest {
    uuid: string; // Primary unique identifier (generated on creation)
    name: string;
    title?: string;
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
    _id: string;
    id: string;
    name: string;
    brand_name?: string;
    description?: string;
    price: number;
    currency?: string;
    image: string;
    link: string;
    stock?: number;
    video?: string;          // TVC or Preview Video
    category?: string;
    showQR?: boolean;
    intentScore?: number;
    eventClip?: Record<string, string>;
    features?: string[];
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
    status: 'good' | 'fair' | 'poor' | 'waiting';
}

export interface AutoDirectorConfig {
    enabled: boolean;
    sensitivity: number;        // 0-100
    transitionStyle: TransitionType;
    autoSwitchOnSpeaker: boolean;
    autoZoom: boolean;
    autoPivotEnabled: boolean;
    autoEmotionEnabled: boolean;
    autoAtmosphereEnabled: boolean;
    autoPublishViral: boolean;
    effectTriggers: { keyword: string; effectId: string }[];
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    rewardXp: number;
    type: string;
    completed: boolean;
    icon?: string;
}

export interface UserProgress {
    userId: string;
    xp: number;
    level: number;
    activeQuests: Quest[];
    achievements: string[];
}

export const DEFAULT_VISUAL_SETTINGS = {
    language: 'en-US',
    streamQuality: 'high',
    performanceMode: false,
    aiEnabled: true,
    arEnabled: false,
    activeFilter: 'none',
    beauty: {
        smoothing: 0,
        brightness: 1.0,
        sharpen: 0,
        denoise: 0,
        saturation: 1.0,
        redEye: false
    },
    background: {
        mode: 'none' as 'none' | 'blur' | 'virtual',
        blurLevel: 'low' as 'low' | 'medium' | 'high',
        assetUrl: null as string | null,
        isAssetVideo: false,
        is360: false
    },
    branding: {
        logoUrl: null as string | null,
        logoPosition: 'top-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
        logoScale: 1.0,
        name: 'Alex Thompson',
        title: 'AI Specialist',
        color: '#3b82f6'
    },
    breakMode: {
        enabled: false,
        message: 'BE RIGHT BACK',
        backgroundUrl: null as string | null
    },
    specialOverlays: {
        showSponsorship: false,
        sponsorName: 'AntStudio',
        confetti: false,
        fireworks: false
    },
    showLowerThird: false,
    showTicker: false,
    showChat: true,
    tickerText: 'Breaking News • Latest Updates • ',
    accessibility: {
        translationEnabled: false,
        dubbingEnabled: false,
        showSubtitlesOnCanvas: false,
        sourceLang: 'en-US',
        targetLang: 'vi-VN',
        highContrast: false,
        fontSize: 'medium',
        captions: false
    },
    cinematic: {
        enabled: false,
        environmentId: 'standard',
        showInfluencerLinks: true
    },
    chromaKey: {
        enabled: false,
        similarity: 0.4,
        smoothness: 0.1,
        keyColor: '#00ff00'
    },
    lensProfile: 'none',
    ar: {
        beauty: {
            smoothing: 0,
            brighten: 1.0,
            denoise: 0,
            slimming: 0,
            eyeEnlarge: 0
        },
        active3DMask: null as string | null,
        activeFaceMorph: null as string | null,
        landmarks: null as any[] | null
    },
    ai: {
        autonomousProduction: true,
        autoDirector: true
    },
    atmosphereEffect: null as string | null
};

export interface EconomyItem {
    id: string;
    type: 'gift' | 'sticker' | 'powerup';
    name: string;
    cost: number;
    icon: string;
    effectId?: string;
    description: string;
}

export interface UserWallet {
    userId: string;
    balance: number;
    inventory: string[];
}

export interface ARFilterSettings {
    beauty20: { smoothing: number; brightening: number; denoise: number; };
    faceMorph: { slimming: number; eyeEnlargement: number; };
    activeMask: string | null;
}

export const DEFAULT_AR_SETTINGS: ARFilterSettings = {
    beauty20: { smoothing: 0, brightening: 0, denoise: 0 },
    faceMorph: { slimming: 0, eyeEnlargement: 0 },
    activeMask: null
};
