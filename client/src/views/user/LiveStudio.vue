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

                  <!-- Network Health Overlay -->
                  <div v-if="isLive && networkStats"
                     class="absolute top-8 right-8 flex flex-col items-end gap-2 z-30 animate-in pointer-events-none">
                     <div
                        class="px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl flex items-center gap-3">
                        <div class="flex flex-col items-end">
                           <span class="text-[8px] font-black text-white/30 uppercase tracking-widest">Network
                              Health</span>
                           <div class="flex items-center gap-1.5">
                              <div class="w-2 h-2 rounded-full"
                                 :class="networkStats.rtt > 150 ? 'bg-red-500 animate-pulse' : (networkStats.rtt > 100 ? 'bg-yellow-500' : 'bg-green-500')">
                              </div>
                              <span class="text-[10px] font-black"
                                 :class="networkStats.rtt > 150 ? 'text-red-400' : (networkStats.rtt > 100 ? 'text-yellow-400' : 'text-green-400')">
                                 {{ networkStats.rtt > 150 ? 'CRITICAL' : (networkStats.rtt > 100 ? 'STRESSED' :
                                    'STABLE') }}
                              </span>
                           </div>
                        </div>
                     </div>

                     <!-- Stats Detail -->
                     <div class="flex gap-2">
                        <div
                           class="px-3 py-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col items-center min-w-[60px]">
                           <span class="text-[7px] font-bold text-white/40 uppercase">Bitrate</span>
                           <span class="text-[11px] font-black text-blue-400">{{ networkStats.bitrate }}k</span>
                        </div>
                        <div
                           class="px-3 py-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col items-center min-w-[60px]">
                           <span class="text-[7px] font-bold text-white/40 uppercase">RTT</span>
                           <span class="text-[11px] font-black"
                              :class="networkStats.rtt > 100 ? 'text-yellow-400' : 'text-white'">{{ networkStats.rtt
                              }}ms</span>
                        </div>
                     </div>

                     <!-- Auto Recommendation Tooltip -->
                     <div v-if="networkStats.rtt > 100 && streamQuality !== 'low'"
                        class="mt-2 px-4 py-3 bg-yellow-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl max-w-[200px] shadow-2xl">
                        <div class="flex gap-3">
                           <i class="ri-error-warning-fill text-yellow-400 text-xl font-inner-shadow"></i>
                           <div class="flex flex-col">
                              <span class="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Lag
                                 Detected</span>
                              <p class="text-[9px] font-bold text-white/70 leading-relaxed">Network delay is high.
                                 Switching to <span class="text-yellow-400 font-black">Low Quality</span> is
                                 recommended.</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <!-- ASL Visual Interpreter (Accessibility) -->
                  <div v-if="enableASL"
                     class="asl-interpreter animate-in absolute bottom-8 right-8 w-48 aspect-video bg-black/60 backdrop-blur-xl border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl z-20">
                     <div class="absolute inset-0 flex flex-col items-center justify-center p-4">
                        <div class="w-full flex justify-between items-center mb-2 px-2">
                           <span class="text-[8px] font-black text-blue-400 uppercase tracking-widest">{{
                              t('studio.accessibility.aslTitle') }}</span>
                           <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        </div>
                        <!-- Mock ASL Animation/Visual -->
                        <div
                           class="flex-1 w-full bg-blue-500/10 rounded-xl border border-white/5 flex items-center justify-center">
                           <i class="ri-hand-coin-line text-3xl text-blue-400"></i>
                        </div>
                        <p class="mt-2 text-[9px] font-bold text-white/50 text-center uppercase">{{
                           t('studio.accessibility.translating') }}</p>
                     </div>
                  </div>

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

      <!-- Settings Modal -->
      <transition name="fade">
         <div v-if="showSettings"
            class="absolute inset-0 bg-black/90 backdrop-blur-2xl z-50 p-12 overflow-y-auto w-full h-full">
            <div class="max-w-xl mx-auto">
               <div class="flex justify-between items-center mb-12">
                  <h2 class="text-3xl font-black uppercase tracking-tighter italic text-white">Studio Settings</h2>
                  <button @click="showSettings = false"
                     class="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white">
                     <close theme="outline" size="24" />
                  </button>
               </div>

               <div class="space-y-10">
                  <!-- Quality Preset Selector -->
                  <div class="space-y-4">
                     <label class="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Streaming
                        Quality</label>
                     <div class="grid grid-cols-3 gap-3">
                        <button v-for="(v, k) in qualityPresets" :key="k" @click="streamQuality = k"
                           class="p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 group w-full"
                           :class="streamQuality === k ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'">
                           <span class="text-xs font-black uppercase tracking-widest"
                              :class="streamQuality === k ? 'text-white' : 'text-white/40'">{{ k }}</span>
                           <span class="text-[8px] font-bold text-center opacity-50 text-white">{{ v.label }}</span>
                        </button>
                     </div>
                     <p class="text-[10px] text-white/20 italic">Recommendation: Use 'Low' if your RTT is high (>100ms)
                        or
                        network is unstable.</p>
                  </div>

                  <div class="pt-8 border-t border-white/5">
                     <p class="text-[9px] font-black text-white/10 uppercase tracking-widest text-center">Version
                        2.5.0-premium</p>
                  </div>
               </div>
            </div>
         </div>
      </transition>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { useTranslations } from '@/composables/useTranslations';
import axios from 'axios';
import {
   Youtube, Facebook, Tiktok, Close, Shopping, Broadcast, Magic, Effects,
   GraphicDesign, Translation, ChartHistogram, User, ShareTwo, Hands
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
import { ActionSyncService } from '@/utils/ai/ActionSyncService.js';

const router = useRouter();
const route = useRoute();
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
const streamQuality = ref('high');
const networkStats = ref<any>(null);

const qualityPresets = {
   low: { video: 500, audio: 64, fps: 30, width: 640, height: 360, label: 'Low (360p @ 30fps)' },
   medium: { video: 1200, audio: 128, fps: 30, width: 854, height: 480, label: 'Medium (480p @ 30fps)' },
   high: { video: 2500, audio: 160, fps: 30, width: 1280, height: 720, label: 'High (720p @ 30fps)' },
   ultra: { video: 4500, audio: 192, fps: 30, width: 1920, height: 1080, label: 'Ultra (1080p @ 30fps)' }
};

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
const mediaRecorder = ref<MediaRecorder | null>(null);

let stream: MediaStream | null = null;
let timerInterval: any = null;
const currentSessionId = ref<string | null>(null);

// Logic Methods
const toggleLive = async () => {
   if (!isLive.value) {
      if (selectedPlatforms.value.length === 0) {
         toast.error(t('studio.messages.selectPlatform'));
         showPlatformSelector.value = true;
         return;
      }
      try {
         // Auto-setup live info for platforms that support it if streamKey is missing
         for (const pId of selectedPlatforms.value) {
            const acc = availableAccounts.value.find(a => a._id === pId);
            if (acc && !acc.streamKey && (acc.platform === 'youtube' || acc.platform === 'ant-media')) {
               toast.info(`Configuring live stream for ${acc.accountName}...`);
               const infoRes = await axios.get(`/api/platforms/${pId}/live-info`, {
                  params: {
                     title: currentProject.value.title,
                     description: 'Live via AntFlow'
                  }
               });
               if (infoRes.data.success) {
                  acc.streamKey = infoRes.data.data.streamKey;
                  acc.rtmpUrl = infoRes.data.data.rtmpUrl;
               }
            }
         }

         // 1. Using platformAccountIds to start the session on backend
         const quality = (qualityPresets as any)[streamQuality.value];
         const res = await axios.post('/api/streaming/start', {
            platformAccountIds: selectedPlatforms.value,
            source: 'webrtc',
            quality: {
               width: quality.width,
               height: quality.height,
               videoBitrate: quality.video,
               audioBitrate: quality.audio,
               fps: quality.fps
            }
         });

         if (res.data.success) {
            const { sessionId, mode, amsAccount } = res.data.data;
            currentSessionId.value = sessionId;

            console.log(`[Studio] Start response: session=${sessionId}, mode=${mode}, amsId=${amsAccount?._id}`);

            // 2. Start WebRTC Publisher based on the mode returned by backend
            if (mode === 'webrtc_ams' && amsAccount) {
               const serverUrl = amsAccount.credentials.serverUrl;
               const appName = amsAccount.credentials.appName || 'WebRTCAppEE';
               const streamId = amsAccount.streamKey;

               console.log(`[Studio] Publishing to bridge: ${serverUrl}/${appName}/${streamId}`);

               if (serverUrl && streamId) {
                  const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
                  const wsHost = new URL(serverUrl).host;
                  const websocketUrl = `${wsProtocol}//${wsHost}/${appName}/websocket`;

                  const quality = (qualityPresets as any)[streamQuality.value];
                  rtcPublisher.value = new WebRTCPublisher({
                     websocketUrl,
                     streamId,
                     videoBitrate: quality?.video,
                     audioBitrate: quality?.audio,
                     maxFramerate: quality?.fps,
                     onStats: (stats) => { networkStats.value = stats; }
                  });

                  const canvasStream = outputCanvas.value!.captureStream(quality?.fps || 30);
                  if (stream) stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

                  await rtcPublisher.value.start(canvasStream);
                  toast.success("Connection synchronized. Stream starting...");
               }
            } else if (mode === 'webrtc_relay') {
               toast.info("Using Direct Backend Relay (Experimental)");
               startRelayStream(sessionId);
            }

            isLive.value = true;
            timerInterval = setInterval(() => liveTime.value++, 1000);
            toast.success(t('studio.messages.live'));
            mockChat();
         }
      } catch (e: any) {
         console.error(e);
         if (rtcPublisher.value) {
            rtcPublisher.value.stop();
            rtcPublisher.value = null;
         }
         toast.error(e.response?.data?.error || t('studio.messages.liveError'));
      }
   } else {
      isLive.value = false;
      clearInterval(timerInterval);
      toast.info(t('studio.messages.stopped'));

      if (rtcPublisher.value) {
         rtcPublisher.value.stop();
         rtcPublisher.value = null;
      }

      if (mediaRecorder.value) {
         mediaRecorder.value.stop();
         mediaRecorder.value = null;
      }

      // Call stop endpoint if necessary
      try {
         if (currentSessionId.value) {
            await axios.post('/api/streaming/stop', { sessionId: currentSessionId.value });
            currentSessionId.value = null;
         }
      } catch (e) { }
   }
}

const startRelayStream = (sessionId: string) => {
   if (!outputCanvas.value) return;

   // 1. Prepare Stream (Video from Canvas + Audio from Mic)
   const quality = (qualityPresets as any)[streamQuality.value];
   const canvasStream = outputCanvas.value.captureStream(quality.fps);

   if (stream) {
      stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
   }

   // 2. Initialize MediaRecorder
   // Match the bitrate to the selected quality to reduce upload bandwidth and decode load
   const bitrate = quality.video * 1000; // kbps to bps

   let options = { mimeType: 'video/webm;codecs=h264', videoBitsPerSecond: bitrate };
   if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: bitrate };
   }

   mediaRecorder.value = new MediaRecorder(canvasStream, options);

   mediaRecorder.value.ondataavailable = async (event) => {
      if (event.data.size > 0) {
         const socket = ActionSyncService.getSocket();
         if (socket) {
            // Convert Blob to ArrayBuffer for binary transmission
            const buffer = await event.data.arrayBuffer();
            socket.emit('stream:relay', {
               sessionId,
               chunk: buffer
            });

            // Calculate and update stats for Relay mode
            const bytes = event.data.size;
            // Approximate bitrate based on 500ms chunks (2 chunks per second)
            const bitrate = Math.round((bytes * 8 * 2) / 1000); // kbps

            networkStats.value = {
               currentRoundTripTime: 50, // Mock RTT for relay (socket latency usually low)
               currentBitrate: bitrate,
               packetLoss: 0,
               availableOutgoingBitrate: bitrate + 500, // Mock headroom
               source: 'relay'
            };
         }
      }
   };

   mediaRecorder.value.onerror = (err) => {
      console.error('[Relay] Recorder Error:', err);
      toast.error('Relay stream error');
   };

   // Start recording with 500ms slices for reliable chunk generation
   mediaRecorder.value.start(500);
   console.log(`[Studio] MediaRecorder started with 500ms timeslice`);
   console.log(`[Studio] Relay stream started for session: ${sessionId}`);
}

const toggleGodMode = () => {
   isGodMode.value = !isGodMode.value;
   if (isGodMode.value) {
      toast.success(t('studio.messages.godModeEnabled'));
      studioDirector.start();
   } else {
      toast.info(t('studio.messages.godModeDisabled'));
      studioDirector.stop();
   }
}

const handleExit = () => {
   if (isLive.value) {
      toast.error(t('studio.messages.stopLiveFirst'));
      return;
   }
   router.push('/platforms');
}

const toggleRecord = () => {
   isRecording.value = !isRecording.value;
   if (isRecording.value) {
      toast.success(t('studio.messages.recordingStarted'));
   } else {
      toast.info(t('studio.messages.recordingSaved'));
   }
}

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

const inviteGuest = () => {
   toast.info(t('studio.messages.inviteSent'));
}

const summonGuest = (persona: any) => {
   syntheticGuestManager.summon(persona);
   toast.success(`Summoning ${persona.name}...`);
}

const toggleGuest = (guest: any) => {
   guest.active = !guest.active;
}

const toggleLowerThird = () => {
   showLowerThird.value = !showLowerThird.value;
}

const toggleTicker = () => {
   showTicker.value = !showTicker.value;
}

const generateMobileLink = () => {
   const link = `${window.location.origin}/remote-cam?session=${Math.random().toString(36).substr(2, 9)}`;
   navigator.clipboard.writeText(link);
   toast.success(t('studio.messages.linkCopied'));
}

const triggerFlashDeal = () => {
   isFlashDeal.value = true;
   setTimeout(() => isFlashDeal.value = false, 10000);
}

const toggleProduct = (product: any) => {
   activeProductId.value = activeProductId.value === product.id ? null : product.id;
}

const mockChat = () => {
   const mockMsgs = [
      { id: 1, user: 'User123', text: 'Amazing stream!', avatar: '' },
      { id: 2, user: 'StreamFan', text: 'How do you do that effect?', avatar: '' }
   ];
   let i = 0;
   const interval = setInterval(() => {
      if (!isLive.value) {
         clearInterval(interval);
         return;
      }
      if (i < mockMsgs.length) {
         messages.value.push(mockMsgs[i++]);
         spawnLike();
      }
   }, 5000);
}

const selectStage = (bg: any) => {
   selectedBackground.value = bg.url;
   toast.info(`Scene updated: ${bg.name}`);
}

const startPoll = (poll: any) => {
   activePoll.value = poll;
   toast.success(t('studio.messages.pollStarted'));
}

const featureQuestion = (q: any) => {
   qaQueue.value.push(q);
   toast.info(t('studio.messages.questionFeatured'));
}

const inviteCoHost = () => {
   toast.info(t('studio.messages.inviteCohostSent'));
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
      const res = await axios.get('/api/platforms');
      availableAccounts.value = res.data.data;
      // Ensure Socket is connected for relay/collaboration
      if (userStore.token) {
         ActionSyncService.connect('studio_global', userStore.token);

         // Listen for relay stream status (errors/stops)
         const socket = ActionSyncService.getSocket();
         if (socket) {
            socket.off('stream:status'); // Prevent duplicates
            socket.on('stream:status', (data: { sessionId: string, status: string, error?: string }) => {
               if (data.sessionId === currentSessionId.value && (data.status === 'error' || data.status === 'stopped')) {
                  console.warn(`[Studio] Stream stopped by server: ${data.error}`);
                  toast.error(`Stream stopped: ${data.error || 'Server error'}`);

                  // Force stop local state without calling API again (since session is already dead)
                  if (isLive.value) {
                     isLive.value = false;
                     clearInterval(timerInterval);
                     if (mediaRecorder.value) {
                        mediaRecorder.value.stop();
                        mediaRecorder.value = null;
                     }
                     currentSessionId.value = null;
                     toast.info('Broadcast ended');
                  }
               }
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
   } catch (e) {
      console.error('Failed to fetch platforms', e);
      toast.error('Could not load platform accounts');
   }
}

// Lifecycle
onMounted(async () => {
   try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (sourceVideo.value) {
         sourceVideo.value.srcObject = stream;
         sourceVideo.value.onloadedmetadata = () => {
            if (outputCanvas.value) {
               outputCanvas.value.width = sourceVideo.value!.videoWidth;
               outputCanvas.value.height = sourceVideo.value!.videoHeight;
            }
            sourceVideo.value?.play();
            startProcessing();
         };
      }

      await fetchAccounts();
   } catch (e) {
      console.error(e);
      toast.error("Camera required for studio");
   }
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

// Watcher for quality changes during live
watch(streamQuality, (newVal) => {
   if (isLive.value && rtcPublisher.value) {
      const quality = (qualityPresets as any)[newVal];
      rtcPublisher.value.updateConfig({
         videoBitrate: quality?.video,
         audioBitrate: quality?.audio,
         maxFramerate: quality?.fps
      });
      toast.info(`Quality updated: ${newVal.toUpperCase()}`);
   }
});

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
