<template>
   <div class="live-studio dark-theme">
      <StudioHeader :is-live="isLive" :live-time="liveTime" :is-god-mode="isGodMode"
         :title="currentProject?.title || t('studio.title')" @toggle-god-mode="toggleGodMode" @exit="handleExit" />

      <main class="studio-main">
         <StudioRail v-model:active-tab="activeTab" :effect-tabs="effectTabs" />

         <StudioStage :active-likes="activeLikes">
            <template #canvas>
               <div class="relative w-full h-full overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl">
                  <canvas ref="outputCanvas" class="main-canvas"></canvas>
                  <video ref="sourceVideo" autoplay muted playsinline style="display:none"></video>
                  
                  <!-- ASL Visual Interpreter (Accessibility) -->
                  <div v-if="enableASL" class="asl-interpreter animate-in absolute bottom-8 right-8 w-48 aspect-video bg-black/60 backdrop-blur-xl border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl z-20">
                     <div class="absolute inset-0 flex flex-col items-center justify-center p-4">
                        <div class="w-full flex justify-between items-center mb-2 px-2">
                            <span class="text-[8px] font-black text-blue-400 uppercase tracking-widest">{{ t('studio.accessibility.aslTitle') }}</span>
                            <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        </div>
                        <!-- Mock ASL Animation/Visual -->
                        <div class="flex-1 w-full bg-blue-500/10 rounded-xl border border-white/5 flex items-center justify-center">
                            <i class="ri-hand-coin-line text-3xl text-blue-400"></i>
                        </div>
                        <p class="mt-2 text-[9px] font-bold text-white/50 text-center uppercase">{{ t('studio.accessibility.translating') }}</p>
                     </div>
                  </div>

                  <!-- Visual Audio Cues (For Hearing Impaired) -->
                  <div class="audio-visual-cue absolute bottom-8 left-8 flex items-end gap-1 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5">
                     <div v-for="i in 5" :key="i" 
                       class="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-100"
                       :style="{ height: `${Math.random() * (audioLevel * 40 + 5)}px`, opacity: audioLevel > 0.1 ? 1 : 0.3 }">
                     </div>
                     <span class="text-[10px] font-black ml-2" :class="audioLevel > 0.05 ? 'text-blue-400' : 'text-white/20'">{{ t('studio.accessibility.liveAudio') }}</span>
                  </div>
               </div>
            </template>
            <template #controls>
               <StageControls :mic-on="micOn" :cam-on="camOn" :is-live="isLive" :is-recording="isRecording"
                  :platform-count="selectedPlatforms.length" @toggle-mic="micOn = !micOn" @toggle-cam="camOn = !camOn"
                  @toggle-live="toggleLive" @toggle-record="toggleRecord" @invite-guest="inviteGuest"
                  @show-platforms="showPlatformSelector = true" @show-settings="showSettings = true" />
            </template>
         </StudioStage>

         <StudioInteractions :messages="messages" @spawn-like="spawnLike" />
      </main>

      <!-- Drawer: Effects Panel -->
      <div v-if="activeTab" class="effects-drawer glass-dark animate-slide-left">
         <header class="drawer-header">
            <h3 class="drawer-title">{{effectTabs.find(t => t.id === activeTab)?.name || activeTab}}</h3>
            <div class="flex items-center gap-3">
               <button class="marketplace-shortcut" @click="$router.push('/marketplace')">
                  <shopping size="10" /> {{ t('marketplace.title') }}
               </button>
               <button @click="activeTab = null" class="close-drawer">
                  <close theme="outline" />
               </button>
            </div>
         </header>
         <div class="drawer-content px-4 py-6 scrollbar-hide overflow-y-auto max-h-[calc(100vh-120px)]">
            <FilterSettings v-if="activeTab === 'filters'" :active-filter="currentFilter" :filters="filters"
               :selected-background="selectedBackground || ''" :backgrounds="backgrounds"
               :enable-chromakey="enableChromakey" :chroma-settings="chromaSettings"
               @update:active-filter="f => currentFilter = f" @update:enable-chromakey="v => enableChromakey = v"
               @select-background="selectStage" />

            <AIPersonaSettings v-else-if="activeTab === 'ai' || activeTab === 'virtual'" :personas="guestPersonas"
               @summon-guest="summonGuest" @toggle-guest="toggleGuest" />

            <GraphicSettings v-else-if="activeTab === 'graphics'" :branding="branding"
               :show-lower-third="showLowerThird" :show-ticker="showTicker" @toggle-lower-third="toggleLowerThird"
               @toggle-ticker="toggleTicker" />

            <SceneSettings v-else-if="activeTab === 'scenes'" :active-scene="activeScene" :scenes="scenes"
               @update:active-scene="s => activeScene = s" />

            <GuestSettings v-else-if="activeTab === 'guests'" :guest-personas="guestPersonas"
               :remote-guests="remoteGuests" @invite-guest="inviteGuest" @summon-guest="summonGuest"
               @toggle-guest="toggleGuest" @add-mobile-cam="generateMobileLink" />

            <LinguisticSettings v-else-if="activeTab === 'linguistic'" :is-translating="isTranslating"
               :enable-asl="enableASL" :source-lang="sourceLang" :target-lang="targetLang" :current-transcript="currentTranscript"
               @update:is-translating="v => isTranslating = v" @update:enable-asl="v => enableASL = v"
               @update:source-lang="v => sourceLang = v" @update:target-lang="v => targetLang = v" />

            <CommerceSettings v-else-if="activeTab === 'commerce'" :is-flash-deal="isFlashDeal"
               :live-products="liveProducts" :active-product-id="activeProductId" @trigger-flash-deal="triggerFlashDeal"
               @toggle-product="toggleProduct" />

            <EngagementSettings v-else-if="activeTab === 'engagement'" :active-poll="activePoll" :qa-queue="qaQueue"
               @start-poll="startPoll" @feature-question="featureQuestion" />

            <VibeSettings v-else-if="activeTab === 'vibe'" :vibe-name="currentVibeName" :vibe-score="vibeScore"
               :auto-atmosphere="autoAtmosphere" @update:auto-atmosphere="v => autoAtmosphere = v" />

            <CollaborationSettings v-else-if="activeTab === 'collaboration'" :active-collaborators="activeCollaborators"
               :current-user-id="userStore.user?.id || ''" @invite-cohost="inviteCoHost" />
         </div>
      </div>

      <!-- Modals -->
      <el-dialog v-model="showPlatformSelector" :title="t('studio.tabs.scenes')" width="450px" class="glass-dialog">
         <div class="platform-list">
            <div v-for="acc in availableAccounts" :key="acc._id" class="p-row glass-selectable"
               :class="{ selected: selectedPlatforms.includes(acc._id) }" @click="togglePlatform(acc._id)">
               <div class="p-info">
                  <youtube v-if="acc.platform === 'youtube'" theme="filled" class="youtube" />
                  <facebook v-else-if="acc.platform === 'facebook'" theme="filled" class="facebook" />
                  <tiktok v-else-if="acc.platform === 'tiktok'" theme="filled" class="tiktok" />
                  <broadcast v-else theme="filled" class="ams" />
                  <span>{{ acc.accountName }}</span>
               </div>
            </div>
         </div>
         <template #footer>
            <button class="primary-btn w-full" @click="showPlatformSelector = false">{{ t('common.save') }}</button>
         </template>
      </el-dialog>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useTranslations } from '@/composables/useTranslations';
import axios from 'axios';
import {
   Youtube, Facebook, Tiktok, Close, Shopping, Broadcast, Magic, Effects,
   GraphicDesign, Translation, ChartHistogram, User, ShareTwo
} from '@icon-park/vue-next';

// Components
import StudioHeader from '@/components/studio/StudioHeader.vue';
import StudioRail from '@/components/studio/StudioRail.vue';
import StudioStage from '@/components/studio/StudioStage.vue';
import StageControls from '@/components/studio/StageControls.vue';
import StudioInteractions from '@/components/studio/StudioInteractions.vue';
import FilterSettings from '@/components/studio/drawers/FilterSettings.vue';
import AIPersonaSettings from '@/components/studio/drawers/AIPersonaSettings.vue';
import GraphicSettings from '@/components/studio/drawers/GraphicSettings.vue';
import SceneSettings from '@/components/studio/drawers/SceneSettings.vue';
import GuestSettings from '@/components/studio/drawers/GuestSettings.vue';
import LinguisticSettings from '@/components/studio/drawers/LinguisticSettings.vue';
import CommerceSettings from '@/components/studio/drawers/CommerceSettings.vue';
import EngagementSettings from '@/components/studio/drawers/EngagementSettings.vue';
import VibeSettings from '@/components/studio/drawers/VibeSettings.vue';
import CollaborationSettings from '@/components/studio/drawers/CollaborationSettings.vue';

// Services
import { studioDirector } from '@/utils/ai/StudioDirector.js';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager.js';
import { useUserStore } from '@/stores/user.js';
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher.js';

const router = useRouter();
const userStore = useUserStore();
const { t } = useTranslations();

// State
const currentProject = ref({ title: 'Dynamic Studio Session' });
const isLive = ref(false);
const isRecording = ref(false);
const liveTime = ref(0);
const micOn = ref(true);
const camOn = ref(true);
const activeTab = ref<string | null>(null);
const showPlatformSelector = ref(false);
const showSettings = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);
const messages = ref<any[]>([]);
const activeLikes = ref<any[]>([]);
const currentFilter = ref('none');
const selectedBackground = ref<string | null>(null);
const isGodMode = ref(false);
const currentVibeName = ref('Calm');
const vibeScore = ref(0);
const autoAtmosphere = ref(true);
const branding = ref({ name: 'Alex Thompson', title: 'AI Specialist', color: '#3b82f6' });
const showLowerThird = ref(false);
const showTicker = ref(false);
const activeScene = ref('standard');
const isTranslating = ref(false);
const sourceLang = ref('en-US');
const targetLang = ref('vi-VN');
const currentTranscript = ref('');
const isFlashDeal = ref(false);
const activeProductId = ref<string | null>(null);
const activePoll = ref<any>(null);
const qaQueue = ref<any[]>([]);
const activeCollaborators = ref<any[]>([]);
const remoteGuests = ref<any[]>([]);
const capturedHighlights = ref<any[]>([]);
const enableASL = ref(false);
const audioLevel = ref(0);
const guestPersonas = ref<any[]>([]);
const liveProducts = ref<any[]>([]);

// Virtual Production State
const enableChromakey = ref(false);
const chromaSettings = ref({ similarity: 0.4, smoothness: 0.08 });

const scenes = [
   { id: 'standard', name: 'Default' },
   { id: 'interview', name: 'Interview' },
   { id: 'grid', name: 'Conference' },
   { id: 'shoutout', name: 'Shoutout' },
   { id: 'fullscreen', name: 'Studio Full' }
];

// Template Refs
const sourceVideo = ref<HTMLVideoElement | null>(null);
const outputCanvas = ref<HTMLCanvasElement | null>(null);
const rtcPublisher = ref<WebRTCPublisher | null>(null);

let stream: MediaStream | null = null;
let timerInterval: any = null;

// Logic Methods
const toggleLive = async () => {
   if (!isLive.value) {
      try {
         const res = await axios.post('/api/streaming/start', { platforms: selectedPlatforms.value });
         if (res.data.success) {
            isLive.value = true
            timerInterval = setInterval(() => liveTime.value++, 1000)
            toast.success(t('studio.messages.live'))
            mockChat()
         }
      } catch (e: any) {
         toast.error(t('studio.messages.liveError'))
      }
   } else {
      isLive.value = false
      clearInterval(timerInterval)
      toast.info(t('studio.messages.stopped'))
   }
}

const toggleRecord = () => {
   isRecording.value = !isRecording.value
   toast.info(isRecording.value ? t('studio.messages.recordingStart') : t('studio.messages.recordingSaved'))
}

const spawnLike = () => {
   const id = Date.now();
   activeLikes.value.push({ id, style: { left: `${Math.random() * 80 + 10}%`, animationDelay: `${Math.random() * 0.5}s` } });
   setTimeout(() => { activeLikes.value = activeLikes.value.filter(l => l.id !== id); }, 4000);
};

const mockChat = () => {
   const users = ['Alex (YouTube)', 'Sarah (FB)', 'DevPro (TikTok)'];
   setInterval(() => {
      if (!isLive.value) return;
      messages.value.push({ id: Date.now(), user: users[Math.floor(Math.random() * users.length)], text: t('studio.messages.mockChat'), isSocial: true });
      if (messages.value.length > 50) messages.value.shift();
   }, 5000);
};

const toggleGodMode = () => {
   isGodMode.value = !isGodMode.value;
   studioDirector.setActive(isGodMode.value);
   toast.success(isGodMode.value ? t('studio.messages.godModeOn') : t('studio.messages.godModeOff'));
};

const inviteGuest = () => { /* Logic */ toast.info(t('studio.messages.inviteCopied')); };
const selectStage = (url: string) => { selectedBackground.value = url; };
const toggleLowerThird = () => { showLowerThird.value = !showLowerThird.value; };
const toggleTicker = () => { showTicker.value = !showTicker.value; };
const triggerFlashDeal = () => { isFlashDeal.value = !isFlashDeal.value; };
const toggleProduct = (id: string) => { activeProductId.value = activeProductId.value === id ? null : id; };
const startPoll = () => { /* Poll Logic */ };
const featureQuestion = (q: any) => { /* Q&A Logic */ };
const summonGuest = (g: any) => { syntheticGuestManager.summonGuest(g); };
const toggleGuest = (g: any) => { g.active = !g.active; };
const inviteCoHost = () => { /* Link Logic */ };
const generateMobileLink = () => { /* Pairing Logic */ };

const togglePlatform = (id: string) => {
   const idx = selectedPlatforms.value.indexOf(id);
   if (idx > -1) selectedPlatforms.value.splice(idx, 1);
   else selectedPlatforms.value.push(id);
};

const handleExit = () => { router.push('/dashboard'); };

// Lifecycle
onMounted(async () => {
   try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (sourceVideo.value) sourceVideo.value.srcObject = stream;
      startProcessing();
   } catch (e) { toast.error("Camera required for studio"); }
});

const startProcessing = () => {
   const render = () => {
      if (!outputCanvas.value || !sourceVideo.value) return;
      const ctx = outputCanvas.value.getContext('2d');
      if (ctx) ctx.drawImage(sourceVideo.value, 0, 0, outputCanvas.value.width, outputCanvas.value.height);
      
      // Simulate audio analysis for visual cues
      if (micOn.value) {
         audioLevel.value = 0.2 + Math.random() * 0.4;
      } else {
         audioLevel.value = 0;
      }

      requestAnimationFrame(render);
   };
   render();
};

onUnmounted(() => {
   if (stream) stream.getTracks().forEach(t => t.stop());
   clearInterval(timerInterval);
});

const effectTabs = computed(() => [
   { id: 'filters', name: t('studio.tabs.filters'), icon: Effects },
   { id: 'ai', name: t('studio.tabs.ai'), icon: Magic },
   { id: 'graphics', name: t('studio.tabs.graphics'), icon: GraphicDesign },
   { id: 'scenes', name: t('studio.tabs.scenes'), icon: Broadcast },
   { id: 'guests', name: t('studio.tabs.guests'), icon: 'User' },
   { id: 'linguistic', name: t('studio.tabs.linguistic'), icon: Translation },
   { id: 'commerce', name: t('studio.tabs.commerce'), icon: Shopping },
   { id: 'engagement', name: t('studio.tabs.engagement'), icon: ChartHistogram }
]);

const filters = computed(() => [
   { id: 'none', name: t('studio.filters.none'), preview: '#333' },
   { id: 'dream', name: t('studio.filters.dream'), preview: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)' },
   { id: 'noir', name: t('studio.filters.noir'), preview: '#111' },
   { id: 'vibrant', name: t('studio.filters.vibrant'), preview: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }
]);

const backgrounds = computed(() => [
   { id: 'office', name: t('studio.backgrounds.office'), url: '/bg/office.jpg' },
   { id: 'studio', name: t('studio.backgrounds.studio'), url: '/bg/neon.jpg' }
]);
</script>

<style lang="scss" scoped>
.live-studio {
   width: 100vw;
   height: 100vh;
   background: #080808;
   display: flex;
   flex-direction: column;
   color: #fff;
   overflow: hidden;
}

.studio-main {
   flex: 1;
   display: flex;
   overflow: hidden;

   @media (max-width: 768px) {
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
   }
}

.effects-drawer {
   position: absolute;
   top: 64px;
   left: 72px;
   bottom: 0;
   width: 320px;
   z-index: 50;
   border-right: 1px solid rgba(255, 255, 255, 0.05);
   padding: 0;

   @media (max-width: 768px) {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: translateX(-100%);
      transition: transform 0.3s ease-in-out;
      background: #080808;
      z-index: 100;

      &.open {
         transform: translateX(0);
      }
   }

   .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);

      .drawer-title {
         font-size: 10px;
         font-weight: 900;
         text-transform: uppercase;
         letter-spacing: 2px;
      }
   }

   .marketplace-shortcut {
      font-size: 8px;
      font-weight: 900;
      color: #3b82f6;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      cursor: pointer;
   }
}

.p-row {
   display: flex;
   align-items: center;
   justify-content: space-between;
   padding: 16px;
   border-radius: 16px;
   cursor: pointer;
   margin-bottom: 8px;
   transition: all 0.2s;
   background: rgba(255, 255, 255, 0.03);
   border: 1px solid rgba(255, 255, 255, 0.05);

   &.selected {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
   }

   .p-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 13px;
   }
}

.main-canvas {
   width: 100%;
   height: 100%;
   object-fit: contain;
   border-radius: 20px;
}
</style>
