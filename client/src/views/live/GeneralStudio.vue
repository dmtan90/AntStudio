<template>
  <div class="general-studio h-screen bg-[#080810] text-white flex flex-col font-sans overflow-hidden">
    <div class="studio-viewport relative flex-1 p-2 flex flex-col items-center justify-center">
      <div class="relative w-full h-full overflow-hidden rounded-[2.5rem] border border-white/10 shadow-3xl transition-all duration-700 bg-black/40">
        
        <div class="canvas-wrapper w-full h-full relative">
          <canvas ref="outputCanvas" class="w-full h-full object-cover"></canvas>
          <canvas ref="overlayCanvas" class="absolute inset-0 w-full h-full pointer-events-none z-10"></canvas>
          <video ref="sourceVideo" autoplay muted playsinline class="hidden"></video>
        </div>

        <!-- Floating UI Overlays -->
        <div class="absolute top-8 left-10 flex items-center gap-4 z-50 pointer-events-auto">
          <div class="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/20">
            <svg viewBox="0 0 24 24" class="h-6 w-6 text-white"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path fill="currentColor" d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
          </div>
          <span class="text-xl font-black uppercase tracking-tighter text-white/90">ANTSTUDIO LIVE</span>
        </div>

        <div class="absolute top-8 right-10 flex items-center gap-4 z-50 pointer-events-auto">
          <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-2 pr-4 py-1.5 backdrop-blur-xl">
            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 border border-white/20"></div>
            <span class="text-xs font-bold text-white/80">{{ userStore.user?.username || 'Host' }}</span>
          </div>
        </div>

        <GeneralOverlay 
          v-if="isStudioReady"
          :viewers="viewers" 
          :duration="liveTime" 
          :recent-messages="messages"
        />

        <!-- Loading Overlay -->
        <div v-if="!isStudioReady" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#080810]/95 backdrop-blur-3xl">
          <div class="relative h-24 w-24">
            <div class="absolute inset-0 rounded-full border-t-2 border-slate-500 animate-spin"></div>
            <div class="absolute inset-4 rounded-full border-b-2 border-white/20 animate-spin-slow"></div>
          </div>
          <h2 class="mt-8 text-2xl font-black uppercase tracking-widest text-white animate-pulse">Initializing Studio Mode</h2>
          <p class="mt-2 text-sm text-white/20 font-medium uppercase tracking-[0.3em]">Connecting Neural Stream Core</p>
        </div>

        <!-- Minimal HUD -->
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 pointer-events-auto opacity-40 hover:opacity-100 transition-opacity">
           <button @click="toggleMic" class="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl hover:bg-white/10 transition-colors">
              <svg v-if="micOn" viewBox="0 0 24 24" class="h-6 w-6"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              <svg v-else viewBox="0 0 24 24" class="h-6 w-6 text-red-500"><path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17l1.42 1.42c.38-.51.6-1.14.6-1.59V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.17l5.98 6zm-5.46-3l-1.42-1.42C7.38 7.51 7 8.36 7 9s0 1.66 1.34 3S11.34 14 13 14c.64 0 1.24-.2 1.74-.53l1.42 1.42c-.93.56-2.01.91-3.16.91-3.23 0-5.87-2.61-5.91-5.74v-1.92zM12 19c-3.11 0-5.69-2.31-6.12-5.32L4.62 14.93C5.19 18.57 8.3 21 12 21c1.37 0 2.63-.33 3.75-.91l-1.54-1.54c-.68.29-1.43.45-2.21.45zM4.41 2.86L3 4.27l16.14 16.14l1.41-1.41L4.41 2.86z"/></svg>
           </button>
           <button @click="toggleLive" class="px-10 h-14 rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest text-xs"
             :class="isLive ? 'bg-red-600 border-red-500 shadow-lg shadow-red-500/30' : 'bg-white/5 border-white/10'">
             {{ isLive ? 'END LIVE' : 'GO LIVE' }}
           </button>
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
    <div class="absolute -left-[9999px] top-0 w-[1920px] h-[1080px] overflow-hidden opacity-0 pointer-events-none">
      <VirtualGuest
        v-for="guest in activeGuests"
        :key="guest.persona.uuid"
        :ref="(el: any) => { if (el) virtualGuestRefs[guest.persona.uuid] = el }"
        :persona="guest.persona"
        :is-host-speaking="false"
        :hide-background="true"
        :background-url="studioStore.visualSettings.background.assetUrl"
        @stream-ready="(stream: MediaStream) => addSyntheticGuest(guest.persona.uuid, stream)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { useUserStore } from '@/stores/user';
import { useI18n } from 'vue-i18n';
import { useStudioAI } from '@/composables/useStudioAI';
import { useStudioCanvas } from '@/composables/studio/useStudioCanvas';
import { useStudioSession } from '@/composables/studio/useStudioSession';
import { useStudioP2P } from '@/composables/studio/useStudioP2P';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import GeneralOverlay from '@/components/studio/overlays/GeneralOverlay.vue';
import PlatformSelector from '@/components/studio/modals/PlatformSelector.vue';
import { usePlatformStore } from '@/stores/platform';
import { toast } from 'vue-sonner';
import { useRoute } from 'vue-router';
import VirtualGuest from '@/components/studio/virtual/VirtualGuest.vue';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';

const studioStore = useStudioStore();
const userStore = useUserStore();
const platformStore = usePlatformStore();
const route = useRoute();
const { t } = useI18n();

// Template Refs
const outputCanvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const sourceVideo = ref<HTMLVideoElement | null>(null);
const hostStream = ref<MediaStream | null>(null);
const canvasStream = ref<MediaStream | null>(null);
const isStudioReady = ref(false);
const virtualGuestRefs = ref<Record<string, any>>({});

// Active AI Guests – derived from syntheticGuestManager
const activeGuests = computed(() => Array.from(syntheticGuestManager.activeGuests.entries()).map(([, v]) => v));

// Local State
const viewers = ref(Math.floor(Math.random() * 1000) + 200);
const messages = ref<any[]>([]);
const micOn = ref(false);
const streamQuality = computed(() => studioStore.visualSettings.streamQuality);
const isGuest = ref(false);

// Platform Selection
const showPlatformSelector = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);

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

// Audio Analysis
const { audioLevel: hostLevel } = useAudioVisualizer();
const guestLevels = ref<Record<string, number>>({});

// Composables Integration
const { guestVideos, addSyntheticGuest } = useStudioP2P(hostStream, canvasStream, isGuest);

const { startAILoop, stopAILoop } = useStudioAI(studioStore);

const { isLive, liveTime, toggleLive: baseToggleLive } = useStudioSession(
    outputCanvas,
    hostStream,
    {
        streamQuality,
        currentProject: computed(() => ({ title: t('studio.project.defaultTitle') })),
        selectedPlatforms,
        availableAccounts,
        networkStats: ref(null),
        qualityPresets: {
            low: { width: 640, height: 360, video: 500, audio: 64, fps: 30 },
            medium: { width: 854, height: 480, video: 1200, audio: 128, fps: 30 },
            high: { width: 1280, height: 720, video: 2500, audio: 160, fps: 30 },
            ultra: { width: 1920, height: 1080, video: 4500, audio: 192, fps: 30 }
        }
    }
);

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
        isGuest,
        myGuestId: computed(() => studioStore.myGuestId),
        realChatVelocity: computed(() => 0)
    },
    overlayCanvas
);

const toggleMic = () => {
    micOn.value = !micOn.value;
    toast.info(micOn.value ? 'Microphone Active' : 'Microphone Muted');
};

onMounted(async () => {
   // Load available platforms
   await fetchAccounts();

   // Force Context
   studioStore.streamingContext = 'general';
   
   // Apply Context Preset
   studioStore.applyContextPreset('general');
   
   // Start Rendering
   await nextTick();
   startRendering();
   
   // Start AI Logic
   startAILoop();
   
   // Sync with showrunner
   import('@/utils/ai/StudioDirector').then(({ studioDirector }) => {
      studioDirector.applyThematicLayout('general');
   });
   
   isStudioReady.value = true;
});

onUnmounted(() => {
    stopRendering();
    stopAILoop();
});
</script>

<style scoped>
.general-studio { background: radial-gradient(circle at 50% 100%, #151515 0%, #080810 100%); }
.studio-viewport {
  height: calc(100vh - 2rem);
}
.shadow-3xl { box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8); }
.animate-spin-slow { animation: spin 3s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
