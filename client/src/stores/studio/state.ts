// All state and computed values of the studio store (moved verbatim from the setup function).
import { ref, reactive, computed } from 'vue';
import { useLocalStorage } from '@/composables/useLocalStorage';
import i18n from '@/i18n';
import { TransitionType, Scene, Effect, Overlay, Guest, CoHost, Product, EngagementMetrics, ResourceAsset, StreamHealth, AutoDirectorConfig, Quest, UserProgress, DEFAULT_VISUAL_SETTINGS, EconomyItem, UserWallet } from './types';
import { SCENE_PRESETS } from './presets';

/** Creates the store state. Must be called inside the store's setup function. */
export function createStudioState() {
    const t = i18n.global.t
    // ============================================
    // State
    // ============================================

    // God Mode
    const godModeEnabled = ref(false);
    const humanFreeMode = ref(false);
    const streamingContext = ref(null);
//useLocalStorage<StreamingContext | null>('antstudio_studio_streaming_context', null);
    const embeddedVideoUrl = ref<string | null>(null);
    const liveSubtitlesEnabled = ref(false);
    const currentCaption = ref<any>(null);
    const streamRatio = ref<'16:9' | '9:16' | 'both'>('16:9');
    const highlightedProduct = ref<Product | null>(null);
    const v2cMatch = ref<any>(null);
    const assetGeneration = ref<Record<string, 'pending' | 'success' | 'failed'>>({});
    const showOnboarding = ref(false);
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
    const projectTeam = ref<CoHost[]>([]);
    const isGuest = ref(window.location.search.includes('role=guest'));
    const maxGuests = ref(4);
    const currentProjectId = ref<string | null>(null);
    const activeArchiveId = ref<string | null>(null);
    // Stream Setup
    const guestPermissions = ref({
        autoApprove: true,
        micEnabled: true,
        camEnabled: true
    });
    // const visualSettings = useLocalStorage('antstudio_studio_visual_settings', { ...DEFAULT_VISUAL_SETTINGS });
	// const visualSettings = { ...DEFAULT_VISUAL_SETTINGS };
    const visualSettings = ref(DEFAULT_VISUAL_SETTINGS);
    const backgroundAssets = ref([
        // { id: 'none', name: 'None', url: '', thumbnail: '', isVideo: false },
        { id: 'blur', name: 'Blur', url: '/bg/blur.jpg', thumbnail: '/bg/blur.jpg', isVideo: false },
        { id: 'office', name: 'Modern Office', url: '/bg/modern-office.jpg', thumbnail: '/bg/modern-office.jpg', isVideo: false },
        { id: 'studio', name: 'Pro Studio', url: '/bg/pro-studio.jpg', thumbnail: '/bg/pro-studio.jpg', isVideo: false },
        { id: 'cyberpunk', name: 'Cyberpunk City', url: '/bg/cyberpunk_city.jpg', thumbnail: '/bg/cyberpunk_city.jpg', isVideo: false },
        { id: 'nebula', name: 'Nebula Space', url: '/bg/nebula-space.jpg', thumbnail: '/bg/nebula-space.jpg', isVideo: false }
    ]);
    // Commerce
    const featuredProducts = ref<Product[]>([]);
    const liveProducts = ref<any[]>([]);
    const activeProductId = computed(() => highlightedProduct.value?._id || highlightedProduct.value?.id || null);
    const activeFlashSale = ref<any>(null);
    const currentSessionId = ref<string | null>(null);
    const showPostStreamSynthesis = ref(false);
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
        status: 'waiting'
    });
    const sessionInfra = ref<any>(null);
    const clientHighlightBuffer = ref<{ data: Blob, timestamp: number }[]>([]);
    const MAX_HIGHLIGHT_BUFFER_MS = 30000;
 // 30 seconds
    const myGuestId = ref<string | null>(null);
    const isLive = ref(false);
    const liveTime = ref(0);
    const viralMoments = ref<any[]>([]);
    const activePeak = ref<any>(null);
    // God Mode
    const aiEnabled = ref(true);
    const isInfiniteMode = ref(false);
    const bRollLibrary = ref<any[]>([]);
    const activeFilter = ref('none');
    const autoDirectorSettings = useLocalStorage<AutoDirectorConfig>('antstudio_studio_auto_director', {
        enabled: false,
        sensitivity: 0.5,
        transitionStyle: 'instant',

        autoSwitchOnSpeaker: true,
        autoZoom: false,
        autoPivotEnabled: true,
        autoEmotionEnabled: true,
        autoAtmosphereEnabled: true,
        autoPublishViral: false,
        effectTriggers: []
    });
    // AI Director & Speaker Focus
    const currentSpeakerId = ref<string | null>(null);
    const studioVibe = ref<string>('neutral');
    const vibeScore = ref(85);
    const chatVelocity = ref(0);
    const intentScore = ref(0);
    const autoCameraEnabled = ref(false);
    const activeGraphicContent = ref({ title: '', subtitle: '' });
    
    // AI ShowRunner
    const activePoll = ref<any>(null);
    const showPollCreator = ref(false);
    const showScriptConfig = ref(false);
    const activeScript = ref<any>(null);
    const scriptIndex = ref(-1);
    const showProfiles = ref<any[]>([]);
    
    // RPG Gamification
    const activeQuest = ref<Quest | null>(null);
    // AI Singularity - Advanced Metrics & Facts
    const metricsHistory = ref<{ time: number, value: number }[]>([]);
    const verifiedFacts = ref<any[]>([]);
    const activeRecap = ref<any>(null);
    // Gamification
    const userProgress = ref<UserProgress>({
        userId: '',
        xp: 0,
        level: 1,
        activeQuests: [],
        achievements: []
    });
    // Context-Specific Data
    const contextData = reactive<Record<string, any>>({
        sport: { homeScore: 3, awayScore: 1, homeTeam: 'LIV', awayTeam: 'MNC', league: 'Premier League', time: '82:44', period: '2nd Half', possessionA: 54, xgA: 2.44, shotsOnTargetA: 8, shotsOnTargetB: 3 },
        news: { ticker: ['Breaking: AI Singularity achieved in AntStudio', 'Global markets react to new digital economy', 'Stock media APIs integrated'], breaking: 'Massive AI Leap', location: 'Tokyo, Japan' },
        education: { 
            currentLesson: 'Introduction to AI', 
            studentCount: 1240, 
            activeSlide: 0, 
            slides: [] as Array<{ title: string; bullets: string[]; imageUrl?: string; keywords: string[] }>,
            isGenerating: false 
        },
        sales: { totalSold: 0, stockLeft: 0, nextProductIn: 0 },
        gameshow: { prize: 5000, currentQuestion: 'How many params in GPT-4?', timer: 30, players: [] },
        commentary: { reactions: [], momentum: 0 },
        music: { currentTrack: 'Neural Pulse', artist: 'AI Composer', upNext: 'Digital Dreams' },
        talkshow: { sessionTitle: 'AI & Future Tech', startTime: '11:00 AM', script: [] },
        gaming: { gameName: 'Cyber Strike', fps: 144, viewers: 8400, excitement: 85 },
        general: { engagement: 92, activePoll: null }
    });
    // Economy
    const userWallet = ref<UserWallet>({
        userId: '',
        balance: 0,
        inventory: []
    });
    const storeCatalog = ref<EconomyItem[]>([]);
    const leaderboardData = ref<any[]>([]);
    const isRemoteUpdate = ref(false);
    // Screen Sharing
    const isScreenSharing = ref(false);
    const screenStreamId = ref<string | null>(null);
    // Resource Pool
    const resourcePool = ref<ResourceAsset[]>([]);
    const activeMediaId = ref<string | null>(null);
    const bgmId = ref<string | null>(null);
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
    // Actions: Commerce
    // ============================================

    const demoMode = ref(false);
    const shadowStats = ref<any[]>([]);
    const arSettings = computed(() => visualSettings.value.ar);

    return {
        t,
        godModeEnabled,
        humanFreeMode,
        streamingContext,
        embeddedVideoUrl,
        liveSubtitlesEnabled,
        currentCaption,
        streamRatio,
        highlightedProduct,
        v2cMatch,
        assetGeneration,
        showOnboarding,
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
        projectTeam,
        isGuest,
        maxGuests,
        currentProjectId,
        activeArchiveId,
        guestPermissions,
        visualSettings,
        backgroundAssets,
        featuredProducts,
        liveProducts,
        activeProductId,
        activeFlashSale,
        currentSessionId,
        showPostStreamSynthesis,
        viewerCount,
        engagement,
        health,
        sessionInfra,
        clientHighlightBuffer,
        MAX_HIGHLIGHT_BUFFER_MS,
        myGuestId,
        isLive,
        liveTime,
        viralMoments,
        activePeak,
        aiEnabled,
        isInfiniteMode,
        bRollLibrary,
        activeFilter,
        autoDirectorSettings,
        currentSpeakerId,
        studioVibe,
        vibeScore,
        chatVelocity,
        intentScore,
        autoCameraEnabled,
        activeGraphicContent,
        activePoll,
        showPollCreator,
        showScriptConfig,
        activeScript,
        scriptIndex,
        showProfiles,
        activeQuest,
        metricsHistory,
        verifiedFacts,
        activeRecap,
        userProgress,
        contextData,
        userWallet,
        storeCatalog,
        leaderboardData,
        isRemoteUpdate,
        isScreenSharing,
        screenStreamId,
        resourcePool,
        activeMediaId,
        bgmId,
        guestSlotMap,
        availableGuestSlots,
        hasProducts,
        demoMode,
        shadowStats,
        arSettings,
    };
}
