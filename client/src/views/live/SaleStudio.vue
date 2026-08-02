<template>
  <div class="sale-studio h-screen bg-[#06060a] text-white flex flex-col font-sans overflow-hidden relative">
    
    <!-- Premium Ambient Glows -->
    <div class="absolute inset-0 pointer-events-none z-0">
        <div class="absolute top-0 left-1/4 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div class="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-pink-500/5 rounded-full blur-[120px] animate-pulse" style="animation-delay: 3s"></div>
    </div>

    <!-- MAIN TWO-COLUMN STUDIO AREA -->
    <div v-loading="loading" class="flex flex-1 overflow-hidden p-3 gap-3 z-10">

        <!-- LEFT: Broadcast Canvas Container -->
        <div class="relative flex-1 flex flex-col min-w-0">
            <div class="relative flex-1 overflow-hidden rounded-[2.5rem] border border-white/10 shadow-3xl bg-black/40 backdrop-blur-md">
          
                <!-- WebGL Renderer Canvas wrapper -->
                <div class="canvas-wrapper absolute inset-0 overflow-hidden flex items-center justify-center">
                    <div :style="{ aspectRatio: studioStore.streamRatio === '9:16' ? '9/16' : '16/9' }" 
                        class="relative flex items-center justify-center transition-all duration-500 w-full h-full max-w-full max-h-full">
                        <canvas ref="pixiCanvas" class="!w-full !h-full object-contain" style="display:block;"></canvas>
                    </div>
                </div>

                <!-- Dynamic Home Shopping Showcase Overlays -->
                <transition name="fade">
                    <div v-if="showCinematicOverlay && activeProduct" 
                        class="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xl transition-all duration-300">
                        <div class="p-8 rounded-[3rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-3xl text-center flex flex-col items-center gap-6 max-w-sm animate-in zoom-in duration-300">
                            <span class="px-4 py-1.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/20 text-[8px] font-black uppercase tracking-widest">{{ $t('saleStudio.spotlightPitch') }}</span>
                            <div class="h-44 w-44 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5">
                                <img :src="getFileUrl(activeProduct.image)" class="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h2 class="text-xl font-black uppercase leading-tight tracking-tight text-white">{{ activeProduct.name }}</h2>
                                <p class="text-xs text-white/50 font-medium mt-1 leading-snug">{{ activeProduct.brand_name || 'Premium Specs' }}</p>
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-500">${{ activeProduct.price }}</span>
                                <span class="text-xs text-white/30 line-through">${{ (activeProduct.price * 1.3).toFixed(0) }}</span>
                            </div>
                            <div class="px-6 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-[9px] font-bold text-green-400 uppercase tracking-widest animate-pulse">
                                {{ $t('saleStudio.socialProof') }}
                            </div>
                        </div>
                    </div>
                </transition>

                <!-- TOP BAR: LIVE Status & Title -->
                <div class="absolute top-6 inset-x-6 flex items-center justify-between z-30 pointer-events-none">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-600 flex items-center justify-center shadow-lg pointer-events-auto">
                            <el-icon class="font-black text-xs"><Goods /></el-icon>
                        </div>
                        <div class="text-left">
                            <span class="text-xs font-black uppercase tracking-widest text-white leading-none block">{{ $t('saleStudio.title') }}</span>
                            <span class="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-none block mt-1">{{ $t('saleStudio.subtitle') }}</span>
                        </div>
                    </div>
                
                    <!-- LIVE Indicators & Settings -->
                    <div class="flex items-center gap-3 pointer-events-auto">
                        <el-button icon="Setting" type="primary" size="large"
                            plain round 
                            @click="showWizard = true" 
                            v-if="!isLive">
                            {{ $t('saleStudio.setup') }}
                        </el-button>
                        <div v-else class="flex items-center gap-2">
                            <div class="flex items-center gap-2 text-xs font-black text-white/70 bg-white/5 border border-white/5 rounded-xl px-4 py-2 backdrop-blur-md">
                                <span>● {{ viewersFormatted }}</span>
                                <span>● {{ liveTimeFormatted }}</span>
                            </div>

                            <!-- WebRTC Network Status Indicator -->
                            <div v-if="networkStats" class="flex items-center gap-2 text-xs font-black text-white/80 bg-white/5 border border-white/5 rounded-xl px-3 py-2 backdrop-blur-md">
                                <div class="h-2 w-2 rounded-full" :class="networkQualityColor"></div>
                                <span class="text-white/90">{{ networkBitrateFormatted }}</span>
                                <span class="text-white/30">|</span>
                                <span class="text-white/70">{{ networkStats.fps || 30 }} FPS</span>
                                <span class="text-white/30">|</span>
                                <span class="text-white/70">{{ networkStats.rtt || 0 }}ms</span>
                            </div>

                            <div v-if="isReconnecting" class="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 shadow-lg shadow-amber-500/30 animate-pulse">
                                <span class="text-[9px] font-black uppercase tracking-widest text-white">{{ $t('saleStudio.reconnecting') }}</span>
                            </div>
                            <div v-else class="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 shadow-lg shadow-red-500/30 animate-pulse">
                                <span class="text-[9px] font-black uppercase tracking-widest text-white">{{ $t('saleStudio.liveMode') }}</span>
                            </div>
                        </div>
                        <el-button v-if="!isLive" icon="Close" type="danger" size="large"
                            plain round 
                            @click="handleExit">
                            {{ $t('saleStudio.exit') }}
                        </el-button>
                    </div>
                </div>

                <!-- Server Disconnected / Reconnecting Status Banner -->
                <transition name="el-zoom-in-top">
                    <div v-if="isReconnecting" class="absolute top-20 inset-x-6 z-40 flex items-center justify-between bg-amber-500/20 border border-amber-500/40 rounded-2xl px-6 py-3 backdrop-blur-xl shadow-2xl animate-pulse pointer-events-auto">
                        <div class="flex items-center gap-3">
                            <div class="h-3 w-3 rounded-full bg-amber-500 animate-ping"></div>
                            <span class="text-xs font-black uppercase tracking-wider text-amber-300">
                                ⚠️ {{ $t('saleStudio.reconnectingMsg', {attempt: reconnectAttempt}) || (`SERVER CONNECTION LOST! AUTO-RECONNECTING... (Attempt ${reconnectAttempt}/30)`) }}
                            </span>
                        </div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-amber-200/70">
                            {{ $t('saleStudio.pausedBannerSub') || 'STREAM PAUSED - WILL AUTO-RESUME WHEN SERVER IS BACK ONLINE' }}
                        </span>
                    </div>
                </transition>

                <!-- Bottom controls (GO LIVE / STOP) -->
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 pointer-events-auto">
                    <el-button type="danger" class="h-14 w-14 text-[32px]"
                        @click="toggleLive" :icon="isLive ? Pause : Play" circle size="large">

                    </el-button>
                </div>

                <!-- Loading initialization overlay -->
                <div v-if="!isStudioReady" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#06060a]/95 backdrop-blur-3xl">
                    <div class="relative h-20 w-20">
                        <div class="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                        <div class="absolute inset-2 rounded-full border-b-2 border-pink-500 animate-pulse"></div>
                    </div>
                    <h2 class="mt-8 text-xl font-black uppercase tracking-[0.25em] text-white animate-pulse">{{ $t('saleStudio.loading') }}</h2>
                    <p class="mt-2 text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">{{ $t('saleStudio.loadingSub') }}</p>
                </div>
            </div>
        </div>

        <!-- RIGHT: Spotlight Sidebar -->
        <div class="w-80 flex flex-col gap-3 shrink-0">
            <!-- AI Narrative logs -->
            <div class="flex-1 flex flex-col min-h-0 bg-[#0c0c14]/80 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl overflow-hidden shadow-2xl">
                <div class="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <span class="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">{{ $t('saleStudio.liveDialogue') }}</span>
                    <!-- Autonomous Mode Toggle -->
                    <button @click="autonomousMode = !autonomousMode" :disabled="isLive"
                            class="h-10 px-4 rounded-xl border backdrop-blur-md flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
                            :class="autonomousMode 
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'">
                        <div class="h-2 w-2 rounded-full transition-all duration-300" 
                            :class="autonomousMode ? 'bg-indigo-400 animate-pulse' : 'bg-white/30'"></div>
                        <span>{{ autonomousMode ? $t('saleStudio.aiMode') : $t('saleStudio.storyboardMode') }}</span>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    <div v-for="(log, idx) in activityFeed" :key="idx" 
                        class="animate-in slide-in-from-bottom-2 fade-in duration-500">
                        <div class="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                                {{ log.type }}
                            </span>
                            <span class="text-[9px] font-bold text-white/50">{{ log.title }}</span>
                        </div>
                        <p class="text-[11px] leading-relaxed text-white/70 font-medium">
                            {{ log.text }}
                        </p>
                        </div>
                    </div>
                    <div v-if="activityFeed.length === 0" class="h-full flex flex-col items-center justify-center opacity-10">
                        <p class="text-[9px] font-black uppercase tracking-widest">{{ $t('saleStudio.awaitingIngestion') }}</p>
                    </div>
                </div>
            </div>

            <!-- Product selection slider -->
            <div class="flex flex-col gap-2 bg-[#0c0c14]/60 p-4 rounded-[2rem] border border-white/5">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">{{ $t('saleStudio.spotlight') }}</span>
                <div v-if="activeProduct" class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div class="h-12 w-12 rounded-xl overflow-hidden bg-white/5 p-1">
                        <img :src="getFileUrl(activeProduct.image)" class="h-full w-full object-contain" />
                    </div>
                    <div>
                        <p class="text-[11px] font-black uppercase leading-tight line-clamp-1">{{ activeProduct.name }}</p>
                        <p class="text-[9px] font-black text-pink-500 mt-1">${{ activeProduct.price }}</p>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Platform Selector Modal -->
    <PlatformSelector 
      v-model="showPlatformSelector"
      :available-accounts="availableAccounts"
      :selected-platforms="selectedPlatforms"
      @toggle-platform="togglePlatform"
    />

    <!-- Sale Setup Wizard -->
    <SaleWizard v-if="showWizard"
        :active-influencers="Array.from(syntheticGuestManager.activeGuests.values()).map(g => g.persona)"
        @close="showWizard = false"
        @complete="handleWizardComplete"/>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { useStudioStore } from '@/stores/studio';
import * as PIXI from 'pixi.js';
import { useSaleRenderer } from '@/composables/studio/useSaleRenderer';
import { useStudioSession } from '@/composables/studio/useStudioSessionV3';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { useRoute } from 'vue-router';
import { usePlatformStore } from '@/stores/platform';
import { useI18n } from 'vue-i18n';
import { useInfluencerStore } from '@/stores/influencer';
import PlatformSelector from '@/components/studio/modals/PlatformSelector.vue';
import SaleWizard from '@/components/studio/dialogs/SaleWizard.vue';

import { useUserStore } from '@/stores/user';
import { useLiveChatManager, connections } from '@/composables/studio/useLiveChatManager';
import { audioMixerService } from '@/utils/ai/AudioMixerService';
import { saleRunner } from '@/utils/ai/SaleRunner';
import router from '@/router';
import { 
  Play, Pause
} from '@icon-park/vue-next';

const studioStore = useStudioStore();
const userStore = useUserStore();
const isStudioReady = ref(false);
const showCinematicOverlay = ref(false);

const autonomousMode = ref(true);

const influencerId = computed(() => {
    const firstGuest = activeGuests.value[0];
    return firstGuest?.persona?.entityId || firstGuest?.persona?.uuid;
});

const productIds = computed(() => {
    return studioStore.liveProducts.map((p: any) => p._id || p.id);
});

const pixiCanvas = ref<HTMLCanvasElement | null>(null);
const activityFeed = ref<any[]>([]);
const fsmState = ref('PITCHING');
const loading = ref(false);

const viewers = computed(() => studioStore.viewerCount || studioStore.engagement.viewerCount || 0);
const liveTimeFormatted = computed(() => {
    const s = liveTime.value;
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `00:${m}:${sec}`;
});
const viewersFormatted = computed(() => t('saleStudio.viewers', { count: viewers.value }));

// WebRTC Network Stats state
const networkStats = ref<any>(null);

const networkQualityColor = computed(() => {
    if (!networkStats.value) return 'bg-gray-400';
    const rtt = networkStats.value.rtt || 0;
    const loss = networkStats.value.packetLoss || networkStats.value.packetsLost || 0;
    if (rtt < 100 && loss === 0) return 'bg-emerald-400 animate-pulse';
    if (rtt < 250 && loss < 5) return 'bg-amber-400';
    return 'bg-red-500 animate-ping';
});

const networkBitrateFormatted = computed(() => {
    if (!networkStats.value || !networkStats.value.bitrate) return '0 Kbps';
    const kbps = networkStats.value.bitrate;
    if (kbps >= 1000) {
        return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${Math.round(kbps)} Kbps`;
});

const hostStream = ref<MediaStream | null>(null);

// Active Guests computed property
const activeGuests = computed(() =>
    Array.from(syntheticGuestManager.activeGuests.entries()).map(([uuid, v]) => ({ ...v, uuid }))
);

// Gemini Live Chat Manager Integration
const { 
    connections: liveChatConnections, 
    syncConnections: syncLiveChatConnections,
    disconnectAll: disconnectAllLiveChat,
    setToolCallCallback: setLiveChatToolCallback
} = useLiveChatManager();

// Audio Routing to Mixer
watch(() => ({ ...liveChatConnections }), (conns) => {
    Object.values(conns).forEach((conn: any) => {
        if (conn.isConnected && conn.geminiLive) {
            const stream = (conn.geminiLive as any).getAudioStream()?.value;
            if (stream) {
                audioMixerService.addTrack(`influencer_${conn.personaId}`, stream);
                console.log(`[SaleStudio] Audio track added to mixer for influencer: ${conn.personaId}`);
            }
        } else {
            audioMixerService.removeTrack(`influencer_${conn.personaId}`);
            console.log(`[SaleStudio] Audio track removed from mixer for influencer: ${conn.personaId}`);
        }
    });
}, { deep: true, immediate: true });

// Throttled sync to prevent connection bursts
const guestPersonas = computed(() => activeGuests.value.map(g => ({ ...g.persona, uuid: g.uuid })));
let syncTimer: any = null;
const throttledSync = async () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        const productIds = studioStore.liveProducts.map((p: any) => p._id || p.id).join(',');
        console.log(`[SaleStudio] Syncing Live Chat connections for ${guestPersonas.value.length} guests.`);
        await syncLiveChatConnections(studioStore.guestSlotMap, guestPersonas.value, undefined, 'sales', productIds);
    }, 200);
};

// Watchers for connection syncing
watch(() => studioStore.guestSlotMap, throttledSync, { deep: true, immediate: true });
watch(() => guestPersonas.value, throttledSync, { deep: true, immediate: true });

// Dynamic overlay and pitch script spotlight watcher
watch(() => studioStore.highlightedProduct, (product) => {
    if (!product) {
        studioStore.setMedia(null);
        renderer?.updateProductOverlay(null);
        return;
    }
    
    renderer?.updateProductOverlay(product);
    
    console.log("[SaleStudio] Cinematic cut zoom overlay triggered for:", product.name);
    showCinematicOverlay.value = true;
    
    // Auto fadeout overlay in 5s
    setTimeout(() => {
        showCinematicOverlay.value = false;
    }, 5000);

    // AI Pitch logic
    if (autonomousMode.value || saleRunner.state.isRunning) {
        console.log("[SaleStudio] Storyboard/Autonomous mode is active. Skipping watch-triggered local script/voice pitch to avoid double-talk/state conflicts.");
        return;
    }

    let storyboardLine = studioStore.activeScript?.find((s: any) => 
        (s.productId === product._id || s.productId === product.id) && s.type.toLowerCase().includes('showcase')
    );
	
    if (!storyboardLine) {
        storyboardLine = { text: `Here is ${product.name}, an amazing product! It's priced at only $${product.price}. Hurry and scan the QR code on the screen or click the link to purchase now!` };
    }

    const script = `[DIRECTIVE: PERFORM THIS SCRIPT NOW DIRECTLY TO THE AUDIENCE]: ${storyboardLine.text}`;
    const activeAI = activeGuests.value.find(g => g.persona?.visual?.modelType === 'aidol');
    
    if (activeAI) {
        syntheticGuestManager.triggerGesture(activeAI.persona.uuid, 'product_intro', 0);
        
        // Use Gemini Live for voice-over if connected
        const connection = liveChatConnections[activeAI.persona.uuid];
        if (connection?.isConnected) {
            console.log(`[SaleStudio] Sending pitch to Gemini Live for ${activeAI.persona.name}`);
            connection.geminiLive.sendText(script);
        } else {
            console.warn(`[SaleStudio] Gemini Live not connected for ${activeAI.persona.name}, skipping pitch.`);
        }
    } else {
        // Find if any guest is connected to LiveChat
        const speaker = activeGuests.value.find(g => g.persona.uuid);
        const connection = speaker ? liveChatConnections[speaker.persona.uuid] : null;
        
        if (connection?.isConnected) {
            console.log(`[SaleStudio] Sending pitch to Gemini Live for ${speaker?.persona.name}`);
            connection.geminiLive.sendText(script);
        } else {
            console.warn(`[SaleStudio] Gemini Live not connected for ${speaker?.persona.name}, skipping pitch.`);
        }
    }
});

// Capture active products from store
const activeProduct = computed(() => studioStore.highlightedProduct || studioStore.featuredProducts?.[0]);

let app: PIXI.Application | null = null;
let renderer: ReturnType<typeof useSaleRenderer> | null = null;

const initPixi = async () => {
    if (!pixiCanvas.value) return;

    app = new PIXI.Application({
        view: pixiCanvas.value,
        width: 1080,
        height: 1920,
        backgroundColor: 0x06060a,
        resolution: 1,
        autoDensity: true,
        preserveDrawingBuffer: true
    });

    // limit 30fps
    app.ticker.maxFPS = 30;

    renderer = useSaleRenderer(app, studioStore);
    renderer.init(app.stage);
    
    // Bind background dynamically
    const backgroundUrl = studioStore.visualSettings?.background?.assetUrl || '/bg/studio_standard.jpg';
    renderer.updateBackground(backgroundUrl);

    app.ticker.add(() => {
        if (studioStore.activeScene && renderer) {
            renderer.updateLayouts(activeGuests.value, studioStore.activeScene);
        }
    });

    if (studioStore.highlightedProduct) {
        renderer.updateProductOverlay(studioStore.highlightedProduct);
    }
};

// Platform Selection
const platformStore = usePlatformStore();
const route = useRoute();
const influencerStore = useInfluencerStore();
const { t } = useI18n();

const showPlatformSelector = ref(false);
const showWizard = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);

const togglePlatform = (id: string) => {
    const index = selectedPlatforms.value.indexOf(id);
    if (index === -1) {
        selectedPlatforms.value.push(id);
    } else {
        selectedPlatforms.value.splice(index, 1);
    }
};

const fetchAccounts = async () => {
    try {
        await platformStore.fetchAccounts();
        availableAccounts.value = platformStore.accounts;
        const qPlatformId = route.query.platformId as string;
        if (qPlatformId && availableAccounts.value.find(a => a._id === qPlatformId)) {
            selectedPlatforms.value = [qPlatformId];
        }
    } catch (e) {}
};

const streamQuality = computed(() => studioStore.visualSettings?.streamQuality || 'high');
const currentProjectTitle = computed(() => studioStore.featuredProducts?.[0]?.name ? `${studioStore.featuredProducts[0].name} Live Broadcast` : 'SaleStudio Stream');

const qualityPresets = computed(() => {
    const isVertical = studioStore.streamRatio === '9:16';
    const swap = (w: number, h: number) => isVertical ? { width: h, height: w } : { width: w, height: h };
    return {
        low: { ...swap(640, 360), video: 500, audio: 64, fps: 30 },
        medium: { ...swap(854, 480), video: 1200, audio: 128, fps: 30 },
        high: { ...swap(1280, 720), video: 2500, audio: 160, fps: 30 },
        ultra: { ...swap(1920, 1080), video: 4500, audio: 192, fps: 30 }
    };
});

const handleIncomingState = (e: any) => {
    const payload = e.detail || e;
    fsmState.value = payload.type || payload.state || 'PITCHING';
    
    // Auto-spotlight active product if backend FSM updated it
    if (payload.highlightProductId) {
        const product = studioStore.liveProducts.find(
            p => p._id === payload.highlightProductId || p.id === payload.highlightProductId
        );
        if (product && (!studioStore.highlightedProduct || (studioStore.highlightedProduct._id !== product._id && studioStore.highlightedProduct.id !== product.id))) {
            console.log(`🤖 [SaleStudio] FSM spotlighting product: ${product.name}`);
            studioStore.showcaseProduct(product);
        }
    }
    
    // Resolve badge type: if type is ObjectId, find product name for display
    const rawType = payload.type || payload.state || 'ACTION';
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawType);
    let displayType = rawType.toUpperCase();
    if (isObjectId) {
        const matched = studioStore.liveProducts.find(
            (p: any) => p._id === rawType || p.id === rawType
        );
        displayType = matched ? matched.name.toUpperCase().substring(0, 16) : 'PRODUCT';
    }

    const scriptText = payload.text || payload.directive || payload.scriptText;

    // Push dialogue script to activity feed
    activityFeed.value.unshift({
        type: displayType,
        title: 'Dialogue Trigger',
        text: scriptText || '...'
    });
    if (activityFeed.value.length > 10) activityFeed.value.pop();

    // Trigger dynamic avatar texture changes — use gesture/type from directive
    const activeGuests = Array.from(syntheticGuestManager.activeGuests.entries());
    if (activeGuests.length > 0) {
        const [uuid, guestState] = activeGuests[0];
        const persona = guestState.persona;

        // If type is a 24-character hex ObjectId, it is a product-specific clip. Prioritize it.
        const isProductId = /^[0-9a-fA-F]{24}$/.test(payload.type || '');
        const avatarState = isProductId ? payload.type : (payload.gesture || payload.type || 'speaking');

        // Update gesture & activeProductId in guestState so updateLayouts picks up the correct clip
        const resolvedProductId = payload.productId || payload.highlightProductId || payload.productContext?._id || payload.productContext?.id || undefined;
        (guestState as any).gesture = avatarState;
        (guestState as any).isSpeaking = true;
        (guestState as any).activeProductId = resolvedProductId;

        // 🎯 Send script text over /api/live WebSocket so AI Streamer character speaks out loud with voice audio!
        if (scriptText && scriptText.trim().length > 0 && scriptText !== '...') {
            console.log(`🗣️ [SaleStudio] Triggering AI speech for ${persona.name || uuid}: "${scriptText.substring(0, 50)}..."`);
            const conn = connections[uuid] || Object.values(connections)[0];
            if (conn && conn.isConnected) {
                conn.geminiLive.sendText(scriptText);
            } else {
                console.warn(`[SaleStudio] AI speech trigger skipped: Gemini Live connection not ready for ${persona.name || uuid}`);
            }
        }
    }
};

// Bind direct connection drop FSM loop freezer callback
const handleFSMFreeze = () => {
    fsmState.value = 'IDLE';
    activityFeed.value.unshift({
        type: 'SYSTEM',
        title: 'Connection Lost',
        text: 'Autonomous loops frozen due to RTMP/WebRTC channel drop.'
    });
};

const handleFSMRestore = () => {
    fsmState.value = 'PITCHING';
    activityFeed.value.unshift({
        type: 'SYSTEM',
        title: 'Connection Restored',
        text: 'Autonomous loops resumed after connection recovery.'
    });
    if (!autonomousMode.value) {
        saleRunner.start();
    }
};

const { isLive, isReconnecting, reconnectAttempt, liveTime, toggleLive: baseToggleLive } = useStudioSession(
    pixiCanvas,
    hostStream,
    {
        streamQuality,
        currentProject: computed(() => ({ title: currentProjectTitle.value })),
        selectedPlatforms,
        availableAccounts,
        networkStats,
        qualityPresets,
        onConnectionDrop: handleFSMFreeze,
        onConnectionRestore: handleFSMRestore,
        ensureWebSocketsConnected: () => ensureWebSocketsConnected(),
        autonomousMode,
        influencerId,
        productIds
    }
);

// Synchronize the SaleRunner FSM loop with the isLive state
watch(isLive, (live) => {
    if (live) {
        studioStore.streamingContext = 'sales' as any;
        if (!autonomousMode.value) {
            saleRunner.start();
            console.log("[SaleStudio] Livestream started. Starting SaleRunner storyboard loop.");
        } else {
            console.log("[SaleStudio] Livestream started in Autonomous AI Mode. Storyboard loop skipped.");
        }
    } else {
        saleRunner.stop();
        console.log("[SaleStudio] Livestream stopped. Stopping SaleRunner storyboard loop.");

        // Reset all character video states to "idle" and clear TVC video overlay when live stream stops
        if (renderer) {
            renderer.updateMedia(null);
            if (studioStore.activeScene?.id === 'pip') {
                studioStore.switchScene('standard');
            }
            Array.from(syntheticGuestManager.activeGuests.entries()).forEach(([uuid, guestState]) => {
                guestState.isSpeaking = false;
                guestState.isThinking = false;
                guestState.isAudioPlaying = false;
                (guestState as any).gesture = 'idle';
                renderer!.playState(uuid, 'idle', guestState.persona);
            });
            console.log("[SaleStudio] Reset all character video states to 'idle' on stream stop.");
        }
    }
    loading.value = false;
});

const ensureWebSocketsConnected = async (): Promise<boolean> => {
    console.log("⏳ [SaleStudio] Re-verifying and initializing WebSockets (Voice & Data)...");
    const { ActionSyncService } = await import('@/utils/ai/ActionSyncService');
    const sessionId = studioStore.currentSessionId || `stream_${Date.now()}`;
    const productIdsStr = studioStore.featuredProducts.length > 0
        ? studioStore.featuredProducts.map((p: any) => p._id || p.id).join(',')
        : studioStore.liveProducts.map((p: any) => p._id || p.id).join(',');

    // Attempt up to 3 re-initialization passes to establish connections
    for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 [SaleStudio] WebSocket re-initialization attempt ${attempt}/3...`);

        // 1. Ensure WS Data (/socket-io) is connected
        if (!ActionSyncService.getSocket()?.connected) {
            console.log(`[SaleStudio] Connecting ActionSyncService for session: ${sessionId}...`);
            ActionSyncService.connect(sessionId, userStore.token || undefined);
        }

        // 2. Ensure WS Voice (/api/live) is connected for all active AI personas
        if (guestPersonas.value.length > 0) {
            const isVoiceConnected = guestPersonas.value.some(g => {
                const connId = g.uuid || g.entityId || (g as any).id || (g as any)._id;
                const conn = liveChatConnections[connId];
                return conn && conn.isConnected;
            });

            // Force reconnect if not connected yet or attempt > 1
            await syncLiveChatConnections(
                studioStore.guestSlotMap, 
                guestPersonas.value, 
                hostStream.value || undefined, 
                'sales', 
                productIdsStr,
                !isVoiceConnected || attempt > 1
            );
        }

        // 3. Poll for up to 4s for both WS channels to reach isConnected === true
        const startWait = Date.now();
        let isVoiceOk = guestPersonas.value.length === 0;
        let isDataOk = false;

        while (Date.now() - startWait < 4000) {
            if (!isVoiceOk && guestPersonas.value.length > 0) {
                isVoiceOk = guestPersonas.value.some(g => {
                    const connId = g.uuid || g.entityId || (g as any).id || (g as any)._id;
                    const conn = liveChatConnections[connId];
                    return conn && conn.isConnected;
                });
            }

            isDataOk = !!ActionSyncService.getSocket()?.connected;

            if (isVoiceOk && isDataOk) {
                console.log("✅ [SaleStudio] All WebSockets (Voice & Data) successfully initialized and ready!");
                return true;
            }

            await new Promise(r => setTimeout(r, 300));
        }

        console.warn(`⚠️ [SaleStudio] Attempt ${attempt} incomplete (Voice: ${isVoiceOk}, Data: ${isDataOk}). Retrying...`);
    }

    console.log("🚀 [SaleStudio] WebSocket initialization complete. Proceeding with Live Stream launch...");
    return true;
};

const toggleLive = async () => {
    if (!isLive.value) {
        if (!studioStore.activeScript || studioStore.activeScript.length === 0) {
            console.warn("[SaleStudio] No active script found. Auto-generating default script before going live.");
            const product = studioStore.featuredProducts?.[0] || studioStore.liveProducts?.[0];
            const guests = Array.from(syntheticGuestManager.activeGuests.entries());
            if (product && guests.length > 0) {
                const guestId = guests[0][0]; // UUID or entityId
                const persona = guests[0][1].persona;
                studioStore.activeScript = [
                    {
                        speaker: persona.entityId || guestId,
                        type: "speaking",
                        productId: product._id || product.id,
                        text: `Hello everyone! Welcome to our live stream! Today we are showcasing the amazing ${product.name}. ${product.description || 'It is a fantastic product.'}`,
                        duration: 30
                    }
                ];
                activityFeed.value.unshift({
                    type: 'SYSTEM',
                    title: 'Auto-Storyboard Generated',
                    text: 'Initialized default script for ' + product.name
                });
            }
        }

        loading.value = true;

        // VERIFY BOTH WS VOICE (/api/live) AND WS DATA (/socket-io) ARE OK BEFORE GOING LIVE!
        const socketsOk = await ensureWebSocketsConnected();
        if (!socketsOk) {
            loading.value = false;
            return;
        }
    } else {
        loading.value = true;
    }

    const result = await baseToggleLive();
    if (result === 'select_platform') {
        showPlatformSelector.value = true;
    }

    if (result != 'started') {
        loading.value = false;
    }
};

const handleWizardComplete = async (data?: any) => {
    showWizard.value = false;
    if (data?.platforms) {
        selectedPlatforms.value = [...data.platforms];
    }
    if (renderer) {
        const backgroundUrl = studioStore.visualSettings?.background?.assetUrl;
        if (backgroundUrl) {
            renderer.updateBackground(backgroundUrl);
        }
        
        // Re-layout characters
        const activeGuests = Array.from(syntheticGuestManager.activeGuests.entries()).map(([uuid, v]) => ({ ...v, uuid }));
        if (studioStore.activeScene) {
            renderer.updateLayouts(activeGuests, studioStore.activeScene);
        }
    }
};

let canvasResizeObserver: ResizeObserver | null = null;

onMounted(async () => {
    // 1. Fetch products
    if (studioStore.featuredProducts.length === 0) {
        await studioStore.fetchCommerceProducts(true);
    } else {
        await studioStore.fetchCommerceProducts(false);
    }

    // 2. Fetch platform accounts and query synchronizations
    await fetchAccounts();
    const platforms = route.query.platforms as string;
    if (platforms) {
        selectedPlatforms.value = platforms.split(',');
    }

    // 3. Initialize PIXI
    await initPixi();
    if (app) app.start();

    const syncCanvasSize = () => {
        if (!pixiCanvas.value || !app) return;
        const isVertical = studioStore.streamRatio === '9:16';
        const targetWidth = isVertical ? 1080 : 1920;
        const targetHeight = isVertical ? 1920 : 1080;
        
        if (pixiCanvas.value.width !== targetWidth || pixiCanvas.value.height !== targetHeight) {
            pixiCanvas.value.width = targetWidth;
            pixiCanvas.value.height = targetHeight;
            app.renderer.resize(targetWidth, targetHeight);
        }
    };
    syncCanvasSize();
    
    // Keep canvas in sync with size changes
    if (pixiCanvas.value?.parentElement) {
        canvasResizeObserver = new ResizeObserver(syncCanvasSize);
        canvasResizeObserver.observe(pixiCanvas.value.parentElement);
    }
    watch(() => studioStore.streamRatio, syncCanvasSize);

    // Watch background updates
    watch(() => studioStore.visualSettings?.background?.assetUrl, (newBg) => {
        if (renderer && newBg) {
            renderer.updateBackground(newBg);
        }
    });

    // 4. Fallback summon flow for empty guests
    if (influencerStore.influencers.length === 0) {
        await influencerStore.fetchInfluencers();
    }

    let activeList = Array.from(syntheticGuestManager.activeGuests.entries());
    if (activeList.length === 0) {
        console.warn("[SaleStudio] No active guests found, initializing fallback and wizard onboarding...");
        const firstInfluencer = influencerStore.influencers.find(i => i.visual?.modelType === 'aidol') || null;
        if(firstInfluencer){
            await syntheticGuestManager.summonGuest(firstInfluencer);
        }
        
        activeList = Array.from(syntheticGuestManager.activeGuests.entries());
        
        // Auto summon wizard configuration so they are not left with default blank setups
        setTimeout(() => {
            showWizard.value = true;
        }, 150);
    }

    // Hydrate guests in studio store
    activeList.forEach(([uuid, state]) => {
        const persona = state.persona;
        const alreadyInStore = studioStore.liveGuests.find((g: any) => g.uuid === uuid);
        if (!alreadyInStore) {
            studioStore.addGuest({
                uuid,
                name: persona.name || persona.identity?.name || 'AI Guest',
                title: persona.identity?.role || 'Neural Agent',
                type: 'ai',
                avatar: persona.visual?.thumbnailUrl || persona.avatarUrl,
                status: 'live',
                audioEnabled: true,
                videoEnabled: true,
                joinedAt: new Date()
            });
        }
    });

    // Assign slots
    activeList.forEach(([uuid], idx) => {
        studioStore.assignGuestToSlot(uuid, idx);
    });

    // Match auto scene layout (explicit reset-to-default trigger)
    console.log("[SaleStudio] Triggering explicit reset-to-default layout to standard scene.");
    studioStore.switchScene('standard');

    // Preload all avatar video clips and product TVC videos to blob pool — runs in background without blocking UI
    // During live stream, transitionToClip and updateMedia will use instant Blob pool instead of re-fetching from network
    if (renderer) {
        const guestsToPreload = Array.from(syntheticGuestManager.activeGuests.values());
        const productsToPreload = [...(studioStore.liveProducts || []), ...(studioStore.featuredProducts || [])];
        Promise.allSettled(
            guestsToPreload.map(({ persona }) => renderer!.preloadClips(persona, productsToPreload))
        ).then(() => {
            console.log('[SaleStudio] All character video clips and product TVC pools ready.');
        });
    }

    watch(() => studioStore.liveProducts, (products) => {
        if (renderer && products && products.length > 0) {
            const activeGuests = Array.from(syntheticGuestManager.activeGuests.values());
            activeGuests.forEach(({ persona }) => {
                renderer!.preloadClips(persona, products);
            });
        }
    }, { deep: true });

    isStudioReady.value = true;

    // Handle tool calls from Gemini Live
    setLiveChatToolCallback(async (personaId, toolCall) => {
        console.log(`[SaleStudio:Tool] Received tool call from ${personaId}:`, toolCall);
        
        for (const call of toolCall.functionCalls || []) {
            if (call.name === 'showcase_product') {
                const args = call.args;
                if (args && args.productId) {
                    studioStore.highlightProduct(args.productId);
                    toast.success(`AI featured product: ${args.productId}`);
                }
            } else if (call.name === 'trigger_dynamic_deal') {
                const args = call.args;
                if (args && args.productId) {
                    studioStore.startFlashSale({
                        id: 'ai_deal_' + Date.now(),
                        productId: args.productId,
                        discount: args.discount,
                        durationMinutes: Math.ceil(args.durationSeconds / 60) || 5,
                        startTime: Date.now(),
                        title: args.reason || 'AI Special Deal'
                    });
                    toast.success(`AI Deal Triggered: ${args.reason || 'Discount'}`);
                }
            } else if (call.name === 'switch_layout') {
                const args = call.args;
                if (args && args.layoutId) {
                    studioStore.switchScene(args.layoutId);
                    toast.info(`AI updated studio layout to: ${args.layoutId}`);
                }
            } else if (call.name === 'update_product_scarcity') {
                const args = call.args;
                if (args && args.productId) {
                    studioStore.updateProductScarcity(args.productId, args.remainingStock);
                    toast.warning(`Limited Stock: Only ${args.remainingStock} units left!`);
                }
            } else if (call.name === 'change_expression' || call.name === 'play_animation') {
                const args = call.args;
                const activeAI = activeGuests.value.find(g => g.persona?.uuid === personaId);
                if (activeAI) {
                    if (call.name === 'change_expression') {
                        syntheticGuestManager.triggerGesture(activeAI.persona.uuid, args.expression, 3000);
                    } else {
                        syntheticGuestManager.triggerGesture(activeAI.persona.uuid, args.animation, 3000);
                    }
                }
            } else if (call.name === 'shoutout_viewer') {
                const args = call.args;
                if (args && (args.name || args.viewerName)) {
                    toast.success(`Shoutout to ${args.name || args.viewerName}!`, {
                        description: args.reason
                    });
                }
            } else if (call.name === 'trigger_hype_event') {
                const args = call.args;
                window.dispatchEvent(new CustomEvent('show:event', {
                    detail: { type: 'hype', intensity: args.intensity, reason: args.reason }
                }));
            }
        }
    });

    // Bind real-time event listeners
    window.addEventListener('showrunner:directive', handleIncomingState as EventListener);
});

const handleExit = async () => {
    if(isLive.value){
        await toggleLive();
    }
    router.replace({name: "projects"});
}

onUnmounted(() => {
    if (app) {
        app.stop();
        app.destroy(true, { children: true, texture: true });
        app = null;
    }
    if (canvasResizeObserver) {
        canvasResizeObserver.disconnect();
        canvasResizeObserver = null;
    }
    window.removeEventListener('showrunner:directive', handleIncomingState as EventListener);
    
    // Cleanup active streams, connections and FSM loops
    saleRunner.stop();
    disconnectAllLiveChat();
    console.log("[SaleStudio] Storyboard loops and live chat connections cleaned up successfully.");
});
</script>

<style scoped>
.sale-studio {
  background: radial-gradient(circle at 50% 100%, #101018 0%, #06060a 100%);
}
.shadow-3xl {
  box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9);
}
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
