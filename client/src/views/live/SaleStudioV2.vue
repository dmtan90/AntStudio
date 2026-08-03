<template>
  <div class="sale-studio-v2 h-screen bg-[#06060a] text-white flex flex-col font-sans overflow-hidden relative">
    
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
                            <span class="text-xs font-black uppercase tracking-widest text-white leading-none block">{{ $t('saleStudio.title') }} (V2 Unified)</span>
                            <span class="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-none block mt-1">Unified WS Architecture</span>
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

                            <!-- Single WS Gateway Status -->
                            <div class="flex items-center gap-2 text-xs font-black bg-white/5 border border-white/5 rounded-xl px-3 py-2 backdrop-blur-md">
                                <div class="h-2.5 w-2.5 rounded-full" :class="wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'"></div>
                                <span class="text-white/90">Unified WS: {{ wsConnected ? 'Connected' : 'Offline' }}</span>
                            </div>

                            <div class="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 shadow-lg shadow-red-500/30 animate-pulse">
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

                <!-- Bottom controls (GO LIVE / STOP) -->
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 pointer-events-auto">
                    <el-button type="danger" class="h-14 px-8 text-base font-bold rounded-2xl shadow-2xl"
                        @click="toggleLive" :icon="isLive ? Pause : Play" size="large">
                        {{ isLive ? 'STOP STREAM' : 'GO LIVE (UNIFIED)' }}
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
        <div class="w-80 flex flex-col gap-3 shrink-0 z-20">
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useStudioStore } from '@/stores/studio';
import * as PIXI from 'pixi.js';
import { useSaleRenderer } from '@/composables/studio/useSaleRenderer';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { getFileUrl } from '@/utils/api';
import { useRoute } from 'vue-router';
import { usePlatformStore } from '@/stores/platform';
import { useI18n } from 'vue-i18n';
import PlatformSelector from '@/components/studio/modals/PlatformSelector.vue';
import SaleWizard from '@/components/studio/dialogs/SaleWizard.vue';

import { useUserStore } from '@/stores/user';
import { audioMixerService } from '@/utils/ai/AudioMixerService';
import router from '@/router';
import { Play, Pause } from '@icon-park/vue-next';

// 1. Import Unified Architecture Composables & Events
import { useUnifiedWS } from '@/composables/unified/useUnifiedWS';
import { UnifiedWSEvent } from '@/services/unified/UnifiedWSEventTypes';

const studioStore = useStudioStore();
const userStore = useUserStore();
const platformStore = usePlatformStore();
const route = useRoute();
const { t } = useI18n();

const isStudioReady = ref(false);
const showCinematicOverlay = ref(false);
const autonomousMode = ref(true);
const loading = ref(false);
const isLive = ref(false);
const liveTime = ref(0);
let timerInterval: any = null;

const pixiCanvas = ref<HTMLCanvasElement | null>(null);
const activityFeed = ref<any[]>([]);

const showPlatformSelector = ref(false);
const showWizard = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);
const activeStreamId = ref<string | null>(null);

let app: PIXI.Application | null = null;
let renderer: ReturnType<typeof useSaleRenderer> | null = null;

// 2. Single Unified WebSocket Hook Integration
const { 
  isConnected: wsConnected, 
  startLivestream, 
  stopLivestream, 
  onEvent 
} = useUnifiedWS();

const activeGuests = computed(() =>
    Array.from(syntheticGuestManager.activeGuests.entries()).map(([uuid, v]) => ({ ...v, uuid }))
);

const activeProduct = computed(() => studioStore.highlightedProduct || studioStore.featuredProducts?.[0]);

const viewers = computed(() => studioStore.viewerCount || studioStore.engagement.viewerCount || 0);
const viewersFormatted = computed(() => t('saleStudio.viewers', { count: viewers.value }));
const liveTimeFormatted = computed(() => {
    const s = liveTime.value;
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `00:${m}:${sec}`;
});

const togglePlatform = (id: string) => {
    const index = selectedPlatforms.value.indexOf(id);
    if (index === -1) {
        selectedPlatforms.value.push(id);
    } else {
        selectedPlatforms.value.splice(index, 1);
    }
};

const handleExit = () => {
    router.push('/projects');
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
        if (studioStore.activeScene) {
            renderer.updateLayouts(activeGuests.value, studioStore.activeScene);
        }
    }
};

// 3. Setup PIXI WebGL Canvas
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

    app.ticker.maxFPS = 30;

    renderer = useSaleRenderer(app, studioStore);
    renderer.init(app.stage);
    
    const backgroundUrl = studioStore.visualSettings?.background?.assetUrl || '/bg/studio_standard.jpg';
    renderer.updateBackground(backgroundUrl);

    app.ticker.add(() => {
        if (studioStore.activeScene && renderer) {
            renderer.updateLayouts(activeGuests.value, studioStore.activeScene);
        }
    });

    isStudioReady.value = true;
};

// 4. Unified WebSocket Event Handlers Integration
onMounted(async () => {
    await initPixi();

    // FSM Script Trigger (Server-Driven)
    onEvent(UnifiedWSEvent.FSM_SCRIPT_TRIGGER, (msg) => {
        const payload = msg.payload;
        activityFeed.value.unshift({
            type: `FSM [${payload.phase}]`,
            title: payload.productId ? `Product: ${payload.productId}` : 'Storyboard Trigger',
            text: payload.scriptText
        });
        if (activityFeed.value.length > 20) activityFeed.value.pop();

        // Play character animation state
        if (renderer && activeGuests.value.length > 0) {
            const firstGuest = activeGuests.value[0];
            renderer.playState(firstGuest.uuid, payload.phase?.toLowerCase() || 'speaking', firstGuest.persona);
        }
    });

    // FSM State Change
    onEvent(UnifiedWSEvent.FSM_STATE_CHANGE, (msg) => {
        const payload = msg.payload;
        activityFeed.value.unshift({
            type: 'STATE',
            title: `Phase: ${payload.phase}`,
            text: payload.text
        });
    });

    // Ingest Stream Status
    onEvent(UnifiedWSEvent.STREAM_STATUS, (msg) => {
        const payload = msg.payload;
        activityFeed.value.unshift({
            type: 'STREAM',
            title: 'NodeMediaServer Status',
            text: payload.message || `Active: ${payload.active}`
        });
    });

    // RTMP Restream Relay Status
    onEvent(UnifiedWSEvent.RTMP_RELAY_STATUS, (msg) => {
        const payload = msg.payload;
        activityFeed.value.unshift({
            type: 'RELAY',
            title: payload.targetPlatform.toUpperCase(),
            text: `Status: ${payload.status} ${payload.error ? '- Error: ' + payload.error : ''}`
        });
    });
});

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
    if (app) app.destroy(true);
});

// 5. Toggle Stream Start / Stop over Single Unified WS
const toggleLive = async () => {
    if (!isLive.value) {
        const streamId = `stream_${Date.now()}`;
        activeStreamId.value = streamId;
        isLive.value = true;
        liveTime.value = 0;

        timerInterval = setInterval(() => {
            liveTime.value++;
        }, 1000);

        const productIds = studioStore.featuredProducts.map((p: any) => p._id || p.id);

        // Send single LIVESTREAM_START event over unified WS
        startLivestream({
            streamId,
            projectId: (route.params.id as string) || studioStore.currentProjectId || 'default_project',
            productIds,
            autonomousMode: autonomousMode.value
        });

        activityFeed.value.unshift({
            type: 'SYSTEM',
            title: 'Unified Stream Launch',
            text: `Dispatched LIVESTREAM_START to Unified Gateway for ${streamId}`
        });
    } else {
        if (activeStreamId.value) {
            stopLivestream(activeStreamId.value);
        }
        isLive.value = false;
        activeStreamId.value = null;
        if (timerInterval) clearInterval(timerInterval);

        activityFeed.value.unshift({
            type: 'SYSTEM',
            title: 'Unified Stream Stopped',
            text: 'Dispatched LIVESTREAM_STOP to Unified Gateway.'
        });

        if (renderer) {
            renderer.updateMedia(null);
            activeGuests.value.forEach((g) => {
                renderer!.playState(g.uuid, 'idle', g.persona);
            });
        }
    }
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
