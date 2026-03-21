<template>
  <div class="sale-studio h-screen bg-[#080810] text-white flex flex-col font-sans overflow-hidden">

    <!-- ── TWO-COLUMN LAYOUT ── -->
    <div class="flex flex-1 overflow-hidden p-2 gap-2">

      <!-- LEFT: Main Canvas (video area) -->
      <div class="relative flex-1 flex flex-col min-w-0">
        <div class="relative flex-1 overflow-hidden rounded-[2rem] border border-white/10 shadow-3xl bg-black">

          <!-- Canvas outputs -->
          <div class="canvas-wrapper absolute inset-0 overflow-hidden bg-black/60 flex items-center justify-center">
            <div :style="{ aspectRatio: studioStore.streamRatio === '9:16' ? '9/16' : '16/9' }" class="relative w-full h-full max-w-full max-h-full flex items-center justify-center transition-all duration-500">
                <canvas ref="outputCanvas" class="w-full h-full object-contain" style="display:block;"></canvas>
                <canvas ref="overlayCanvas" class="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"></canvas>
                <video ref="sourceVideo" autoplay muted playsinline class="hidden"></video>
            </div>
          </div>

          <!-- Top bar: LIVE badge + viewer/timer + center Logo -->
          <div class="absolute top-5 inset-x-5 flex items-center justify-between z-30 pointer-events-auto">
            <!-- Left: Logo & broadcast badge -->
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-[#e6153a] flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                <!-- LiveStudio icon -->
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-white fill-current">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>
                </svg>
              </div>
              <span class="text-base font-black uppercase tracking-tight text-white/90">LiveStudio</span>
            </div>

            <!-- Center Section removed (mockup bell/creator) -->
            <div></div>
          </div>

          <!-- Flash Sale Timer (top-center, inside video) -->
          <div v-if="studioStore.activeFlashSale"
               class="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center px-8 py-3 rounded-2xl border border-yellow-500/30 bg-[#1a1100]/80 backdrop-blur-xl shadow-2xl">
            <span class="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-500/70">FLASH SALE ENDS IN</span>
            <span class="text-4xl font-black tabular-nums tracking-tighter text-white leading-none">{{ timerDisplay }}</span>
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400 mt-0.5">
              {{ studioStore.highlightedProduct?.name?.toUpperCase() || 'SUMMER TECH DEALS' }}
            </span>
          </div>

          <!-- LIVE viewers badge (bottom-left of canvas) -->
          <div v-if="isLive" class="absolute bottom-20 left-5 flex items-center gap-2 z-30 pointer-events-none">
            <div class="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 shadow-lg shadow-red-500/30">
              <div class="h-2 w-2 rounded-full bg-white animate-pulse"></div>
              <span class="text-xs font-black uppercase tracking-wider text-white">LIVE</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-bold text-white/60 bg-black/40 backdrop-blur-md rounded-lg px-3 py-1.5">
              <span>● {{ viewersFormatted }}</span>
              <span>● {{ liveTimeFormatted }}</span>
            </div>
          </div>

          <!-- Chat overlay (bottom-left) -->
          <div class="absolute bottom-20 left-1/2 -translate-x-1/2 w-[360px] z-30 pointer-events-auto">
            <div class="rounded-[1.5rem] border border-white/5 bg-black/50 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div ref="messagesContainer" class="p-4 space-y-3 max-h-36 overflow-y-auto scrollbar-hide scroll-smooth">
                <div v-for="msg in chatMessages" :key="msg.id" class="flex gap-3">
                  <div class="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-black"
                       :style="`background:${msg.color}20; color:${msg.color}`">
                    {{ msg.name?.[0]?.toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-xs font-black" :class="msg.isAI ? 'text-indigo-400' : 'text-white'">
                      {{ msg.name }}{{ msg.isAI ? '' : ':' }}
                    </p>
                    <p class="text-xs text-white/70 leading-snug mt-0.5">{{ msg.content }}</p>
                  </div>
                </div>
                <p v-if="chatMessages.length === 0" class="text-xs text-white/20 text-center pt-2">Chat will appear here when live...</p>
              </div>
            </div>
          </div>

          <!-- HUD Controls (bottom-center) -->
          <div class="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 pointer-events-auto">
            <!--<button @click="toggleMic" class="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl hover:bg-white/10 transition-colors">
              <svg v-if="micOn" viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" class="h-5 w-5 text-red-500 fill-current">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17l1.42 1.42c.38-.51.6-1.14.6-1.59V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.17l5.98 6zm-5.46-3l-1.42-1.42C7.38 7.51 7 8.36 7 9s0 1.66 1.34 3S11.34 14 13 14c.64 0 1.24-.2 1.74-.53zM4.41 2.86L3 4.27l16.14 16.14 1.41-1.41L4.41 2.86z"/>
              </svg>
            </button>
            <button @click="showWizard = true" class="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl hover:bg-white/10 transition-colors" title="Launch Setup Wizard">
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.488.488 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>-->
            <button @click="studioStore.visualSettings.performanceMode = !studioStore.visualSettings.performanceMode" 
              class="h-12 w-12 rounded-2xl border flex items-center justify-center backdrop-blur-xl transition-all"
              :class="studioStore.visualSettings.performanceMode ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white/5 border-white/10 text-white/40'"
              title="Toggle High Performance Mode">
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/>
              </svg>
            </button>
            <button @click="toggleLive"
              class="px-8 h-12 rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest text-xs"
              :class="isLive ? 'bg-red-600 border-red-500 shadow-lg shadow-red-500/30' : 'bg-white/5 border-white/10'">
              {{ isLive ? 'END LIVE' : 'GO LIVE' }}
            </button>
          </div>

          <!-- Loading Overlay -->
          <div v-if="!isStudioReady" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#080810]/95 backdrop-blur-3xl">
            <div class="relative h-20 w-20">
              <div class="absolute inset-0 rounded-full border-t-2 border-red-500 animate-spin"></div>
              <div class="absolute inset-3 rounded-full border-b-2 border-pink-500 animate-spin-slow"></div>
            </div>
            <h2 class="mt-8 text-2xl font-black uppercase tracking-widest text-white animate-pulse">Initializing Sales Mode</h2>
            <p class="mt-2 text-sm text-white/20 font-medium uppercase tracking-[0.3em]">Connecting AI Sales Engine</p>
          </div>
        </div>
      </div>

      <!-- RIGHT: Product Spotlight Sidebar -->
      <div class="w-72 flex flex-col gap-3 shrink-0">
        <!-- Header -->
        <div class="flex items-center justify-between px-1 pt-2">
          <h2 class="text-base font-black text-white tracking-tight">Product Spotlight</h2>
        </div>

        <!-- Current Spotlight Card -->
        <div v-if="activeProduct" 
             class="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#0f0f14] shadow-2xl transition-all hover:border-blue-500/30">
          
          <!-- Image Section -->
          <div class="relative aspect-square overflow-hidden bg-[#1a1a24]">
            <img :src="getFileUrl(activeProduct.image)" 
                 class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            
            <!-- Category Badge -->
            <span v-if="activeProduct.category"
              class="absolute top-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-[9px] font-black text-white uppercase backdrop-blur-sm border border-white/5">
              {{ activeProduct.category }}
            </span>

            <!-- Hover Name Overlay -->
            <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
               <h3 class="text-sm font-bold text-white leading-tight line-clamp-2">{{ activeProduct.name }}</h3>
            </div>
          </div>

          <!-- Info Section (Price remains visible) -->
          <div class="p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/30">SALE PRICE</span>
                <div class="flex items-baseline gap-2 mt-0.5">
                  <span class="text-xl font-black text-pink-500">${{ activeProduct.price }}</span>
                  <span v-if="studioStore.activeFlashSale" class="text-xs text-white/30 line-through">${{ (activeProduct.price * 1.4).toFixed(0) }}</span>
                </div>
              </div>
              
              <button @click="handleProductHighlight(activeProduct.id || activeProduct._id)"
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-yellow-500/10 active:scale-95 transition-transform">
                BUY NOW
              </button>
            </div>
          </div>
        </div>

        <!-- Placeholder if no active product -->
        <div v-else class="flex flex-col overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#0f0f14]/60 shadow-xl px-4 py-6 items-center gap-2">
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">CURRENT SPOTLIGHT</span>
          <div class="h-28 w-28 rounded-2xl bg-white/5 animate-pulse mt-2"></div>
          <div class="h-3 w-32 rounded bg-white/5 mt-3"></div>
          <div class="h-2.5 w-20 rounded bg-white/5 mt-1"></div>
        </div>
        
        <!-- AI Narrative Script Feed -->
        <div class="flex-1 flex flex-col min-h-0 bg-[#0a0d14]/80 rounded-[1.5rem] border border-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div class="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span class="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">AI NARRATIVE FEED</span>
            <div class="flex gap-1">
              <div v-for="i in 3" :key="i" class="h-1 w-1 rounded-full bg-indigo-500/40 animate-pulse" :style="{ animationDelay: `${i*200}ms` }"></div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <div v-for="(log, idx) in scriptFeed" :key="idx" 
                 class="animate-in slide-in-from-bottom-2 fade-in duration-500 group">
               <div class="p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                        {{ log.type }}
                      </span>
                      <span v-if="log.speaker" class="text-[9px] font-black text-white/50">{{ log.speaker }}</span>
                    </div>
                    <span class="text-[8px] font-medium text-white/10 tabular-nums">{{ new Date(log.timestamp || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</span>
                  </div>

                  <div v-if="log.title" class="text-[10px] font-black text-white/90 mb-1 leading-tight uppercase tracking-tight">
                    {{ log.title }}
                  </div>
                  
                  <p class="text-[11px] leading-relaxed text-white/70 font-medium">
                    {{ log.text }}
                  </p>

                  <div v-if="log.gesture" class="mt-2 flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <div class="text-[7px] font-black uppercase flex items-center gap-1 text-white/40">
                          <component :is="'Hands'" theme="outline" size="8" />
                          {{ log.gesture }}
                      </div>
                  </div>
               </div>
            </div>
            <div v-if="scriptFeed.length === 0" class="h-full flex flex-col items-center justify-center opacity-10">
              <svg viewBox="0 0 24 24" class="h-8 w-8 mb-2 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <p class="text-[9px] font-black uppercase tracking-widest">Awaiting Autonomy</p>
            </div>
          </div>
        </div>

        <!-- Coming Up Next -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">COMING UP NEXT</span>
            <div class="flex items-center gap-2 bg-[#0f0f14]/80 px-2 py-1 rounded border border-white/5">
              <span class="text-[8px] font-black uppercase tracking-widest" :class="autoQueueMode ? 'text-white/30' : 'text-yellow-400'">MANUAL</span>
              <button 
                @click="autoQueueMode = !autoQueueMode"
                class="relative h-4 w-8 rounded-full transition-colors flex items-center shrink-0 cursor-pointer"
                :class="autoQueueMode ? 'bg-indigo-500' : 'bg-white/10'">
                <div class="absolute h-3 w-3 rounded-full bg-white transition-transform transform shadow-sm"
                     :class="autoQueueMode ? 'translate-x-4' : 'translate-x-0.5'"></div>
              </button>
              <span class="text-[8px] font-black uppercase tracking-widest" :class="autoQueueMode ? 'text-indigo-400' : 'text-white/30'">AUTO</span>
            </div>
          </div>
          <div class="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
            <div v-for="(product, idx) in upNextProducts" :key="idx"
              @click="handleProductHighlight(product.id || product._id)"
              class="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0f0f14] px-3 py-2.5 cursor-pointer hover:bg-[#1a1a24] transition-colors relative group">
              
              <!-- Hover Overlay for Manual Action -->
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-[2px]">
                 <span class="text-[9px] font-black uppercase text-white tracking-widest bg-yellow-500/90 px-3 py-1 rounded-full shadow-lg">Push to Live</span>
              </div>

              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5 border border-white/5 p-1 relative z-10 group-hover:opacity-50 transition-opacity">
                <img :src="product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=100'"
                  class="h-full w-full object-contain" />
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight line-clamp-1">{{ product.name }}</p>
                <p class="text-[9px] font-black uppercase text-white/30 mt-0.5">{{ product.category || 'Standard' }}</p>
              </div>
            </div>
            <!-- Placeholders -->
            <div v-for="i in Math.max(0, 3 - upNextProducts.length)" :key="`ph-${i}`"
              class="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0f0f14]/40 px-3 py-2.5">
              <div class="h-12 w-12 rounded-xl bg-white/5 shrink-0"></div>
              <div class="space-y-1.5">
                <div class="h-2.5 w-28 rounded bg-white/5"></div>
                <div class="h-2 w-16 rounded bg-white/5"></div>
              </div>
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

    <!-- ── AI Virtual Guests (offscreen, provide canvas streams) ── -->
    <!-- Each guest renders into a portrait 9:16 slot perfectly scaled to canvas height -->
    <!-- Optimization: Use lower resolution for hidden background renders to save GPU -->
    <div class="fixed inset-0 pointer-events-none opacity-[0.01] z-[-10] flex overflow-hidden">
      <div
        v-for="guest in activeGuests"
        :key="guest.persona.uuid"
        class="h-[640px] aspect-[9/16] overflow-hidden flex-shrink-0"
      >
        <VirtualGuest
          :ref="(el: any) => { if (el) virtualGuestRefs[guest.persona.uuid] = el }"
          :persona="guest.persona"
          :is-host-speaking="false"
          :is-portrait="true"
          :hide-background="true"
          :is-paused="!visibleGuestIds.has(guest.persona.uuid)"
          :background-url="studioStore.visualSettings.background.assetUrl"
          @stream-ready="(stream: MediaStream) => addSyntheticGuest(guest.persona.uuid, stream)"
          @chroma-ready="(m: any) => handleGuestChroma(guest.persona.uuid, m)"
        />
      </div>
    </div>

    <!-- Sale Setup Wizard -->
    <SaleWizard 
      v-if="showWizard"
      :active-influencers="activeGuests.map(g => g.persona)"
      @close="showWizard = false"
      @complete="handleWizardComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, reactive } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user';
import { useI18n } from 'vue-i18n';
import SaleWizard from '@/components/studio/dialogs/SaleWizard.vue';
import { useStudioAI } from '@/composables/useStudioAI';
import { useStudioCanvas } from '@/composables/studio/useStudioCanvas';
import { useStudioSession } from '@/composables/studio/useStudioSession';
import { useStudioP2P } from '@/composables/studio/useStudioP2P';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import PlatformSelector from '@/components/studio/modals/PlatformSelector.vue';
import { usePlatformStore } from '@/stores/platform';
import { toast } from 'vue-sonner';
import { Hands } from '@icon-park/vue-next';
import { useRoute } from 'vue-router';
import VirtualGuest from '@/components/studio/virtual/VirtualGuest.vue';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { neuralShowrunner } from '@/utils/ai/NeuralShowrunner';
import { saleRunner } from '@/utils/ai/SaleRunner';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { useInfluencerStore } from '@/stores/influencer';
import { getFileUrl } from '@/utils/api';
import { useLiveChatManager } from '@/composables/studio/useLiveChatManager';
import { audioMixerService } from '@/utils/ai/AudioMixerService';

const studioStore = useStudioStore();
const userStore = useUserStore();
const platformStore = usePlatformStore();
const route = useRoute();
const { t } = useI18n();

const handleGuestChroma = (id: string, metadata: any) => {
    // Forward auto-detected chroma metadata to the RenderWorker 
    // This allows the worker to perform the keying on the raw video stream,
    // bypassing the heavy main-thread PIXI rendering.
    window.dispatchEvent(new CustomEvent('studio-worker-command', {
        detail: {
            type: 'update-guest-chroma',
            payload: {
                id,
                chroma: {
                    enabled: metadata.isChromaKey,
                    keyColor: `#${Math.round(metadata.color[0]*255).toString(16).padStart(2,'0')}${Math.round(metadata.color[1]*255).toString(16).padStart(2,'0')}${Math.round(metadata.color[2]*255).toString(16).padStart(2,'0')}`,
                    similarity: metadata.similarity,
                    smoothness: metadata.smoothness,
                    spill: 0.1
                }
            }
        }
    }));
};

// UI Refs
const outputCanvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const sourceVideo = ref<HTMLVideoElement | null>(null);
const activeMediaVideo = ref<HTMLVideoElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const hostStream = ref<MediaStream | null>(null);
const canvasStream = ref<MediaStream | null>(null);
const isStudioReady = ref(false);
const virtualGuestRefs = ref<Record<string, any>>({});
let canvasResizeObserver: ResizeObserver | null = null;

// Local State
const viewers = ref(0);
const messages = ref<any[]>([]);
const micOn = ref(false);
const streamQuality = computed(() => studioStore.visualSettings.streamQuality);
const isGuest = ref(false);
let viewerInterval: any = null;

// Platform Selection
const showPlatformSelector = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);
const autoQueueMode = ref(true);
const showWizard = ref(false);

const togglePlatform = (id: string) => {
    const index = selectedPlatforms.value.indexOf(id);
    if (index === -1) {
        selectedPlatforms.value.push(id);
    } else {
        selectedPlatforms.value.splice(index, 1);
    }
}

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

// AI Narrative Feed
const scriptFeed = ref<any[]>([]);

// Purchase Simulation
const purchaseNotifications = reactive<any[]>([]);
const activeGuests = computed(() => Array.from(syntheticGuestManager.activeGuests.entries()).map(([, v]) => v));

// Optimization: Detection of guests visible in current scene
const visibleGuestIds = computed(() => {
    const scene = studioStore.activeScene;
    if (!scene || !scene.layout || !scene.layout.regions) return new Set();
    const visibleSlots = new Set(scene.layout.regions.map((r: any) => r.source).filter((s: string) => s.startsWith('guest')));
    
    const ids = new Set<string>();
    visibleSlots.forEach(slot => {
        const guestData = studioStore.guestSlotMap[slot];
        if (guestData && guestData.uuid) ids.add(guestData.uuid);
    });
    return ids;
});

// Audio Analysis
const { audioLevel: hostLevel } = useAudioVisualizer();
const guestLevels = ref<Record<string, number>>({});

// Composables
const { guestVideos, addSyntheticGuest } = useStudioP2P(hostStream, canvasStream, isGuest);
const { startAILoop, stopAILoop } = useStudioAI(studioStore);

// Gemini Live Chat Manager (Phase 89 Integration)
const { 
    connections: liveChatConnections, 
    syncConnections: syncLiveChatConnections,
    disconnectAll: disconnectAllLiveChat,
    setToolCallCallback: setLiveChatToolCallback
} = useLiveChatManager();

const { isLive, liveTime, toggleLive: baseToggleLive } = useStudioSession(
    outputCanvas,
    hostStream,
    {
        streamQuality,
        currentProject: computed(() => ({ title: t('studio.project.defaultTitle') })),
        selectedPlatforms,
        availableAccounts,
        networkStats: ref(null),
        qualityPresets: computed(() => {
            const isVertical = studioStore.streamRatio === '9:16';
            const swap = (w: number, h: number) => isVertical ? { width: h, height: w } : { width: w, height: h };
            return {
                low: { ...swap(640, 360), video: 500, audio: 64, fps: 30 },
                medium: { ...swap(854, 480), video: 1200, audio: 128, fps: 30 },
                high: { ...swap(1280, 720), video: 2500, audio: 160, fps: 30 },
                ultra: { ...swap(1920, 1080), video: 4500, audio: 192, fps: 30 }
            };
        })
    }
);

// Auto pitch loop disabled in favor of Phase 9 NeuralShowrunner automation
const startProductPitchLoop = () => {
    // NeuralShowrunner now handles product transitions via showrunner:directive
};

const stopProductPitchLoop = () => {
    // No-op
};

// Resource Optimization: Start/Stop AI services based on Live status
watch(isLive, (live) => {
    if (live) {
        startAILoop();
        // Always start showrunner with sales context for SaleStudio
        studioStore.streamingContext = 'sales' as any;
        saleRunner.start();
    } else {
        stopAILoop();
        saleRunner.stop();
    }
});

const toggleLive = async () => {
    const result = await baseToggleLive();
    if (result === 'select_platform') {
        showPlatformSelector.value = true;
    }
};

const { startRendering, stopRendering } = useStudioCanvas(
    outputCanvas,
    sourceVideo,
    guestVideos,
    {
        streamQuality,
        enableAsl: ref(false),
        purchaseNotifications: ref([]),
        hostLevel,
        guestLevels,
        activeMediaVideo,
        isGuest,
        myGuestId: computed(() => studioStore.myGuestId),
        realChatVelocity: computed(() => 0),
        isLive
    },
    overlayCanvas
);

// Computed: Product Spotlight
const activeProduct = computed(() => studioStore.highlightedProduct || studioStore.featuredProducts?.[0]);
const upNextProducts = computed(() => {
    const products = [...(studioStore.featuredProducts || [])];

    const cur = activeProduct.value;
    return products.filter((p: any) => p !== cur).slice(0, 3);
});

// Computed: Viewer count display
const viewersFormatted = computed(() => {
    const v = studioStore.viewerCount || viewers.value;
    return v > 1000 ? `${(v / 1000).toFixed(1)}K Viewers` : `${v} Viewers`;
});

// Computed: Live timer
const liveTimeFormatted = computed(() => {
    const s = liveTime.value;
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
});

// Flash sale timer
const timerDisplay = ref('00:00:00');
let timerInterval: any = null;

const updateTimer = () => {
    if (!studioStore.activeFlashSale) { timerDisplay.value = '00:00:00'; return; }
    const sale = studioStore.activeFlashSale as any;
    const end = sale.startTime + sale.durationMinutes * 60000;
    const diff = Math.max(0, end - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    timerDisplay.value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Chat messages
const chatColors = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ef4444', '#3b82f6'];
const chatMessages = computed(() =>
    messages.value.slice(-5).map((m: any, i: number) => ({
        id: m.id || i,
        name: m.isAI ? 'AI Sales Assistant' : (m.username || m.from || 'User'),
        content: m.content || m.text || m.message,
        isAI: m.isAI || m.type === 'ai',
        color: m.isAI ? '#6366f1' : chatColors[i % chatColors.length],
    }))
);

const toggleMic = () => {
    micOn.value = !micOn.value;
    toast.info(micOn.value ? 'Microphone Active' : 'Microphone Muted');
};

const handleProductHighlight = (productId: string) => {
	studioStore.showcaseProduct(productId);
    studioStore.highlightProduct(productId);
    toast.success('Product spotlighted to audience');
};

const handleWizardComplete = (data?: any) => {
    showWizard.value = false;
    if (data?.platforms) {
        selectedPlatforms.value = data.platforms;
    }
    toast.success('Sale Studio configured and ready!');
    // Trigger any additional setup if needed
};

const handleMediaEnded = () => {
    studioStore.setMedia(null);
};

watch(() => studioStore.activeMediaId, (id) => {
   if (!id) {
      if (activeMediaVideo.value) {
         activeMediaVideo.value.pause();
         activeMediaVideo.value.src = '';
      }
      return;
   }
   // Try to find in generic resourcePool first, or check liveProducts
   let url = '';
   const asset = studioStore.resourcePool.find(r => r.id === id);
   if (asset && asset.type === 'video') {
       url = asset.url;
   } else {
       const prod = studioStore.liveProducts.find(p => p.id === id || p._id === id);
       if (prod && prod.video) url = prod.video;
   }

   if (url) {
      if (!activeMediaVideo.value) {
         activeMediaVideo.value = document.createElement('video');
         activeMediaVideo.value.autoplay = true;
         activeMediaVideo.value.loop = true;
         activeMediaVideo.value.muted = true;
         activeMediaVideo.value.playsInline = true;
         activeMediaVideo.value.addEventListener('ended', handleMediaEnded);
      }
      activeMediaVideo.value.src = url;
      activeMediaVideo.value.play();
   }
});

// Phase 23: Vibe Shop 2.0 - Dynamic Product Pitching & Media Coordination
watch(() => studioStore.highlightedProduct, async (product) => {
    if (!product) {
        studioStore.setMedia(null);
        const activeAI = activeGuests.value.find(g => g.persona?.visual?.modelType === 'aidol');
        if (activeAI) syntheticGuestManager.clearGesture(activeAI.persona.uuid);
        return;
    }

    console.log(`[SaleStudio] Showcasing Product: ${product.name}`);

    // Get pitch script from storyboard or fallback to natural AI directive
    // let script = '';
    let storyboardLine = studioStore.activeScript?.find((s: any) => 
        (s.productId === product._id || s.productId === product.id) && s.type.toLowerCase().includes('showcase')
    );
	
    if(!storyboardLine){
      const lang = userStore.preferredLanguage === 'vi' ? 'Vietnamese' : 'English';
          storyboardLine = `Đây là ${product.name}, một sản phẩm cực kỳ xịn sò luôn! Giá chỉ có ${product.price} ${product.currency || 'VNĐ'} thôi. Mọi người nhanh tay nhấn vào link hoặc quét mã QR trên màn hình để sở hữu ngay nhé! 🔥 (Dịch và trình bày tự nhiên nhất bằng tiếng ${lang})`;
    }

    const script = `[DIRECTIVE: PERFORM THIS SCRIPT NOW DIRECTLY TO THE AUDIENCE]: ${storyboardLine.text}`;

    const activeAI = activeGuests.value.find(g => g.persona?.visual?.modelType === 'aidol');
    
    if (activeAI) {
        // AIDOL: Switch Neural Video clip + Generate Voice
        const productClip = product.eventClip?.['product'];
        if (productClip) {
            if (!activeAI.persona.visual.aidolClips) activeAI.persona.visual.aidolClips = {};
            activeAI.persona.visual.aidolClips['product'] = productClip;
        }

        syntheticGuestManager.triggerGesture(activeAI.persona.uuid, 'product_intro', 0); // 0 = persistent
        
        // Phase 89: Use Gemini Live for voice-over if connected
        const connection = liveChatConnections[activeAI.persona.uuid];
        if (connection?.isConnected) {
            console.log(`[SaleStudio] Sending pitch to Gemini Live for ${activeAI.persona.name}`);
            connection.geminiLive.sendText(script);
        } else {
            console.warn(`[SaleStudio] Gemini Live not connected for ${activeAI.persona.name}, skipping pitch.`);
        }
    } else {
        // 3D/L2D: Play TVC + Live Dubbing
        if (product.video) {
            studioStore.setMedia(product.id || product._id);
            toast.info(`Playing product TVC for ${product.name}`);
        }
        
        // Find if any 3D guest is connected to LiveChat
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

const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
};

const handleIncomingChat = (event: any) => {
    const comment = event.detail;
    messages.value.push(comment);
    scrollToBottom();

    // Phase 11 & 15: Sales Interaction Bridge — forward buyer enquiries to Gemini Live in real-time
    const enquiryKeywords = ['?', 'giá', 'bao nhiêu', 'mua', 'đặt', 'price', 'how much', 'buy', 'order'];
    const isEnquiry = comment?.content && enquiryKeywords.some(k => comment.content.toLowerCase().includes(k));

    if (isLive.value && isEnquiry) {
        const connections = Object.values(liveChatConnections);
        const activeConn = connections.find((c: any) => c?.isConnected);
        if (activeConn) {
            (activeConn as any).geminiLive.sendText(
                `[Viewer Enquiry from ${comment.name || 'Viewer'}]: ${comment.content}`
            );
        }
    }
};

const handleShowrunnerDirective = (event: any) => {
    const detail = event.detail;
    
    // Add to narrative feed
    scriptFeed.value.unshift({
        type: detail.type?.toUpperCase() || 'DIRECTIVE',
        title: detail.title,
        text: detail.directive,
        speaker: detail.originSpeaker || detail.agentName || 'AI Director',
        timestamp: Date.now(),
        gesture: detail.gesture,
        aidolEvent: detail.aidolEvent
    });

    if (scriptFeed.value.length > 20) scriptFeed.value.pop();

    // Simulated Interest / Purchase
    if (detail.type === 'product_showcase' && detail.productContext) {
        // Auto-Highlight in spotlight if mode is AUTO
        if (autoQueueMode.value) {
            handleProductHighlight(detail.productContext.id || detail.productContext._id);
        }

        setTimeout(() => {
            const name = detail.audienceName || `Guest${Math.floor(Math.random() * 9000) + 1000}`;
            toast.success(`${name} just purchased ${detail.productContext.name}!`, {
                icon: '🛍️',
                duration: 5000
            });
        }, 3000 + Math.random() * 5000);
    }
};

const updateViewerCount = () => {
    if (!isLive.value) {
        viewers.value = 0;
        return;
    }
    // Subtle breathing variance
    const variance = Math.floor(Math.random() * 5) - 2;
    viewers.value = Math.max(10, viewers.value + variance);
};

onMounted(async () => {
    // Context is already applied by LiveContextSelector before navigation.
    // Only sync products if none are featured yet (e.g. direct navigation)
    // Otherwise, just fetch the library without overwriting selection.
    if (studioStore.featuredProducts.length === 0) {
        studioStore.fetchCommerceProducts(true);
    } else {
        studioStore.fetchCommerceProducts(false);
    }

    syntheticGuestManager.init(studioStore);
    fetchAccounts();

    // Sync platforms from query
    const platforms = route.query.platforms as string;
    if (platforms) {
        selectedPlatforms.value = platforms.split(',');
    }

    // LiveContextSelector already summoned the selected influencers.
    // Ensure each is registered in liveGuests so assignGuestToSlot works.
    // (summonGuest only calls studioStore.addGuest if studioStore was initialized
    //  at that time — which may not be the case in the selector flow.)
    const activeList = Array.from(syntheticGuestManager.activeGuests.entries());
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

    // Assign each active guest to a scene slot so the RenderWorker maps
    // their UUID → guest1/guest2 region → texture drawn on canvas.
    // Assign each active guest to a scene slot.
    // In human-free non-sales contexts, the first AI is bridged to 'host', so we shift guest assignments.
    const isSales = studioStore.streamingContext === 'sales' || studioStore.streamingContext === 'education';
    activeList.forEach(([uuid], idx) => {
        if (studioStore.humanFreeMode && !isSales) {
            // AI 1 (idx 0) -> Host (bridged in useStudioCanvas)
            // AI 2 (idx 1) -> Guest 1 (idx 0)
            // AI 3 (idx 2) -> Guest 2 (idx 1)
            if (idx > 0) {
                studioStore.assignGuestToSlot(uuid, idx - 1);
            }
        } else {
            studioStore.assignGuestToSlot(uuid, idx);
        }
    });

    // Pick a scene that exposes guest regions (Side-by-Side preference).
    const ideal = studioStore.getAutoBaseScene(activeList.length);
    studioStore.switchScene(ideal);

    // Start AI conversation/autonomous loop moved to isLive watcher
    
    // Sync Chat & Directives
    window.addEventListener('studio:chat', handleIncomingChat);
    window.addEventListener('showrunner:directive', handleShowrunnerDirective);

    // Flash sale timer
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    // Viewer variance
    viewerInterval = setInterval(updateViewerCount, 5000);

    // Force 1920x1080 internal resolution for high-quality production preview.
    // The canvas-wrapper uses object-contain to fit this buffer into the container.
    const syncCanvasSize = () => {
        if (!outputCanvas.value) return;
        const isVertical = studioStore.streamRatio === '9:16';
        const targetWidth = isVertical ? 1080 : 1920;
        const targetHeight = isVertical ? 1920 : 1080;
        
        if (outputCanvas.value.width !== targetWidth || outputCanvas.value.height !== targetHeight) {
            outputCanvas.value.width = targetWidth;
            outputCanvas.value.height = targetHeight;
            if (overlayCanvas.value) {
                overlayCanvas.value.width = targetWidth;
                overlayCanvas.value.height = targetHeight;
            }
        }
    };
    syncCanvasSize();

    // Keep canvas in sync with any layout changes
    canvasResizeObserver = new ResizeObserver(syncCanvasSize);
    if (outputCanvas.value?.parentElement) canvasResizeObserver.observe(outputCanvas.value.parentElement);

    // --- Gemini Live Pipeline (Phase 89) ---
    const guestPersonas = computed(() => activeGuests.value.map(g => g.persona));

    // Throttled sync to prevent connection bursts
    let lastSyncTime = 0;
    const throttledSync = async () => {
        const now = Date.now();
        if (now - lastSyncTime < 800) return;
        lastSyncTime = now;
        const productIds = studioStore.featuredProducts.map((p: any) => p._id || p.id).join(',');
        await syncLiveChatConnections(studioStore.guestSlotMap, guestPersonas.value, hostStream.value || undefined, 'sales', productIds);
    };

    // Watchers for connection syncing
    watch(() => studioStore.guestSlotMap, throttledSync, { deep: true });
    watch(() => guestPersonas.value, throttledSync, { deep: true });
    watch(() => hostStream.value, throttledSync);
    watch(() => studioStore.streamRatio, syncCanvasSize);

    // Watchers for audio routing to Mixer
    watch(() => liveChatConnections, (conns) => {
        Object.values(conns).forEach((conn: any) => {
            if (conn.isConnected && conn.geminiLive) {
                const stream = (conn.geminiLive as any).getAudioStream()?.value;
                if (stream) {
                    audioMixerService.addTrack(`influencer_${conn.personaId}`, stream);
                }
            } else {
                audioMixerService.removeTrack(`influencer_${conn.personaId}`);
            }
        });
    }, { deep: true, immediate: true });

    // Handle tool calls from Gemini
    setLiveChatToolCallback(async (personaId, toolCall) => {
        console.log(`[SaleStudio:Tool] Call from ${personaId}:`, toolCall);
        
        for (const call of toolCall.functionCalls || []) {
            if (call.name === 'showcase_product') {
                const args = call.args;
                if (args && args.productId) {
                    // Triggers the UI to highlight the product and the AI to pitch it
                    
					handleProductHighlight(args.productId);
                    toast.success(t('studio.messages.aiShowcase', { name: args.productId }));
                }
            } else if (call.name === 'trigger_dynamic_deal') {
                const args = call.args;
                if (args && args.productId) {
                    studioStore.startFlashSale({
                        id: 'ai_deal_' + Date.now(),
                        productId: args.productId,
                        discount: args.discount,
                        durationMinutes: Math.ceil(args.durationSeconds / 60) || 5, // Convert seconds to minutes for consistency
                        startTime: Date.now(),
                        title: args.reason || t('studio.messages.aiDealTriggeredTitle')
                    });
                    toast.success(t('studio.messages.aiDealTriggered', { reason: args.reason }));
                }
            }
        }
    });

    // Initial connection attempt
    throttledSync();

    // Wait for VirtualGuest DOM elements to mount before starting render
    await nextTick();
    startRendering();

    isStudioReady.value = true;
});

onUnmounted(() => {
    stopRendering();
    stopAILoop();
    neuralShowrunner.stop();
    window.removeEventListener('studio:chat', handleIncomingChat);
    window.removeEventListener('showrunner:directive', handleShowrunnerDirective);
    if (timerInterval) clearInterval(timerInterval);
    if (viewerInterval) clearInterval(viewerInterval);
    canvasResizeObserver?.disconnect();
    disconnectAllLiveChat();
});
</script>

<style scoped>
.sale-studio {
  background: radial-gradient(circle at 50% 100%, #151525 0%, #080810 100%);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
.shadow-3xl {
  box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8);
}

.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
