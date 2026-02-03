<template>
   <div class="live-studio dark-theme">
      <StudioLoading :visible="!isStudioReady" @ready="isStudioReady = true" @exit="handleExit" />
      <StudioHeader :is-live="isLive" :live-time="liveTime" :is-god-mode="studioStore.godModeEnabled"
         :demo-mode="studioStore.demoMode" :title="currentProject?.title || t('studio.title')"
         @toggle-god-mode="toggleGodMode" @toggle-demo="studioStore.toggleDemoMode" @exit="handleExit" />

      <main class="studio-main">
         <StudioRail v-model:active-tab="activeTab" :effect-tabs="currentTabs" />

         <StudioStage :active-likes="activeLikes">
            <template #canvas>
               <div class="relative w-full h-full overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl">
                  <canvas ref="outputCanvas" class="main-canvas"></canvas>
                  <canvas ref="overlayCanvas"
                     class="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"></canvas>
                  <video ref="sourceVideo" autoplay muted playsinline style="display:none"></video>

                  <!-- Network Health Overlay -->
                  <StudioNetworkStats :is-live="isLive" :stats="networkStats"
                     :real-chat-velocity="messages.filter(m => Date.now() - m.timestamp < 30000).length"
                     :session-infra="studioStore.sessionInfra" :quality="streamQuality" />

                  <!-- ASL Visual Interpreter (Accessibility) -->
                  <StudioASLOverlay :enabled="enableASL" />

                  <!-- Visual Audio Cues (For Hearing Impaired) -->
                  <div
                     class="audio-visual-cue absolute bottom-8 left-8 flex items-end gap-1 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5">
                     <div v-for="i in 5" :key="i"
                        class="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-100"
                        :style="{ height: `${Math.random() * (audioLevel * 40 + 5)}px`, opacity: audioLevel > 0.1 ? 1 : 0.3 }">
                     </div>
                     <span class="text-[10px] font-black ml-2"
                        :class="audioLevel > 0.05 ? 'text-blue-400' : 'text-white/20'">{{
                           t('studio.accessibility.liveAudio') }}</span>
                  </div>
               </div>
            </template>
            <template #controls>
               <StageControls :mic-on="micOn" :cam-on="camOn" :is-live="isLive" :is-recording="isRecording"
                  :platform-count="selectedPlatforms.length" :guest-count="waitingGuests.length" :is-guest="isGuest"
                  :is-screen-sharing="studioStore.isScreenSharing" v-model:stream-quality="streamQuality"
                  @toggle-mic="v => micOn = !micOn" @toggle-cam="v => camOn = !camOn" @toggle-screen="toggleScreenShare"
                  @toggle-live="toggleLive" @toggle-record="toggleRecord" @capture-highlight="handleHighlight"
                  @invite-guest="inviteGuest" @show-platforms="showPlatformSelector = true" @exit="handleExit" />
            </template>
         </StudioStage>

         <StudioInteractions :messages="messages" @spawn-like="spawnLike" :guest-personas="guestPersonas"
            :remote-guests="remoteGuests" :invite-guest="inviteGuest" :summon-guest="summonGuest"
            :toggle-guest="toggleGuest" :add-mobile-cam="generateMobileLink" :toggle-mute="studioStore.muteGuest"
            :toggle-camera="studioStore.toggleGuestCamera" :remove-guest="studioStore.kickGuest"
            :assign-slot="studioStore.assignGuestToSlot" :is-guest="isGuest" :guest-video-elements="guestVideoElements"
            :viewers="viewers" :health="studioStore.health" :engagement="studioStore.engagement" />

      </main>


      <!-- Drawer: Effects Panel -->
      <div v-if="activeTab" class="effects-drawer glass-dark animate-slide-left mt-[64px]">
         <header class="drawer-header">
            <h3 class="drawer-title">{{effectTabs.find(t => t.id === activeTab)?.name || activeTab}}</h3>
            <div class="flex items-center gap-3">
               <!-- <button class="marketplace-shortcut" @click="$router.push('/marketplace')">
                  <shopping size="10" /> {{ t('marketplace.title') }}
               </button> -->
               <button @click="activeTab = null" class="close-drawer">
                  <close theme="outline" />
               </button>
            </div>
         </header>
         <div class="drawer-content px-4 py-6 scrollbar-hide overflow-y-auto max-h-[calc(100vh-120px)]">
            <LayoutSettings v-if="activeTab === 'layout'" />

            <FilterSettings v-if="activeTab === 'filters'" :active-filter="currentFilter" :filters="filters"
               :selected-background="selectedBackground || ''" :backgrounds="backgrounds"
               :enable-chromakey="enableChromakey" :chroma-settings="chromaSettings"
               @update:active-filter="f => currentFilter = f" @update:enable-chromakey="v => enableChromakey = v"
               @select-background="selectStage" />

            <AIPersonaSettings v-else-if="activeTab === 'ai' || activeTab === 'virtual'" :personas="guestPersonas"
               @summon-guest="summonGuest" @toggle-guest="toggleGuest" @talk-guest="handleTalkGuest" />

            <GraphicSettings v-else-if="activeTab === 'graphics'" :branding="branding"
               :show-lower-third="showLowerThird" :show-ticker="showTicker" @toggle-lower-third="toggleLowerThird"
               @toggle-ticker="toggleTicker" />

            <!-- <SceneSettings v-else-if="activeTab === 'scenes'" :active-scene="activeScene.id" :scenes="scenes"
               @update:active-scene="s => activeScene = s" /> -->

            <GuestSettings v-else-if="activeTab === 'guests'" :guest-personas="guestPersonas"
               :remote-guests="remoteGuests" :guest-video-elements="guestVideoElements" @invite-guest="inviteGuest"
               @summon-guest="summonGuest" @toggle-guest="toggleGuest" @add-mobile-cam="generateMobileLink"
               @toggle-mute="studioStore.muteGuest" @toggle-camera="studioStore.toggleGuestCamera"
               @remove-guest="studioStore.kickGuest" @assign-slot="studioStore.assignGuestToSlot" />

            <LinguisticSettings v-else-if="activeTab === 'linguistic'" :is-translating="isTranslating"
               :enable-asl="enableASL" :source-lang="sourceLang" :target-lang="targetLang"
               :current-transcript="currentTranscript" @update:is-translating="v => isTranslating = v"
               @update:enable-asl="v => enableASL = v" @update:source-lang="v => sourceLang = v"
               @update:target-lang="v => targetLang = v" />

            <CommerceSettings v-else-if="activeTab === 'commerce'" :is-flash-deal="isFlashDeal"
               :live-products="liveProducts" :active-product-id="activeProductId" @trigger-flash-deal="triggerFlashDeal"
               @toggle-product="toggleProduct" />

            <EngagementSettings v-else-if="activeTab === 'engagement'" :active-poll="activePoll" :qa-queue="qaQueue"
               @start-poll="startPoll" @feature-question="featureQuestion" />

            <VibeSettings v-else-if="activeTab === 'vibe'" :vibe-name="currentVibeName" :vibe-score="vibeScore"
               :auto-atmosphere="autoAtmosphere" @update:auto-atmosphere="v => autoAtmosphere = v" />

            <CollaborationSettings v-else-if="activeTab === 'collaboration'" :active-collaborators="activeCollaborators"
               :current-user-id="userStore.user?.id || ''" @invite-cohost="inviteCoHost" />

            <ResourcePool v-else-if="activeTab === 'resources'" />
         </div>
      </div>

      <!-- Modals -->
      <el-dialog v-model="showPlatformSelector" :title="t('studio.tabs.platforms')" width="450px" class="glass-dialog">
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

      <!-- Settings Modal (Removed in favor of Popover in StageControls) -->

      <!-- Layout Management Drawer -->
      <!-- <LayoutDrawer v-model="showLayoutDrawer" /> -->

      <!-- AI God Mode Control Panel -->
      <GodModePanel v-if="!isGuest" />

      <!-- Guest Management Drawer -->
      <GuestDrawer v-model="showGuestDrawer" :mode="guestDrawerMode" :custom-link="customGuestLink" />
      <!-- Product Management Drawer -->
      <ProductDrawer v-model="showProductDrawer" />
      <!-- Analytics Drawer -->
      <AnalyticsDrawer v-model="showAnalyticsDrawer" />
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { useTranslations } from '@/composables/useTranslations';
import { usePlatformStore } from '@/stores/platform';
import {
   Youtube, Facebook, Tiktok, Close, Shopping,
   Broadcast, Magic, Effects, LayoutThree as Layout,
   GraphicDesign, Translation, ChartHistogram, User, ShareTwo, Hands, Comments
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
import LayoutSettings from '@/components/studio/drawers/LayoutSettings.vue';
import GuestDrawer from '@/components/studio/drawers/GuestDrawer.vue';
import ProductDrawer from '@/components/studio/drawers/ProductDrawer.vue';
import AnalyticsDrawer from '@/components/studio/drawers/AnalyticsDrawer.vue';
import GodModePanel from '@/components/studio/GodModePanel.vue';
import ResourcePool from '@/components/studio/ResourcePool.vue';
import StudioLoading from '@/components/studio/StudioLoading.vue';

// Services
import { studioDirector } from '@/utils/ai/StudioDirector';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager.js';
import { useUserStore } from '@/stores/user.js';
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher.js';
import { ActionSyncService } from '@/utils/ai/ActionSyncService.js';
import { useStudioStore } from '@/stores/studio';
import { QRCodeGenerator } from '@/utils/ai/QRCodeGenerator';
import { useAudioAnalysis } from '@/composables/useAudioAnalysis';

// Studio Composables
import { useStudioCanvas } from '@/composables/studio/useStudioCanvas';
import { useStudioP2P } from '@/composables/studio/useStudioP2P';
import { useStudioSession } from '@/composables/studio/useStudioSession';

// Studio Overlays
import StudioNetworkStats from '@/components/studio/overlays/StudioNetworkStats.vue';
import StudioASLOverlay from '@/components/studio/overlays/StudioASLOverlay.vue';
import { useStreamingStore } from '@/stores/streaming';
import { useUIStore } from '@/stores/ui';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const studioStore = useStudioStore();
const uiStore = useUIStore();
const streamingStore = useStreamingStore();
const platformStore = usePlatformStore();
const { t } = useTranslations();

// Role & Session Detection
const isGuest = computed(() => route.query.role === 'guest' || !!route.query.token);
const guestName = computed(() => (route.query.guestName as string) || (route.query.name as string) || 'Guest');
const hostId = computed(() => route.query.hostId as string);
const waitingGuests = computed(() => studioStore.waitingGuests);

const qualityPresets = {
   low: { video: 500, audio: 64, fps: 30, width: 640, height: 360, label: 'Low (360p @ 30fps)' },
   medium: { video: 1200, audio: 128, fps: 30, width: 854, height: 480, label: 'Medium (480p @ 30fps)' },
   high: { video: 2500, audio: 160, fps: 30, width: 1280, height: 720, label: 'High (720p @ 30fps)' },
   ultra: { video: 4500, audio: 192, fps: 30, width: 1920, height: 1080, label: 'Ultra (1080p @ 30fps)' }
};

// State
const currentProject = ref({ title: 'Dynamic Studio Session' });
const micOn = ref(true);
const camOn = ref(true);
const activeTab = ref<string | null>(null);
const showPlatformSelector = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);
const messages = ref<any[]>([]);
const activeLikes = ref<any[]>([]);
const currentFilter = ref('none');
const selectedBackground = ref<string | null>(null);
const branding = ref({ name: 'Alex Thompson', title: 'AI Specialist', color: '#3b82f6' });
const showLowerThird = ref(false);
const showGuestDrawer = ref(false);
const guestDrawerMode = ref<'invite' | 'mobile'>('invite');
const customGuestLink = ref<string | null>(null);
const showLayoutDrawer = ref(false);
const showProductDrawer = ref(false);
const showAnalyticsDrawer = ref(false);
const showTicker = ref(false);
const isTranslating = ref(false);
const sourceLang = ref('en-US');
const targetLang = ref('vi-VN');
const currentTranscript = ref('');
const isFlashDeal = computed(() => !!studioStore.activeFlashSale);
const activeProductId = computed(() => studioStore.activeProductId);
const liveProducts = computed(() => studioStore.liveProducts);
const qaQueue = ref<any[]>([]);
const purchaseNotifications = ref<any[]>([]);
const enableASL = ref(false);
const streamQuality = ref('high');
const networkStats = ref<any>(null);

// Additional UI State
const activePoll = ref<any>(null);
const enableChromakey = ref(false);
const chromaSettings = ref({ keyColor: '#00ff00', similarity: 0.1, smoothness: 0.05 });
const guestPersonas = computed(() => syntheticGuestManager.getPersonaLibrary());
const currentVibeName = ref('Techno Chill');
const vibeScore = ref(85);
const autoAtmosphere = ref(true);
const activeCollaborators = computed(() => studioStore.coHosts);
const currentWebRTCUrl = ref<string | null>(null);
const isStudioReady = ref(false);

// Screen Sharing
const screenStream = ref<MediaStream | null>(null);
const screenVideo = ref<HTMLVideoElement | null>(null);

// Media Resources
const activeMediaVideo = ref<HTMLVideoElement | null>(null);

watch(() => studioStore.activeMediaId, (id) => {
   if (!id) {
      if (activeMediaVideo.value) {
         activeMediaVideo.value.pause();
         activeMediaVideo.value.src = '';
      }
      return;
   }
   const asset = studioStore.resourcePool.find(r => r.id === id);
   if (asset && asset.type === 'video') {
      if (!activeMediaVideo.value) {
         activeMediaVideo.value = document.createElement('video');
         activeMediaVideo.value.autoplay = true;
         activeMediaVideo.value.loop = true;
         activeMediaVideo.value.muted = true;
         activeMediaVideo.value.playsInline = true;
      }
      activeMediaVideo.value.src = asset.url;
      activeMediaVideo.value.play();
   }
});

const toggleScreenShare = async () => {
   if (studioStore.isScreenSharing) {
      if (screenStream.value) {
         screenStream.value.getTracks().forEach(t => t.stop());
         screenStream.value = null;
      }
      studioStore.isScreenSharing = false;
      toast.info('Screen share stopped');
   } else {
      try {
         const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' } as any,
            audio: { echoCancellation: true, noiseSuppression: true } as any
         });

         screenStream.value = stream;
         studioStore.isScreenSharing = true;
         toast.success('Sharing screen');

         stream.getVideoTracks()[0].onended = () => {
            studioStore.isScreenSharing = false;
            screenStream.value = null;
         };

         if (!screenVideo.value) {
            screenVideo.value = document.createElement('video');
            screenVideo.value.autoplay = true;
            screenVideo.value.muted = true;
            screenVideo.value.playsInline = true;
            screenVideo.value.style.display = 'none';
            document.body.appendChild(screenVideo.value);
         }
         screenVideo.value.srcObject = stream;

      } catch (err) {
         console.error('Screen share abort:', err);
      }
   }
};

// Audio Analysis
const { audioLevel: hostLevel, isSpeaking: hostSpeaking, updateStream: updateAudioStream } = useAudioAnalysis(null);
const guestLevels = ref<Record<string, number>>({});

// Template Refs
const sourceVideo = ref<HTMLVideoElement | null>(null);

watch(micOn, (val) => {
   if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = val);
   }
});

watch(camOn, (val) => {
   if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = val);
   }
});
const outputCanvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);

const hostStream = ref<MediaStream | null>(null);
const canvasStream = ref<MediaStream | null>(null);
let stream: MediaStream | null = null; // Still keep for legacy if needed, but we'll use ref

// Composables Integration
const { guestVideos, guestVideoElements, syncGuestVideos, stopGuestSubscriber, initiateAsGuest } = useStudioP2P(hostStream, canvasStream, isGuest);

const { isLive, isRecording, liveTime, currentSessionId, toggleLive: baseToggleLive, stopLive } = useStudioSession(
   outputCanvas,
   hostStream,
   {
      streamQuality,
      currentProject,
      selectedPlatforms,
      availableAccounts,
      networkStats,
      qualityPresets
   }
);

const { frameCount, audioLevel, startRendering, stopRendering } = useStudioCanvas(
   outputCanvas,
   sourceVideo,
   guestVideos,
   {
      streamQuality,
      enableASL,
      purchaseNotifications,
      hostLevel,
      guestLevels,
      isGuest,
      myGuestId: computed(() => studioStore.myGuestId),
      screenVideo,
      activeMediaVideo,
      realChatVelocity: computed(() => {
         const now = Date.now();
         return messages.value.filter(m => now - m.timestamp < 30000).length;
      })
   },
   overlayCanvas
);

// Process AI decisions if God Mode is on
const processGodModeDecisions = async () => {
   if (!studioStore.godModeEnabled) return;

   const context = {
      voiceLevel: audioLevel.value,
      activeGuests: studioStore.liveGuests.length,
      chatVelocity: messages.value.filter(m => Date.now() - m.timestamp < 60000).length,
      currentSceneId: studioStore.activeScene.id,
      guestLevels: Object.values(guestLevels.value),
      isTransitioning: false
   };

   const decision = await studioDirector.tick(context as any);
   if (decision.action === 'switch_scene' && decision.payload) {
      studioStore.switchScene(decision.payload);
      toast.info(`AI Choice: ${decision.payload}`);
   }
};

// Watch for God Mode throttled logic
watch(frameCount, (val) => {
   if (studioStore.godModeEnabled && val % 120 === 0) { // Every 4 seconds at 30fps
      processGodModeDecisions();
   }
});

watch(isTranslating, (val) => {
   if (val) {
      const phrases = [
         "The potential of AI in entertainment is limitless.",
         "Autonomous broadcasts are becoming the new standard.",
         "Real-time commerce bridges the gap between content and sales.",
         "Welcome to the Singularity phase of AntFlow."
      ];
      let i = 0;
      const interval = setInterval(() => {
         if (!isTranslating.value) {
            clearInterval(interval);
            currentTranscript.value = '';
            return;
         }
         currentTranscript.value = phrases[i % phrases.length];
         i++;
      }, 4000);
   }
});

// Methods & Actions
const toggleLive = async () => {
   const result = await baseToggleLive();
   if (result === 'select_platform') {
      showPlatformSelector.value = true;
   }
};

const toggleGodMode = () => {
   studioStore.toggleGodMode();
   if (studioStore.godModeEnabled) {
      toast.success(t('studio.messages.godModeEnabled'));
      studioDirector.setActive(true);
   } else {
      toast.info(t('studio.messages.godModeDisabled'));
      studioDirector.setActive(false);
   }
};


const toggleRecord = () => {
   isRecording.value = !isRecording.value;
   if (isRecording.value) {
      toast.success(t('studio.messages.recordingStarted'));
   } else {
      toast.info(t('studio.messages.recordingSaved'));
   }
};

const handleHighlight = async () => {
   if (!currentSessionId.value) return;
   await studioStore.captureHighlight(currentSessionId.value);
};

watch(() => studioStore.demoMode, (val) => {
   if (val) {
      if (!isLive.value) toggleLive();
      mockChat();
   }
});

const spawnLike = () => {
   const id = Math.random().toString(36).substr(2, 9);
   const style = {
      left: `${20 + Math.random() * 60}%`,
      animationDuration: `${1.5 + Math.random()}s`
   };
   activeLikes.value.push({ id, style });
   setTimeout(() => {
      activeLikes.value = activeLikes.value.filter(l => l.id !== id);
   }, 2000);
}

const spawnPurchaseNotification = (userName: string, productName: string) => {
   const id = Math.random().toString(36).substr(2, 9);
   const notification = {
      id,
      text: `${userName} joined the revolution!`,
      subtext: `Purchased ${productName}`,
      type: 'purchase',
      icon: 'Shopping',
      opacity: 0,
      y: 100,
      startTime: Date.now()
   };
   purchaseNotifications.value.push(notification as any);

   // Auto-remove after 5 seconds
   setTimeout(() => {
      purchaseNotifications.value = purchaseNotifications.value.filter((n: any) => n.id !== id);
   }, 5000);
};

// Stats & Vibe Automation
const viewers = computed(() => studioStore.viewerCount);
const health_status = computed(() => studioStore.health.status);
const bitrate = computed(() => studioStore.health.bitrate);

// Translation Automation
let transcriptTimer: any = null;
watch(isTranslating, (val) => {
   if (val) {
      transcriptTimer = setInterval(() => {
         const phrases = [
            "Welcome to AntFlow Studio.",
            "Today we are exploring AI Guest interactions.",
            "Our neural engine is processing responses in real-time.",
            "Look at the cognitive glow on the synthetic models.",
            "Broadcasting across multiple channels simultaneously."
         ];
         currentTranscript.value = phrases[Math.floor(Math.random() * phrases.length)];
      }, 4000);
   } else {
      clearInterval(transcriptTimer);
      currentTranscript.value = '';
   }
});

watch(autoAtmosphere, (enabled) => {
   if (enabled) {
      startVibeDrift();
   }
});

let vibeTimer: any = null;
const startVibeDrift = () => {
   if (vibeTimer) return;
   vibeTimer = setInterval(() => {
      if (!autoAtmosphere.value) return;

      // Random drift for vibe
      const drift = (Math.random() - 0.5) * 5;
      vibeScore.value = Math.max(0, Math.min(100, vibeScore.value + drift));

      if (vibeScore.value > 80) currentVibeName.value = 'Hype Energy';
      else if (vibeScore.value > 40) currentVibeName.value = 'Techno Chill';
      else currentVibeName.value = 'Deep Focus';

      // Update viewer count randomly
      studioStore.viewerCount = Math.max(10, Math.round(studioStore.viewerCount + (Math.random() - 0.4) * 20));

      // Mock Health updates
      studioStore.updateHealth({
         bitrate: 2500 + Math.random() * 500,
         fps: 30,
         rtt: 20 + Math.random() * 10
      });
   }, 5000);
};

const activeScene = computed({
   get: () => studioStore.activeScene,
   set: (val) => studioStore.switchScene(val.id)
});

const remoteGuests = computed(() => studioStore.liveGuests);
const scenes = computed(() => studioStore.scenes);

const summonGuest = (persona: any) => {
   syntheticGuestManager.summonGuest(persona);
   toast.success(`Summoning ${persona.name}...`);
}

const toggleGuest = (guest: any) => {
   guest.active = !guest.active;
}

const handleTalkGuest = async ({ id, prompt }: { id: string, prompt: string }) => {
   const res = await syntheticGuestManager.generateResponse(id, prompt);
   if (res) {
      toast.info(`${guestPersonas.value.find(p => p.id === id)?.name || id} is responding...`);
   }
};

const toggleLowerThird = () => {
   showLowerThird.value = !showLowerThird.value;
}

const toggleTicker = () => {
   showTicker.value = !showTicker.value;
}

const generateMobileLink = async () => {
   const sessionId = currentSessionId.value;
   if (!sessionId) return;

   let token = '';
   // Ensure we have a secure invite token
   if (studioStore.guestJoinLink) {
      token = studioStore.guestJoinLink.split('/').pop() || '';
   } else {
      const inviteUrl = await studioStore.generateInvite(sessionId);
      if (inviteUrl) {
         token = inviteUrl.split('/').pop() || '';
      }
   }

   const name = `MobileCam_${Math.floor(Math.random() * 1000)}`;
   const link = `${window.location.origin}/remote-cam?session=${sessionId}&token=${token}&name=${name}`;

   customGuestLink.value = link;
   guestDrawerMode.value = 'mobile';
   showGuestDrawer.value = true;
};

const inviteGuest = () => {
   customGuestLink.value = null;
   guestDrawerMode.value = 'invite';
   showGuestDrawer.value = true;
};



const mockChat = () => {
   const interval = setInterval(() => {
      if (!isLive.value) {
         clearInterval(interval);
         return;
      }
      messages.value.push({
         id: Date.now(),
         user: 'Fan_' + Math.floor(Math.random() * 1000),
         text: 'ANTFLOW IS THE FUTURE! 🚀🔥',
         timestamp: Date.now(),
         avatar: ''
      });
      if (messages.value.length > 50) messages.value.shift();

      // Auto-trigger likes
      if (Math.random() > 0.5) spawnLike();

      // Occasionally spawn a purchase notification
      if (Math.random() > 0.8) {
         const users = ['Alex', 'Karik', 'Suboi', 'JustaTee'];
         const products = ['Ultra Pro Mic', 'Halo Light', 'AntFlow Box'];
         spawnPurchaseNotification(
            users[Math.floor(Math.random() * users.length)],
            products[Math.floor(Math.random() * products.length)]
         );
      }
   }, 3000);
}

const selectStage = (bg: any) => {
   if (bg.id === 'none') {
      studioStore.visualSettings.background.mode = 'none';
      studioStore.visualSettings.background.assetUrl = null;
   } else if (bg.id === 'blur') {
      studioStore.visualSettings.background.mode = 'blur';
      studioStore.visualSettings.background.assetUrl = null;
   } else {
      studioStore.visualSettings.background.mode = 'virtual';
      studioStore.visualSettings.background.assetUrl = bg.url;
      studioStore.visualSettings.background.isAssetVideo = bg.isVideo || false;

      // Persistence for custom uploads
      if (bg.id.startsWith('custom_') && !studioStore.backgroundAssets.find(a => a.id === bg.id)) {
         studioStore.addCustomBackground(bg);
      }
   }

   selectedBackground.value = bg.url;
   toast.info(`Scene updated: ${bg.name}`);
}

const startPoll = (pollData: any) => {
   // Use data from emitter if provided, otherwise fallback to mock
   const poll = (pollData && typeof pollData === 'object' && pollData.question) ? pollData : {
      id: 'poll_' + Date.now(),
      question: 'Should we summon more AI guests?',
      options: [
         { label: 'YES - Bring them in!', votes: 12 },
         { label: 'NO - Keep it human', votes: 3 }
      ],
      totalVotes: 15
   };

   // Ensure totalVotes is at least 1 for display logic
   if (!poll.totalVotes) poll.totalVotes = poll.options.reduce((acc: number, o: any) => acc + o.votes, 0) || 1;

   activePoll.value = poll;
   toast.success(t('studio.messages.pollStarted'));

   // Auto-resolve after 60s
   setTimeout(() => {
      activePoll.value = null;
      toast.info("Poll concluded.");
   }, 60000);
}

const featureQuestion = (q: any) => {
   // Remove from chat if needed, but here we just add to QA Queue
   if (!qaQueue.value.find(item => item.id === q.id)) {
      qaQueue.value.push(q);
      toast.info(t('studio.messages.questionFeatured'));
   }
}

const triggerFlashDeal = () => {
   if (isFlashDeal.value) {
      studioStore.endFlashSale();
   } else {
      studioStore.startFlashSale({
         id: 'flash_' + Date.now(),
         discount: 30,
         duration: 300,
         title: 'LIVE FLASH SALE'
      });
   }
}

const toggleProduct = (productId: string) => {
   if (activeProductId.value === productId) {
      studioStore.removeProduct(productId);
   } else {
      const product = studioStore.liveProducts.find((p: any) => p.id === productId || p._id === productId);
      if (product) {
         studioStore.showcaseProduct(product);
      } else {
         studioStore.showcaseProduct({ id: productId });
      }
   }
}

const inviteCoHost = () => {
   const link = `${uiStore.domain}/studio/join/${currentSessionId.value}?role=cohost`;
   navigator.clipboard.writeText(link);
   toast.success("Co-host invite link copied to clipboard!");

   // Mock co-host joining after 10s
   setTimeout(() => {
      studioStore.addCoHost({
         id: 'host_' + Math.random().toString(36).substr(2, 5),
         name: 'Creative Director',
         status: 'online',
         avatar: '',
         permissions: ['admin', 'graphics']
      });
      toast.info("Creative Director joined as co-host");
   }, 5000);
}

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

      // Pre-calculate WebRTC URL if AMS is available (needed for guest subs even before going live)
      const ams = platformStore.accounts.find((a: any) => a.platform === 'ant_media' && a.isActive);
      if (ams && ams.credentials?.serverUrl) {
         const serverUrl = ams.credentials.serverUrl;
         const appName = ams.credentials.appName || 'WebRTCAppEE';
         const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
         const wsHost = new URL(serverUrl).host;
         currentWebRTCUrl.value = `${wsProtocol}//${wsHost}/${appName}/websocket`;
      }
   } catch (e) { }
};
onMounted(() => {
   // Ensure Socket is connected for relay/collaboration
   if (userStore.token) {
      // Connect to session-specific room if available, otherwise fallback to global
      const roomId = currentSessionId.value || 'studio_global';
      ActionSyncService.connect(roomId, userStore.token);

      // Listen for relay stream status (errors/stops)
      const socket = ActionSyncService.getSocket();
      if (socket) {
         socket.off('stream:status'); // Prevent duplicates
         socket.on('stream:status', (data: { sessionId: string, status: string, error?: string }) => {
            if (data.sessionId === currentSessionId.value && (data.status === 'error' || data.status === 'stopped')) {
               console.warn(`[Studio] Stream stopped by server: ${data.error}`);
               toast.error(`Stream stopped: ${data.error || 'Server error'}`);

               // Force stop local state via composable
               if (isLive.value) {
                  stopLive();
               }
            }
         });

         // Listen for Live Commerce Purchases
         socket.off('commerce:purchase');
         socket.on('commerce:purchase', (data: { userName: string, productName: string }) => {
            spawnPurchaseNotification(data.userName, data.productName);
            toast.info(`🛒 ${data.userName} just bought ${data.productName}!`);
         });
      }
   }

   // Auto-select if query param exists
   const qPlatformId = route.query.platformId as string;
   if (qPlatformId) {
      if (availableAccounts.value.find(a => a._id === qPlatformId)) {
         selectedPlatforms.value = [qPlatformId];
         toast.success('Platform pre-selected');
      }
   }
});

const handleKeyPress = (event: KeyboardEvent) => {
   if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

   const key = event.key;
   if (key >= '1' && key <= '9') {
      const sceneIndex = parseInt(key) - 1;
      const scene = studioStore.scenes[sceneIndex];
      if (scene) {
         studioStore.switchScene(scene.id);
         toast.info(`Switched to ${scene.name}`);
      }
   }
};

const handleExit = () => {
   if (isGuest.value) {
      ActionSyncService.disconnect();
      return router.push('/');
   }

   if (isLive.value) {
      toast.error(t('studio.messages.stopLiveFirst'));
      return;
   }
   router.push('/platforms');
};

// Lifecycle
onMounted(async () => {
   window.addEventListener('keydown', handleKeyPress);
   try {
      stream = await navigator.mediaDevices.getUserMedia({
         video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: 1.777
         },
         audio: true
      });
      hostStream.value = stream;

      const setCanvasSize = () => {
         const quality = (qualityPresets as any)[streamQuality.value];
         if (outputCanvas.value) {
            outputCanvas.value.width = quality.width;
            outputCanvas.value.height = quality.height;
            if (overlayCanvas.value) {
               overlayCanvas.value.width = quality.width;
               overlayCanvas.value.height = quality.height;
            }

            // Capture Canvas Stream for Host (Broadcasting/Recording)
            if (!isGuest.value && !canvasStream.value) {
               try {
                  canvasStream.value = (outputCanvas.value as any).captureStream(30);
               } catch (e) {
                  console.error("Failed to capture canvas stream:", e);
               }
            }
         }
      };

      setCanvasSize();

      if (sourceVideo.value) {
         sourceVideo.value.srcObject = stream;
         updateAudioStream(stream);
         sourceVideo.value.onloadedmetadata = () => {
            // Already set by setCanvasSize, but redundant check is fine
            setCanvasSize();
            sourceVideo.value?.play();
            startRendering();
         };

         // Fallback if metadata is already loaded or doesn't trigger
         if (sourceVideo.value.readyState >= 2) {
            startRendering();
         }
      }

      if (isGuest.value) {
         // Guest Startup Flow
         const token = route.query.token as string;
         const sessionId = route.query.sessionId as string;
         if (sessionId && token) {
            ActionSyncService.connect(sessionId, token, { displayName: guestName.value });
            if (hostId.value) {
               setTimeout(() => initiateAsGuest(hostId.value), 2000);
            }
         }
         currentProject.value = { title: `${t('studio.guest')} - ${guestName.value}` };

         // Handle Host Controls
         window.addEventListener('guest:control', (e: any) => {
            const { action, value } = e.detail;
            console.log(`[Guest] Remote Control: ${action} = ${value}`);
            if (action === 'audio') {
               micOn.value = value;
               toast.info(value ? "Host unmuted your mic" : "Host muted your mic");
            } else if (action === 'video') {
               camOn.value = value;
               toast.info(value ? "Host enabled your camera" : "Host disabled your camera");
            } else if (action === 'kick') {
               router.push('/');
               toast.error("Removed by host");
            }
         });

         // Handle Approval Permissions
         window.addEventListener('guest:approved', (e: any) => {
            const perms = e.detail.permissions;
            if (perms) {
               micOn.value = perms.micEnabled;
               camOn.value = perms.camEnabled;
            }
         });
      } else {
         // Host Startup Flow
         await fetchAccounts();
         await syntheticGuestManager.syncLibrary(); // Sync AI Souls

         // Initialize Mock Products if empty
         if (studioStore.liveProducts.length === 0) {
            studioStore.liveProducts = [
               { id: 'p1', title: 'AntFlow Ultra Pro', price: '$299', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=150' },
               { id: 'p2', title: 'Neural Light Ring', price: '$79', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=150' },
               { id: 'p3', title: 'Studio Diffuser Box', price: '$120', image: 'https://images.unsplash.com/photo-1616423641324-5e6bc906d200?auto=format&fit=crop&w=150' }
            ];
         }
         startVibeDrift();
         try {
            const data = await streamingStore.prepareSession();
            if (data.success) {
               currentSessionId.value = data.data.sessionId;
               studioStore.currentSessionId = data.data.sessionId;
            }
         } catch (e) {
            console.error("[Studio] Session prepare failed", e);
         }
      }
   } catch (e) {
      console.error(e);
      toast.error("Camera required for studio");
   }
});

onUnmounted(() => {
   window.removeEventListener('keydown', handleKeyPress);
   if (stream) stream.getTracks().forEach(t => t.stop());
   stopRendering();
});

const effectTabs = computed(() => [
   // { id: 'layout', name: t('studio.tabs.layout'), icon: Layout },
   { id: 'filters', name: t('studio.tabs.filters'), icon: Effects },
   { id: 'ai', name: t('studio.tabs.ai'), icon: Magic },
   { id: 'graphics', name: t('studio.tabs.graphics'), icon: GraphicDesign },
   // { id: 'guests', name: t('studio.tabs.guests'), icon: User },
   { id: 'linguistic', name: t('studio.tabs.linguistic'), icon: Translation },
   { id: 'commerce', name: t('studio.tabs.commerce'), icon: Shopping },
   { id: 'engagement', name: t('studio.tabs.engagement'), icon: ChartHistogram }
]);

const currentTabs = computed(() => {
   if (isGuest.value) {
      return [
         // { id: 'guests', name: t('studio.tabs.guests'), icon: User },
         { id: 'engagement', name: t('studio.tabs.chat'), icon: Comments },
      ];
   }
   return effectTabs.value;
});

const filters = computed(() => [
   { id: 'none', name: t('studio.filters.none'), preview: '#333' },
   { id: 'dream', name: t('studio.filters.dream'), preview: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)' },
   { id: 'noir', name: t('studio.filters.noir'), preview: '#111' },
   { id: 'vibrant', name: t('studio.filters.vibrant'), preview: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }
]);

const backgrounds = computed(() => studioStore.backgroundAssets);

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
   position: relative;

   @media (max-width: 768px) {
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
   }
}

.main-canvas {
   width: 100%;
   height: 100%;
   object-fit: contain;
   border-radius: 20px;
}

/* Studio Global Elements */
:deep(.glass-dark) {
   background: rgba(10, 10, 10, 0.8);
   backdrop-filter: blur(20px);
   -webkit-backdrop-filter: blur(20px);
   border: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.side-rail) {
   width: 72px;
   display: flex;
   flex-direction: column;
   align-items: center;
   padding: 16px 0;
   gap: 8px;
   border-right: 1px solid rgba(255, 255, 255, 0.05);
   z-index: 60;

   .rail-item {
      width: 56px;
      height: 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      color: rgba(255, 255, 255, 0.4);

      &:hover {
         background: rgba(255, 255, 255, 0.05);
         color: #fff;
      }

      &.active {
         background: rgba(59, 130, 246, 0.1);
         color: #3b82f6;
         border: 1px solid rgba(59, 130, 246, 0.2);
      }

      .label {
         font-size: 8px;
         font-weight: 900;
         text-transform: uppercase;
         letter-spacing: 0.5px;
      }
   }
}

.effects-drawer {
   position: absolute;
   top: 0;
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

.close-drawer {
   width: 24px;
   height: 24px;
   display: flex;
   align-items: center;
   justify-content: center;
   background: rgba(255, 255, 255, 0.05);
   border-radius: 50%;
   color: #fff;
   cursor: pointer;
   border: none;
   transition: all 0.2s;

   &:hover {
      background: rgba(255, 255, 255, 0.2);
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

.animate-slide-left {
   animation: slideLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideLeft {
   from {
      transform: translateX(-100%);
      opacity: 0;
   }

   to {
      transform: translateX(0);
      opacity: 1;
   }
}
</style>
