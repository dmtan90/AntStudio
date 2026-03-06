<template>
   <div class="live-studio dark-theme">
      <StudioLoading :visible="!isStudioReady" @ready="isStudioReady = true" @exit="handleExit" />
      <StudioHeader :is-live="isLive" :live-time="liveTime" :is-god-mode="studioStore.godModeEnabled"
         :demo-mode="studioStore.demoMode" :title="currentProject?.title || t('studio.title')"
         :description="currentProject?.description || ''"
         :show-swarm-monitor="showSwarmMonitor"
         :auto-emotion-enabled="isAutoDirectorEnabled"
         :auto-atmosphere-enabled="studioStore.autoDirectorSettings.autoAtmosphereEnabled"
         :director-log="directorLog"
         @toggle-auto-emotion="handleToggleDirector"
         @toggle-auto-atmosphere="handleToggleAtmosphere"
         @toggle-god-mode="toggleGodMode" @toggle-demo="studioStore.toggleDemoMode" @exit="handleExit"
         @update:title="v => handleMetadataUpdate({ title: v })" 
         @update:description="v => handleMetadataUpdate({ description: v })"
         @toggle-swarm="showSwarmMonitor = !showSwarmMonitor" />

      <main class="studio-main">
         <StudioRail v-model:active-tab="activeTab" :effect-tabs="currentTabs" />

         <StudioStage :active-f-x="activeFX" :active-explosions="activeExplosions">
            <template #canvas>
               <div class="relative w-full h-full overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl transition-all duration-700"
                  :class="['mood-' + studioMood]">
                  
                  <div class="canvas-transform-wrapper w-full h-full transition-all duration-1000 ease-in-out"
                     :style="{ 
                        transform: studioStore.visualSettings?.cinematic?.enabled ? 'none' : `scale(${cameraZoom}) translate(${cameraPanX}%, ${cameraPanY}%)`,
                        filter: studioMood === 'noir' ? 'grayscale(1) contrast(1.2)' : 
                                studioMood === 'cyberpunk' ? 'hue-rotate(280deg) saturate(1.5) contrast(1.1)' :
                                studioMood === 'dreamy' ? 'blur(0.5px) saturate(0.8) sepia(0.2)' :
                                studioMood === 'vibrant' ? 'saturate(1.8) contrast(1.1)' :
                                studioMood === 'sepia' ? 'sepia(0.8) contrast(0.9)' : 'none'
                     }">
                     <canvas ref="outputCanvas" class="main-canvas"></canvas>
                  </div>
                  <canvas ref="overlayCanvas"
                     class="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"></canvas>
                  <video ref="sourceVideo" autoplay muted playsinline style="opacity: 0;"></video>

                  <!-- B-Roll PiP Overlay -->
                  <div v-if="showBRoll" 
                     class="absolute top-8 right-8 w-48 h-27 bg-black/60 rounded-2xl border border-white/20 overflow-hidden shadow-2xl z-20 animate-slide-in">
                     <img v-if="currentBRollUrl" :src="getFileUrl(currentBRollUrl)" class="w-full h-full object-cover" />
                     <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <span class="text-[8px] font-black text-white uppercase tracking-widest">B-Roll: {{ bRollTopic }}</span>
                     </div>
                  </div>

                  <!-- Network Health Overlay -->
                  <StudioNetworkStats :is-live="isLive" :stats="networkStats"
                     :real-chat-velocity="messages.filter(m => Date.now() - m.timestamp < 30000).length"
                     :session-infra="studioStore.sessionInfra" :quality="streamQuality" />

                   <!-- ASL Visual Interpreter (Accessibility) -->
                   <StudioASLOverlay :enabled="enableAsl" />

                   <!-- Commerce Overlays -->
                   <FlashSaleOverlay />
                   <ProductShowcaseOverlay />

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

                <!-- Lower Third Overlay -->
                <transition name="graphic-slide">
                    <div v-if="showLowerThird" class="dynamic-graphic lower-third">
                        <div class="graphic-accent"></div>
                        <div class="graphic-main">
                            <h3 class="title">{{ studioStore.activeGraphicContent.title }}</h3>
                            <p class="subtitle">{{ studioStore.activeGraphicContent.subtitle }}</p>
                        </div>
                    </div>
                </transition>

                <!-- Phase 65: Dynamic Data Overlay -->
                <DynamicOverlay 
                    :visible="showDynamicOverlay"
                    :type="dynamicOverlayType === 'none' ? null : dynamicOverlayType"
                    :data="dynamicOverlayData"
                />

                <!-- Phase 65: ShowRunner Monitor -->
                <LiveScriptMonitor />

                <!-- Phase 32: Neural Singularity Dashboard -->
                <NeuralDashboard v-if="!isGuest" class="absolute top-24 left-8 z-50 animate-fade-in" />

                <!-- Phase 66: Hive Mind Polls -->
                <HivePollOverlay />

                <!-- Phase 67: Gamification Popups -->
                <AchievementPopup />

                <!-- Phase 29: Quest Overlay -->
                <QuestOverlay 
                    :visible="showQuestOverlay" 
                    :quest="activeQuest" 
                    :floor-agent="floorAgentName"
                    :sync-strength="calculatedSyncStrength"
                />

                <!-- Global Lyrics Overlay (Phase 85) -->
                <!-- <StageLyricsOverlay 
                    v-if="performanceLyricsVisible && performanceLyrics?.length > 0"
                    :lyrics="performanceLyrics"
                    :current-time="performanceLyricsCurrentTime"
                    :style="performanceLyricsStyle"
                    :position="performanceLyricsPosition"
                /> -->
               </div>
            </template>
            <template #controls>
               <StageControls :mic-on="micOn" :cam-on="camOn" :is-live="isLive" :is-recording="studioRecorder.isRecording.value"
                  :platform-count="selectedPlatforms.length" :guest-count="waitingGuests.length" :is-guest="isGuest"
                  :is-screen-sharing="studioStore.isScreenSharing" v-model:stream-quality="studioStore.visualSettings.streamQuality"
                  @toggle-mic="v => micOn = !micOn" @toggle-cam="v => camOn = !camOn" @toggle-screen="toggleScreenShare"
                  @toggle-live="toggleLive" @toggle-record="toggleRecord" @capture-highlight="handleHighlight"
                  @invite-guest="inviteGuest" @show-platforms="showPlatformSelector = true" @exit="handleExit" />
            </template>
         </StudioStage>

         <StudioInteractions :messages="messages" @spawn-like="spawnLike" @send-chat="sendChat" :guest-personas="guestPersonas"
            :remote-guests="remoteGuests" :invite-guest="inviteGuest" :summon-guest="summonGuest"
            :toggle-guest="toggleGuest" :add-mobile-cam="generateMobileLink" :toggle-mute="studioStore.muteGuest"
            :toggle-camera="studioStore.toggleGuestCamera" :remove-guest="handleKickGuest"
            :assign-slot="studioStore.assignGuestToSlot" :is-guest="isGuest" :guest-video-elements="guestVideoElements"
            :effective-quality="effectiveQuality" />

         <DirectorNotes />
      </main>


      <!-- Drawer: Effects Panel -->
      <EffectsDrawer 
         v-model:active-tab="activeTab"
         :effect-tabs="currentTabs"
         :ar-settings="studioStore.visualSettings.ar"
         @update:ar-settings="studioStore.updateARSettings"
         :current-filter="currentFilter"
         :filters="filters"
         :selected-background="selectedBackground"
         :backgrounds="backgrounds"
         :enable-chromakey="enableChromakey"
         :chroma-settings="chromaSettings"
         :guest-personas="guestPersonas"
         :remote-guests="remoteGuests"
         :guest-video-elements="guestVideoElements"
         :branding="branding"
         :show-lower-third="showLowerThird"
         :show-ticker="showTicker"
         :is-translating="isTranslating"
         :enable-asl="enableAsl"
         :source-lang="sourceLang"
         :target-lang="targetLang"
         :current-transcript="currentTranscript"
         :is-gemini-speaking="isGeminiSpeaking"
         :is-flash-deal="isFlashDeal"
         :live-products="liveProducts"
         :active-product-id="activeProductId"
         :active-poll="activePoll"
         :qa-queue="qaQueue"
         :current-vibe-name="currentVibeName"
         :vibe-score="vibeScore"
         :auto-atmosphere="autoAtmosphere"
         :active-collaborators="activeCollaborators"
         :current-user-id="userStore.user?.id || ''"
         :active-script="studioStore.activeScript"
         @update:currentFilter="f => currentFilter = f"
         @update:enableChromakey="v => enableChromakey = v"
         @select-background="selectStage"
         @summon-guest="summonGuest"
         @toggle-guest="toggleGuest"
         @talk-guest="handleTalkGuest"
         @manual-gesture="handleManualGesture"
         @toggle-live-voice="handleToggleLiveVoice"
         @toggle-vision="handleToggleVision"
         @toggle-role="handleToggleRole"
         @set-emotion="handleSetEmotion"
         @update-animation="handleUpdateAnimation"
         @update-performance="handleUpdatePerformance"
         @set-background="handleSetBackground"
         @open-music-selector="handleOpenMusicSelector"
         @start-performance="handleStartPerformance"
         @toggle-lower-third="toggleLowerThird"
         @toggle-ticker="toggleTicker"
         @invite-guest="inviteGuest"
         @add-mobile-cam="generateMobileLink"
         @update:isTranslating="v => isTranslating = v"
         @update:enableAsl="v => enableAsl = v"
         @update:sourceLang="v => sourceLang = v"
         @update:targetLang="v => targetLang = v"
         @trigger-flash-deal="triggerFlashDeal"
         @toggle-product="toggleProduct"
         @start-poll="startPoll"
         @feature-question="featureQuestion"
         @update:autoAtmosphere="v => autoAtmosphere = v"
         @apply-preset="handleApplyPreset"
         @invite-cohost="inviteCoHost"
         @open-script-generator="showScriptConfig = true"
      />

      <!-- Modals -->
      <PlatformSelector 
         v-model="showPlatformSelector"
         :available-accounts="availableAccounts"
         :selected-platforms="selectedPlatforms"
         @toggle-platform="togglePlatform"
      />

      <!-- Settings Modal (Removed in favor of Popover in StageControls) -->
      
      <!-- AI Production & Gifts Overlays -->
      <AiProductionOverlay :visible="isAssembling" :progress="assembleProgress" />
      <GiftsOverlay />

      <!-- Virtual Guests (Hidden/Off-screen Rendering) -->
      <!-- changing v-show="false" to offscreen to ensure ResizeObserver triggers -->
      <div v-if="!isGuest" class="absolute -left-[9999px] top-0 w-[1920px] h-[1080px] overflow-hidden opacity-0 pointer-events-none">
         <VirtualGuest 
            v-for="guest in activeGuests" 
            :key="guest.persona.uuid" 
            :ref="el => virtualGuestRefs[guest.persona.uuid] = el"
            :persona="guest.persona"
            :is-host-speaking="isHostSpeaking"
            :background-url="studioStore.visualSettings.background.assetUrl"
            :is360="studioStore.visualSettings.background.is360"
            :hide-background="studioStore.visualSettings?.cinematic?.enabled"
            @stream-ready="(stream) => handleVirtualGuestStream(guest.persona.uuid, stream)"
         />

         <!-- Off-screen Cinematic Stage for Canvas Bridging -->
         <VirtualStudioStage 
            ref="virtualStage"
            :guests="stageGuests"
            :guest-videos="guestVideos"
            :environment-id="studioStore.visualSettings?.cinematic?.environmentId"
            :speaking-vol="performanceAudioLevel"
            :hype-level="chatHypeLevel"
            :global-particle-override="globalAtmosphere"
            :is-host-speaking="isHostSpeaking"
         />
      </div>

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
      
      <!-- Phase 65: Show Script Config -->
      <el-drawer v-model="showScriptConfig" direction="rtl" size="400px" :with-header="false" custom-class="no-padding-drawer">
         <ShowScriptConfig @close="showScriptConfig = false" />
      </el-drawer>

      <!-- User Guide -->
      <UserGuide :steps="liveStudioGuide" storage-key="livestudio-guide-completed" />

      <!-- Post Stream Synthesis Overlay -->
      <PostStreamSynthesis 
        v-if="showPostStreamSummary"
        :loading="isSynthesizing"
        :report="streamReport"
        :commerce-report="commerceReport"
        :viewers="viewers"
        :captions="suggestedCaptions"
        @close="showPostStreamSummary = false"
        @export="() => { showPostStreamSummary = false; toast.success(t('studio.messages.metadataSynced')); }"
      />

      <RecordingCompleteDialog
        v-model="showRecordingDialog"
        :recorded-url="studioRecorder.recordedUrl.value"
        :project-id="currentProject.id === 'current' ? undefined : currentProject.id"
        :is-saving="studioRecorder.isSaving.value"
        @save="handleSaveRecording"
        @close="showRecordingDialog = false"
      />

      <!-- Music Selection Dialog (Phase 85) -->
      <MusicSelectionDialog
        v-model="musicSelectorVisible"
        @select="handleMusicSelected"
      />

      <!-- VTuber Performance Overlay (Embedded) -->
      <transition name="fade">
        <PerformanceOverlay
          v-if="performanceModalVisible"
          :audio-url="performanceAudioUrl"
          :lyrics="performanceLyrics"
          :lyrics-style="performanceLyricsStyle"
          :lyrics-position="performanceLyricsPosition"
          @ended="handlePerformanceEnded"
          @close="handlePerformanceEnded"
          @audio-level="handlePerformanceAudioLevel"
          @lyrics-state="handlePerformanceLyricsState"
        />
      </transition>

      <!-- Swarm Monitor (Phase 28) -->
      <SwarmMonitor 
        :visible="showSwarmMonitor"
        :messages="swarmMessages"
        :active-agents="Object.keys(swarmAgents)"
        @close="showSwarmMonitor = false"
      />
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import { usePlatformStore } from '@/stores/platform';
import { Record, Effects, Magic, GraphicDesign, Translation, Shopping, Handbag, ChartHistogram, User, Comments, LoadingTwo, Play, CheckOne, LinkTwo, Close, Broadcast, Youtube, Facebook, Tiktok, Computer, Movie } from '@icon-park/vue-next';
import { useGeminiLive } from '@/composables/useGeminiLive';

// Components
import StudioHeader from '@/components/studio/StudioHeader.vue';
import StudioRail from '@/components/studio/StudioRail.vue';
import StudioStage from '@/components/studio/StudioStage.vue';
import StageControls from '@/components/studio/StageControls.vue';
import StudioInteractions from '@/components/studio/StudioInteractions.vue';
import GuestDrawer from '@/components/studio/drawers/GuestDrawer.vue';
import ProductDrawer from '@/components/studio/drawers/ProductDrawer.vue';
import AnalyticsDrawer from '@/components/studio/drawers/AnalyticsDrawer.vue';
import FlashSaleOverlay from '@/components/studio/overlays/FlashSaleOverlay.vue';
import ProductShowcaseOverlay from '@/components/studio/overlays/ProductShowcaseOverlay.vue';
import QuestOverlay from '@/components/studio/overlays/QuestOverlay.vue';
import GodModePanel from '@/components/studio/GodModePanel.vue';
import ResourcePool from '@/components/studio/ResourcePool.vue';
import StudioLoading from '@/components/studio/StudioLoading.vue';
import DirectorNotes from '@/components/studio/DirectorNotes.vue'
import PollCreator from '@/components/studio/PollCreator.vue'
import LivePoll from '@/components/studio/LivePoll.vue';
import UserGuide from '@/components/common/UserGuide.vue';
import PostStreamSynthesis from '@/components/studio/PostStreamSynthesis.vue';

import { liveStudioGuide } from '@/config/userGuides';


// Services
import { studioDirector } from '@/utils/ai/StudioDirector';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { conversationOrchestrator } from '@/utils/ai/ConversationOrchestrator.js';
import { studioVibeAnalyzer } from '@/utils/ai/StudioVibeAnalyzer';
import { studioProducer } from '@/utils/ai/StudioProducer';
import { neuralShowrunner } from '@/utils/ai/NeuralShowrunner';
import { viralSyndicationService } from '@/utils/ai/ViralSyndicationService';
import { useUserStore } from '@/stores/user.js';
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher.js';
import { useStudioStore } from '@/stores/studio';
import { QRCodeGenerator } from '@/utils/ai/QRCodeGenerator';
import { useAudioAnalysis } from '@/composables/useAudioAnalysis';
import { getFileUrl } from '@/utils/api';
import { audioMixerService } from '@/utils/ai/AudioMixerService';
import { ProductPitchService } from '@/utils/ai/ProductPitchService';
import { vtuberDubber } from '@/utils/ai/VTuberDubber';
import { visionAnalyzer } from '@/utils/ai/VisionAnalyzer';
import { visionCommerceService } from '@/utils/ai/VisionCommerceService';
import { intentAnalyzer } from '@/utils/ai/IntentAnalyzer';


// Studio Composables
import SwarmMonitor from '@/components/studio/SwarmMonitor.vue';
import { useStudioCanvas } from '@/composables/studio/useStudioCanvas';
import { useStudioP2P } from '@/composables/studio/useStudioP2P';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { LiveCaptionService } from '@/utils/ai/LiveCaptionService';
import { useViralMomentDetector } from '@/composables/studio/useViralMomentDetector';
import ViralPeakPopup from '@/components/studio/overlays/ViralPeakPopup.vue';
import { useAutoDirector } from '@/composables/useAutoDirector';
import { useStudioAI } from '@/composables/useStudioAI';

// Studio Overlays
import StudioNetworkStats from '@/components/studio/overlays/StudioNetworkStats.vue';
import StudioASLOverlay from '@/components/studio/overlays/StudioASLOverlay.vue';
import { useStreamingStore } from '@/stores/streaming';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { useVideoAssembler } from '@/composables/useVideoAssembler';
import VirtualGuest from '@/components/studio/virtual/VirtualGuest.vue';
import VirtualStudioStage from '@/components/studio/virtual/VirtualStudioStage.vue';
import CinematicSettings from '@/components/studio/drawers/CinematicSettings.vue';
import DynamicOverlay from '@/components/studio/overlays/DynamicOverlay.vue';
import ShowScriptConfig from '@/components/studio/drawers/ShowScriptConfig.vue';
import LiveScriptMonitor from '@/components/studio/overlays/LiveScriptMonitor.vue';
import HivePollOverlay from '@/components/studio/overlays/HivePollOverlay.vue';
import DirectorControlPanel from '@/components/studio/interactive/DirectorControlPanel.vue';
import AchievementPopup from '@/components/studio/gamification/AchievementPopup.vue';
import LeaderboardOverlay from '@/components/studio/overlays/LeaderboardOverlay.vue';
import AnalyticsDashboard from '@/components/studio/dashboard/AnalyticsDashboard.vue';
import { useStudioRecorder } from '@/composables/studio/useStudioRecorder';
import RecordingCompleteDialog from '@/components/studio/modals/RecordingCompleteDialog.vue';
import PlatformSelector from '@/components/studio/modals/PlatformSelector.vue';
import AiProductionOverlay from '@/components/studio/overlays/AiProductionOverlay.vue';
import GiftsOverlay from '@/components/studio/overlays/GiftsOverlay.vue';
import EffectsDrawer from '@/components/studio/drawers/EffectsDrawer.vue';
import MusicSelectionDialog from '@/components/vtuber/MusicSelectionDialog.vue';
import VTuberMusicPerformance from '@/components/vtuber/VTuberMusicPerformance.vue';
import PerformanceOverlay from '@/components/studio/overlays/PerformanceOverlay.vue';
import StageLyricsOverlay from '@/components/vtuber/StageLyricsOverlay.vue';
import NeuralDashboard from '@/components/studio/NeuralDashboard.vue';

import { useVTuberStore } from '@/stores/vtuber';
import { useMediaStore } from '@/stores/media';

const router = useRouter();
const route = useRoute();
// Stores
const userStore = useUserStore();
const studioStore = useStudioStore();
const projectStore = useProjectStore();
const uiStore = useUIStore();
const streamingStore = useStreamingStore();
const { assemble: runAssembler, isAssembling, progress: assembleProgress } = useVideoAssembler();
const platformStore = usePlatformStore();
const vtuberStore = useVTuberStore();
const mediaStore = useMediaStore();
const directorNotes = ref('');
const studioRecorder = useStudioRecorder();
const showRecordingDialog = ref(false);

const { t } = useI18n()

// ...existing code...

// Role & Session Detection
const isGuest = computed(() => route.query.role === 'guest' || !!route.query.token);

const { isAutoDirectorEnabled, toggleDirector } = useAutoDirector();
const { startAILoop, stopAILoop } = useStudioAI(studioStore);

// Initial mount logging removed, merged into main onMounted

const handleToggleDirector = (enabled: boolean) => {
   toggleDirector(enabled);
   studioStore.updateAutoDirector({ 
       enabled: enabled,
       autoEmotionEnabled: enabled 
   });
};

const handleToggleAtmosphere = () => {
    const current = studioStore.autoDirectorSettings.autoAtmosphereEnabled;
    studioStore.updateAutoDirector({
        autoAtmosphereEnabled: !current
    });
    if (!current) {
        toast.success(t('studio.messages.autoAtmosphereEnabled'));
        studioStore.updateStudioVibe(studioStore.studioVibe, true);
    } else {
        toast.info(t('studio.messages.autoAtmosphereDisabled'));
    }
};

const handleDirectorCut = ((e: CustomEvent) => {
   if (studioStore.autoDirectorSettings.enabled || isAutoDirectorEnabled.value) {
      studioStore.setCameraFocus(e.detail.target);
      addDirectorLog(t('studio.logs.cameraSwitch'), `Automated cut to ${e.detail.target} based on voice activity.`);
   }
}) as EventListener;

const handleGiftEvent = ((e: CustomEvent) => {
    const { item, senderId } = e.detail;
    
    // Trigger floating animation
    const id = Date.now() + Math.random();
    activeFX.value.push({
        id,
        type: item.effectId || item.id,
        style: {
            left: `${10 + Math.random() * 80}%`,
            transitionDelay: `${Math.random() * 0.5}s`
        }
    });

    // Trigger explosion if it's a 'big' gift
    if (item.cost >= 100) {
        activeExplosions.value.push({
            id: id + 1,
            type: 'confetti',
            style: { left: '50%', top: '50%' }
        });
        setTimeout(() => {
            activeExplosions.value = activeExplosions.value.filter(ex => ex.id !== (id + 1));
        }, 2000);
    }

    setTimeout(() => {
        activeFX.value = activeFX.value.filter(fx => fx.id !== id);
    }, 5000);
}) as EventListener;

onMounted(async () => {
   syntheticGuestManager.init(studioStore);
   // Sync VTuber Library
   await syntheticGuestManager.syncLibrary();
   
   startAILoop();
   window.addEventListener('director:cut', handleDirectorCut);
   window.addEventListener('economy:gift', handleGiftEvent);

    // Initialize Commerce & Project Assets
    if (!isGuest.value) {
        studioStore.fetchCommerceProducts().catch(() => {});
        if (!studioStore.currentSessionId) {
            studioStore.currentSessionId = `session_${Date.now()}`;
        }

        const projectId = route.params.id as string;
        if (projectId) {
            studioStore.currentProjectId = projectId;
            studioStore.fetchCollaborators(projectId).catch(() => {});
            try {
                const project = await projectStore.fetchProject(projectId);
                if (project && project.visualAssets) {
                    studioStore.resourcePool = project.visualAssets.map((a: any) => ({
                        id: a.s3Key,
                        name: a.name,
                        type: a.type as 'image' | 'video',
                        url: getFileUrl(a.s3Key),
                        thumbnail: getFileUrl(a.s3Key),
                        addedAt: new Date(a.createdAt).getTime()
                    }));
                }
            } catch (e) {
                console.error('Failed to load project assets');
            }
        }
    }

    // V2C Initialization (Phase 25)
    visionCommerceService.init();
    if (outputCanvas.value) {
        visionAnalyzer.start(outputCanvas.value);
    }

    isStudioReady.value = true;

    // Phase 32: Neural Singularity Activation
    if (!isGuest.value && studioStore.visualSettings.ai.autonomousProduction) {
        neuralShowrunner.start();
        viralSyndicationService.init();
    }
});

onUnmounted(() => {
   window.removeEventListener('director:cut', handleDirectorCut);
   window.removeEventListener('economy:gift', handleGiftEvent);
   stopAILoop();
});
const guestName = computed(() => (route.query.guestName as string) || (route.query.name as string) || t('studio.guest'));
const hostId = computed(() => route.query.hostId as string);
const waitingGuests = computed(() => studioStore.waitingGuests);

const qualityPresets = {
   low: { video: 500, audio: 64, fps: 30, width: 640, height: 360, label: 'Low (360p @ 30fps)' },
   medium: { video: 1200, audio: 128, fps: 30, width: 854, height: 480, label: 'Medium (480p @ 30fps)' },
   high: { video: 2500, audio: 160, fps: 30, width: 1280, height: 720, label: 'High (720p @ 30fps)' },
   ultra: { video: 4500, audio: 192, fps: 30, width: 1920, height: 1080, label: 'Ultra (1080p @ 30fps)' }
};

// State
const currentProject = ref({ 
    id: 'current', 
    title: t('studio.project.defaultTitle'), 
    description: '',
    role: 'host' 
});
const micOn = ref(true);
const camOn = ref(true);
const activeTab = ref<string | null>(null);
const showPlatformSelector = ref(false);
const selectedPlatforms = ref<string[]>([]);
const availableAccounts = ref<any[]>([]);
const messages = ref<any[]>([]);
const activeFX = ref<any[]>([]);
const activeExplosions = ref<any[]>([]);
const currentFilter = ref('none');
const selectedBackground = ref<string | null>(null);
const branding = ref({ name: 'Alex Thompson', title: 'AI Specialist', color: '#3b82f6' });
const showLowerThird = ref(false);
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
const enableAsl = ref(false);
const streamQuality = ref('high');
const networkStats = ref<any>(null);

// Environment Awareness
const canvasContext = ref<string>(""); // Textual description or recent activity
const lastSnapshotTime = ref(0);

// Additional UI State
const dynamicOverlayData = ref<any>(null);
const showDynamicOverlay = ref(false);
const dynamicOverlayType = ref<'none' | 'table' | 'stat_card' | 'chart' | 'media'>('none');

const showGuestDrawer = ref(false);
const guestDrawerMode = ref<'invite' | 'mobile'>('invite');
const customGuestLink = ref('');
const showProductDrawer = ref(false);

const activePoll = ref<any>(null);
const showPollCreator = ref(false);
const showScriptConfig = ref(false);
const enableChromakey = ref(false);
const virtualStage = ref<any>(null);
const cinematicVideo = ref<HTMLVideoElement | null>(null);
const chromaSettings = ref({ keyColor: '#00ff00', similarity: 0.1, smoothness: 0.05 });
const guestPersonas = computed(() => {
   const library = syntheticGuestManager.getPersonaLibrary();
   const activeIds = new Set(syntheticGuestManager.getGuests().map(g => g.persona.uuid));
   
   // 1. Synthetic Guests (VTubers)
   const vtubers = library.map(p => ({
      ...p,
      avatarUrl: p.visual?.thumbnailUrl ? getFileUrl(p.visual.thumbnailUrl) : p.avatarUrl,
      active: activeIds.has(p.uuid),
      isLiveVoiceActive: liveVoiceActiveGuestId.value === p.uuid && isGeminiConnected.value,
      isVisionActive: isVisionActive.value
   }));

   // 2. Real Guests (Bridge them as personas for LiveChatManager)
   const realGuests = studioStore.liveGuests.map(g => ({
      id: g.uuid,
      uuid: g.uuid,
      entityId: g.uuid,
      name: g.name || 'Guest',
      identity: { name: g.name || 'Guest', description: 'Real human guest' },
      visual: { thumbnailUrl: g.avatar || '/avatars/default-guest.png' },
      avatarUrl: g.avatar || '/avatars/default-guest.png',
      active: true,
      isRealHuman: true,
      isLiveVoiceActive: false,
      isVisionActive: false
   }));

   return [...vtubers, ...realGuests];
});
const currentVibeName = ref(t('studio.vibes.technoChill'));
const vibeScore = ref(85);
const autoAtmosphere = ref(true);
const activeCollaborators = computed(() => studioStore.coHosts);
const currentWebRTCUrl = ref<string | null>(null);
const isStudioReady = ref(false);

// Post-Stream Synthesis
const showPostStreamSummary = ref(false);
const isSynthesizing = ref(false);
const streamReport = ref({
    highlights: '',
    audienceVibe: '',
    commercialImpact: '',
    growthTips: []
});
const suggestedCaptions = ref([]);
const commerceReport = ref(null);

// Cinematic State (Phase 26)
const cameraZoom = ref(1.0);
const cameraPanX = ref(0);
const cameraPanY = ref(0);
const studioMood = ref('standard');
const showBRoll = ref(false);
const bRollTopic = ref('');
const currentBRollUrl = ref('');

// RPG & Game State (Phase 29)
const activeQuest = ref<{
    title: string;
    type: string;
    goal: string;
    progress: number;
    statusText: string;
    masterId: string;
} | null>(null);
const showQuestOverlay = ref(false);
const floorAgentId = ref<string | null>(null); // Who has the "floor" in a debate
const floorAgentName = computed(() => {
    if (!floorAgentId.value) return null;
    const persona = guestPersonas.value.find(p => p.uuid === floorAgentId.value);
    return persona?.name || floorAgentId.value;
});

const bRollStream = ref<MediaStream | null>(null);
const bRollVideo = ref<HTMLVideoElement | null>(null);

const calculatedSyncStrength = computed(() => {
    if (!activeQuest.value) return 0;
    const agentCount = Object.keys(swarmAgents).length;
    if (agentCount === 0) return 0;
    
    // Base strength on agent count and a bit of "stability"
    const base = Math.min(100, agentCount * 30 + 10);
    // Add some organic variation
    const variation = Math.sin(Date.now() / 2000) * 5;
    return Math.max(0, Math.min(100, base + variation));
});

// Screen Sharing
const screenStream = ref<MediaStream | null>(null);
const screenVideo = ref<HTMLVideoElement | null>(null);

// VTuber State
const liveVoiceActiveGuestId = ref<string | null>(null);
const isVisionActive = ref(false);

// Global helper for the "active" agent (for vision, etc)
const activeAgent = computed(() => {
    if (!liveVoiceActiveGuestId.value) return null;
    const persona = guestPersonas.value.find(p => p.uuid === liveVoiceActiveGuestId.value);
    const archiveId = (persona as any)?.entityId || persona?.uuid;
    return archiveId ? swarmAgents[archiveId] : null;
});

// Computed: Is any VTuber connected via LiveChat?
const isGeminiConnected = computed(() => connectedVTubers.value.length > 0);

// Computed: Is any VTuber speaking?
const isGeminiSpeaking = computed(() => isAnyVTuberSpeaking.value);

// Computed: Audio level of active VTuber
const geminiAudioLevel = computed(() => {
    if (liveVoiceActiveGuestId.value) {
        const connection = liveChatConnections[liveVoiceActiveGuestId.value];
        return connection?.audioLevel || 0;
    }
    // Return max audio level from all connected VTubers
    return Math.max(0, ...Object.values(liveChatConnections).map((c: any) => c.audioLevel || 0));
});

// Media Resources
const activeMediaVideo = ref<HTMLVideoElement | null>(null);

// Swarm State (Phase 28)
const swarmMessages = ref<any[]>([]);
const showSwarmMonitor = ref(false);
const swarmAgents = reactive<Record<string, any>>({});

// Phase 85: Music Performance State
const musicSelectorVisible = ref(false);
const performanceModalVisible = ref(false);
const selectedVTuberId = ref<string | null>(null);
const performingVTuber = ref<any>(null);
const performanceAudioUrl = ref('');
const performanceLyrics = ref<any[]>([]);
const performanceLyricsStyle = ref<'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale'>('bounce');
const performanceLyricsPosition = ref<'top' | 'center' | 'bottom'>('bottom');
const performanceLyricsCurrentTime = ref(0);
const performanceAudioLevel = ref(0);
const globalAtmosphere = ref<string | null>(null);
const chatHypeLevel = computed(() => syntheticGuestManager.chatHypeScore);
const performanceLyricsVisible = ref(true);

const masterAgentId = ref<string | null>(null);

// Unmute Gemini when performance ends
const handlePerformanceEnded = () => {
    performanceModalVisible.value = false;
    mediaStore.stopPerformance();
    
    if (performingVTuber.value) {
         // Stop gesture/emotion if needed
         if (activeAgent.value && activeAgent.value.sessionId) {
              activeAgent.value.isMuted = false;
         }
         // Reset lip-sync override
         const guestRef = virtualGuestRefs[performingVTuber.value.uuid];
         if (guestRef) {
             guestRef.setAudioLevelOverride(null);
         }
         performingVTuber.value = null;
    }
};

// Bridge Music Audio Level to VTuber LipSync
const handlePerformanceAudioLevel = (level: number) => {
    performanceAudioLevel.value = level;
    if (performingVTuber.value && performanceModalVisible.value) {
        const guestRef = virtualGuestRefs[performingVTuber.value.uuid];
        if (guestRef) {
            // VirtualGuest must expose setAudioLevelOverride or we inject it via props
            // Checking VirtualGuest.vue... Likely need to add exposure or use existing mechanism
            if (typeof guestRef.setAudioLevelOverride === 'function') {
                guestRef.setAudioLevelOverride(level);
            }
        }
    }
};

// Handle lyrics state from PerformanceOverlay
const handlePerformanceLyricsState = (state: { currentTime: number; showLyrics: boolean }) => {
    performanceLyricsCurrentTime.value = state.currentTime;
    performanceLyricsVisible.value = state.showLyrics;
    
    // Synchronize with store for VirtualGuest components
    mediaStore.updatePerformanceTime(state.currentTime);
    mediaStore.toggleLyricsVisibility(state.showLyrics);
};

watch(performanceModalVisible, (visible) => {
    if (!visible && activeAgent.value) {
        activeAgent.value.isMuted = false;
    }
});

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

const preScreenShareSceneId = ref<string | null>(null);
const toggleScreenShare = async () => {
   if (studioStore.isScreenSharing) {
      if (screenStream.value) {
         screenStream.value.getTracks().forEach(t => t.stop());
         screenStream.value = null;
      }
      studioStore.isScreenSharing = false;
      toast.info(t('studio.messages.screenShareStopped'));

      // Revert to previous scene if it exists
      if (preScreenShareSceneId.value) {
         studioStore.switchScene(preScreenShareSceneId.value);
         preScreenShareSceneId.value = null;
      }
   } else {
      try {
         const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' } as any,
            audio: { echoCancellation: true, noiseSuppression: true } as any
         });

         preScreenShareSceneId.value = studioStore.activeScene.id;
         screenStream.value = stream;
         studioStore.isScreenSharing = true;
         toast.success(t('studio.messages.sharingScreen'));

         // Switch to screen focus scene
         studioStore.switchScene('screen_focus');

         stream.getVideoTracks()[0].onended = () => {
            studioStore.isScreenSharing = false;
            screenStream.value = null;
            if (preScreenShareSceneId.value) {
               studioStore.switchScene(preScreenShareSceneId.value);
               preScreenShareSceneId.value = null;
            }
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
   if (hostStream.value) {
      hostStream.value.getAudioTracks().forEach(t => t.enabled = val);
   }
});

watch(camOn, (val) => {
   if (hostStream.value) {
      hostStream.value.getVideoTracks().forEach(t => t.enabled = val);
   }
});

// Watch for cinematic mode toggle to bridge stage and update worker state
watch(() => studioStore.visualSettings?.cinematic?.enabled, async (isCinematicEnabled, wasEnabled) => {
   if (wasEnabled === undefined) return; 
   
   if (isCinematicEnabled) {
      // Cinematic mode enabled
      setCinematicMode(true);
      
      // Initialize cinematic stage bridging
      await nextTick();
      if (virtualStage.value && !cinematicVideo.value) {
         const stageCanvas = virtualStage.value.canvas;
         if (stageCanvas) {
            console.log('[LiveStudio] Capturing Cinematic Stage Stream');
            const stream = stageCanvas.captureStream(30);
            cinematicVideo.value = document.createElement('video');
            cinematicVideo.value.autoplay = true;
            cinematicVideo.value.muted = true;
            cinematicVideo.value.playsInline = true;
            cinematicVideo.value.style.display = 'none';
            document.body.appendChild(cinematicVideo.value);
            cinematicVideo.value.srcObject = stream;
            
            // bridgeStream call inside useStudioCanvas will trigger because cinematicVideo ref is bridged
         }
      }
   } else {
      // Cinematic mode disabled
      setCinematicMode(false);
   }
}, { immediate: true });

const outputCanvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);

const hostStream = ref<MediaStream | null>(null);
const canvasStream = ref<MediaStream | null>(null);

// Composables Integration
const { guestVideos, guestVideoElements, syncGuestVideos, stopGuestSubscriber, initiateAsGuest, addSyntheticGuest } = useStudioP2P(hostStream, canvasStream, isGuest);

const { isLive, isRecording, liveTime, currentSessionId, effectiveQuality, toggleLive: baseToggleLive, stopLive } = useStudioSession(
   outputCanvas,
   hostStream,
   {
      streamQuality,
      currentProject,
      selectedPlatforms,
      availableAccounts,
      networkStats,
      qualityPresets,
      resizeCanvas: (w, h) => resizeCanvas && resizeCanvas(w, h)
   }
);

const { frameCount, audioLevel, startRendering, stopRendering, resizeCanvas, setCinematicMode, setSubtitles } = useStudioCanvas(
   outputCanvas,
   sourceVideo,
   guestVideos,
   {
      streamQuality,
      enableAsl,
      purchaseNotifications,
      hostLevel,
      guestLevels,
      isGuest,
      myGuestId: computed(() => studioStore.myGuestId),
      screenVideo,
      activeMediaVideo,
      cinematicVideo,
      realChatVelocity: computed(() => {
         const now = Date.now();
         return messages.value.filter(m => now - m.timestamp < 30000).length;
      })
   },
   overlayCanvas
);

// LiveChat Manager (Auto-connect VTubers)
import { useLiveChatManager } from '@/composables/studio/useLiveChatManager';
import { useConversationRouter } from '@/composables/studio/useConversationRouter';
import { useTurnTakingCoordinator } from '@/composables/studio/useTurnTakingCoordinator';
import { useStudioSession } from '@/composables/studio/useStudioSession';

const {
    connections: liveChatConnections,
    connectedVTubers,
    isAnyVTuberSpeaking,
    syncConnections: syncLiveChatConnections,
    disconnectAll: disconnectAllLiveChat,
    setToolCallCallback: setLiveChatToolCallback,
    broadcastToVTubers,
    connectVTuber: connectLiveChat,
    disconnectVTuber: disconnectLiveChat
} = useLiveChatManager();

const conversationRouter = useConversationRouter();
const turnTakingCoordinator = useTurnTakingCoordinator(liveChatConnections);
const lastSpeakerId = ref<string | null>(null);
const currentSpeakerId = turnTakingCoordinator.currentSpeakerId;

// Swarm State (Phase 28)
// const showSwarmMonitor = ref(false);
// const swarmAgents = reactive<Record<string, any>>({});
// Ref swarmAgents duplicate removed.
// Ref liveVoiceActiveGuestId duplicate removed.
// Ref isVisionActive duplicate removed.
const virtualGuestRefs = reactive<Record<string, any>>({});


// Computed: Is any VTuber connected via LiveChat? (Moved to top)
// Computed: Is any VTuber speaking? (Moved to top)
// Computed: Audio level of active VTuber (Moved to top)
// Global helper for the "active" agent (Moved to top)

const handleToggleLiveVoice = async (persona: any) => {
    const archiveId = (persona as any).entityId || persona.uuid;
    
    if (swarmAgents[archiveId]) {
        swarmAgents[archiveId].disconnect();
        delete swarmAgents[archiveId];
        if (liveVoiceActiveGuestId.value === persona.uuid) {
            liveVoiceActiveGuestId.value = null;
            (studioStore as any).activeArchiveId = null;
            isVisionActive.value = false;
        }
        if (virtualGuestRefs[persona.uuid]) virtualGuestRefs[persona.uuid].setLiveVoiceState(false);
        toast.info(t('studio.messages.agentLeftSwarm', { name: persona.name }));
    } else {
        try {
            const agent = useGeminiLive();
            await agent.connect({
                archiveId: archiveId,
                projectId: route.params.id as string,
                token: userStore.token || undefined,
                isMaster: masterAgentId.value === persona.id
            });

            agent.setSwarmMessageCallback((msg: any) => {
                swarmMessages.value.push(msg);
                if (swarmMessages.value.length > 50) swarmMessages.value.shift();
                if (!showSwarmMonitor.value) showSwarmMonitor.value = true;
            });

            // Native Text & Metadata Handler (Phase 8)
            // Backend sends Consolidated JSON (Text + Metadata)
            // WebRTC handles Audio separately. We just need to sync behavior.
            agent.setTextResponseCallback(async (text: string, metadata?: any) => {
				console.log("LiveStudio - WS text response", text, metadata);
                
                const guestRef = virtualGuestRefs[persona.id];
                if (guestRef) {
                    if (metadata?.emotion) guestRef.setLiveVoiceEmotion(metadata.emotion);
                    if (metadata?.gesture) guestRef.setLiveVoiceGesture(metadata.gesture);
                }

                if (metadata?.action === 'perform_song') {
                    handlePerformSongTool(persona, metadata.actionPayload);
                } else if (metadata?.action === 'stop_performance') {
                    performanceModalVisible.value = false;
                    if (activeAgent.value) activeAgent.value.isMuted.value = false;
                }
            });

            liveVoiceActiveGuestId.value = persona.id;
            (studioStore as any).activeArchiveId = archiveId;
            const micStream = hostStream.value;
            await agent.startMicrophone(micStream || undefined);

            agent.setToolCallCallback(async (toolCall: any) => {
                for (const call of toolCall.functionCalls || []) {
                    console.log(`[Swarm] [${persona.name}] Tool Call: ${call.name}`, call.args);
                    const result = await executeAgentTool(agent, persona, call.id, call.name, call.args);
                    agent.sendToolResponse(call.id, call.name, result);
                }
            });

            // Quest Event Handler (Phase 31)
            agent.setQuestCallback((event: any) => {
                console.log('[Quest] Event received:', event.type, event);
                if (event.type === 'quest_created') {
                    activeQuest.value = {
                        title: event.quest.topic || event.quest.title,
                        type: event.quest.type,
                        goal: event.quest.metadata?.goal || 'Complete the challenge',
                        progress: 0,
                        statusText: 'Starting...',
                        masterId: persona.id
                    };
                    showQuestOverlay.value = true;
                    toast.success(t('studio.messages.questStarted', { title: activeQuest.value.title }));
                } else if (event.type === 'quest_updated') {
                    if (activeQuest.value) {
                        activeQuest.value.progress = event.progress || activeQuest.value.progress;
                        activeQuest.value.statusText = event.statusText || activeQuest.value.statusText;
                    }
                } else if (event.type === 'quest_floor_assigned') {
                    floorAgentId.value = event.targetAgentId;
                } else if (event.type === 'quest_evaluated') {
                    toast.info(t('studio.messages.agentScored', { name: event.targetAgentId, score: event.score }), { description: event.comment });
                }
            });

            swarmAgents[archiveId] = agent;
            if (virtualGuestRefs[persona.id]) virtualGuestRefs[persona.id].setLiveVoiceState(true);
            toast.success(t('studio.messages.agentJoinedSwarm', { name: persona.name }));
        } catch (error) {
            console.error('[Swarm] Connection failed:', error);
            toast.error(t('studio.messages.agentConnectionFailed', { name: persona.name }));
        }
    }
};

const executeAgentTool = async (agent: any, persona: any, callId: string, fn: string, args: any) => {
    let result: any = { success: true };
    try{
        const guestRef = virtualGuestRefs[persona.id];

        if (fn === 'change_expression') {
            if (studioStore.autoDirectorSettings.autoEmotionEnabled && guestRef) {
                guestRef.setLiveVoiceEmotion(args.expression);
            }
        } else if (fn === 'play_animation') {
            if (guestRef) guestRef.setLiveVoiceGesture(args.animation);
        } else if (fn === 'switch_scene' || fn === 'switch_layout') {
            studioStore.switchScene(args.sceneId || args.layoutId);
        } else if (fn === 'trigger_graphic') {
            if (args.type === 'lower_third') showLowerThird.value = args.enabled;
            if (args.type === 'ticker') showTicker.value = args.enabled;
        } else if (fn === 'update_lower_third') {
            studioStore.updateGraphicContent(args.title, args.subtitle);
            showLowerThird.value = true;
        } else if (fn === 'set_production_auto') {
            if (args.mode === 'camera') studioStore.setAutoCamera(args.enabled);
            toast.info(t('studio.messages.aiProductionMode', { mode: args.mode, status: args.enabled ? 'enabled' : 'disabled' }));
        } else if (fn === 'trigger_production_sequence') {
            handleProductionSequence(args.sequenceName);
        } else if (fn === 'trigger_visual_fx') {
            spawnFX(args.type, args.x, args.y);
            toast(t('studio.messages.aiDirectorFX', { type: args.type }));
        } else if (fn === 'trigger_sponsorship') {
            studioStore.visualSettings.specialOverlays.sponsorName = args.sponsorName;
            studioStore.visualSettings.specialOverlays.showSponsorship = true;
            toast.info(t('studio.messages.aiSponsorshipActive', { name: args.sponsorName }));
            setTimeout(() => studioStore.visualSettings.specialOverlays.showSponsorship = false, 15000);
        } else if (fn === 'assemble_highlights') {
            handleHighlight();
        } else if (fn === 'request_vision') {
            handleVisionRequest(persona.uuid || persona.id);
            result = { success: true, message: t('studio.messages.visionCaptured') };
        } else if (fn === 'set_camera_transform') {
            cameraZoom.value = args.zoom || 1;
            cameraPanX.value = args.panX || 0;
            cameraPanY.value = args.panY || 0;
            toast.info(t('studio.messages.cameraFocusAdjusted'));
        } else if (fn === 'capture_moment') {
            if (currentSessionId.value) await studioStore.captureHighlight(currentSessionId.value);
        } else if (fn === 'shoutout_viewer') {
            toast.success(t('studio.messages.shoutout', { name: args.viewerName }), { description: args.reason });
        } else if (fn === 'push_show_note') {
            studioProducer.addNote({
                title: args.title,
                description: args.description || args.content,
                priority: args.priority || 'medium'
            });
        } else if (fn === 'archive_moment') {
            toast.info(t('studio.messages.agentArchived', { name: persona.name, description: args.description }));
        } else if (fn === 'update_fan_bond') {
            toast.info(t('studio.messages.socialBondUpdated', { name: args.viewerName }));
        } else if (fn === 'send_agent_message' || fn === 'broadcast_to_swarm') {
            // Backend relays these
        } else if (fn === 'set_camera_transform') {
            cameraZoom.value = args.zoom || 1.0;
            cameraPanX.value = args.panX || 0;
            cameraPanY.value = args.panY || 0;
        } else if (fn === 'set_studio_mood') {
            studioMood.value = args.mood;
        } else if (fn === 'start_quest') {
            activeQuest.value = {
                title: args.title,
                type: args.type,
                goal: args.goal,
                progress: 0,
                statusText: t('studio.messages.questStartedText'),
                masterId: persona.id
            };
            showQuestOverlay.value = true;
            toast.success(t('studio.messages.questStarted', { title: args.title }), { description: t('studio.messages.questMaster', { name: persona.name }) });
        } else if (fn === 'update_quest') {
            if (activeQuest.value) {
                activeQuest.value.progress = args.progress;
                if (args.statusText) activeQuest.value.statusText = args.statusText;
            }
        } else if (fn === 'set_avatar_pose') {
            if (guestRef) guestRef.setLiveVoicePose(args.part, args.value);
        } else if (fn === 'set_eye_focus') {
            if (guestRef) guestRef.setLiveVoiceEyeFocus(args.target);
        } else if (fn === 'trigger_performance') {
            if (guestRef) guestRef.setLiveVoicePerformance(args.style, args.intensity);
        } else if (fn === 'assign_floor') {
            floorAgentId.value = args.targetAgentId;
            toast.info(t('studio.messages.speakerFocusShift', { name: args.targetAgentId }));
        } else if (fn === 'trigger_hype_event') {
            toast.success(t('studio.messages.hypeEvent', { reason: args.reason }), { description: `Intensity: ${args.intensity}` });
            // Spawn constant likes for 5 seconds
            const hypeTimer = setInterval(spawnLike, 100);
            setTimeout(() => clearInterval(hypeTimer), 5000);
        } else if (fn === 'summon_broll') {
            showBRoll.value = args.enabled;
            if (args.enabled) {
                bRollTopic.value = args.topic;
                // Phase 64: Resolve real asset if possible
                const asset = studioStore.bRollLibrary.find(a => a.topic.toLowerCase().includes(args.topic.toLowerCase()));
                if (asset && bRollVideo.value) {
                    bRollVideo.value.src = getFileUrl(asset.url);
                    bRollVideo.value.play();
                }
            }
        } else if (fn === 'trigger_data_overlay') {
            // Phase 65: Dynamic Data Overlay
            showDynamicOverlay.value = true;
            dynamicOverlayType.value = args.type;
            dynamicOverlayData.value = args.data;
            
            if (args.duration) {
                setTimeout(() => {
                    showDynamicOverlay.value = false;
                }, args.duration * 1000);
            }
        } else if (fn === 'create_poll') {
            startPoll({
                question: args.question,
                options: args.options.map((opt: string) => ({ text: opt, votes: 0 }))
            });
        } else if (fn === 'feature_question') {
            featureQuestion({ id: Date.now().toString(), user: args.user, text: args.text });
        } else if (fn === 'trigger_dynamic_deal') {
            studioStore.startFlashSale({
                id: 'ai_deal_' + Date.now(),
                productId: args.productId,
                discount: args.discount,
                duration: args.durationSeconds,
                title: args.reason || t('studio.messages.aiDealTriggeredTitle')
            });
            toast.success(t('studio.messages.aiDealTriggered', { reason: args.reason }));
        } else if (fn === 'showcase_product') {
            const product = studioStore.liveProducts.find(p => p.id === args.productId || p._id === args.productId);
            if (product) {
                studioStore.showcaseProduct(product);
                toast.success(t('studio.messages.aiShowcase', { name: product.name }));
            } else {
                toast.error(t('studio.errors.productNotFound', { id: args.productId }));
            }
        } else if (fn === 'update_product_scarcity') {
            studioStore.updateProductScarcity(args.productId, args.remainingStock);
        } else if (fn === 'generate_stream_summary') {
            studioStore.triggerStreamSummary();
        } else if (fn === 'set_translation_mode') {
            studioStore.setTranslationMode(args.enabled, args.sourceLang, args.targetLang);
        } else if (fn === 'change_mood' || fn === 'set_studio_mood') {
            studioMood.value = args.mood;
            toast.info(t('studio.messages.studioAtmosphere', { mood: args.mood }));
        } else if (fn === 'syndicate_montage') {
            toast.success(t('studio.messages.syndicatingHighlights'), {
                description: args.caption
            });
        } else if (fn === 'suggest_viral_captions') {
            toast.info(t('studio.messages.aiViralMetadata'), {
                description: t('studio.messages.checkProductionPanel')
            });
        } else if (fn === 'assemble_highlights') {
            toast.info(t('studio.messages.aiAssemblingHighlights'));
            runAssembler({
                format: 'mp4',
                codec: 'h264',
                resolution: '1080p',
                fps: 30,
                bitrate: 'medium',
                includeAudio: true
            });
        } else if (fn === 'generate_background') {
            const loadingToast = toast.loading(t('studio.messages.generatingBackground', { prompt: args.prompt }));
            try {
                // Native AI Image Generation
                const res = await vtuberStore.generateImage({ prompt: args.prompt });
                const url = res.data?.url;
                
                if (url) {
                    selectStage({
                        id: `ai_gen_${Date.now()}`,
                        name: `AI: ${args.prompt}`,
                        url: url,
                        isVideo: false,
                        isAI: true
                    });
                    toast.dismiss(loadingToast);
                    toast.success(t('studio.messages.backgroundUpdated'));
                } else {
                    throw new Error("No URL returned");
                }
            } catch (e) {
                toast.dismiss(loadingToast);
                toast.error(t('studio.messages.backgroundFailed'));
            }
        } else if (fn === 'perform_song') {
            result = await handlePerformSongTool(persona, args);
        } else if (fn === 'stop_performance') {
            performanceModalVisible.value = false;
            
            // Fully stop the performance state
            mediaStore.stopPerformance();

            // Unmute the performer
            if (performingVTuber.value) {
                // Find the agent instance for this performer to unmute
                const personaId = performingVTuber.value.uuid || performingVTuber.value.id;
                const agent = liveChatConnections[personaId]?.geminiLive;
                if (agent) {
                    // Fix: isMuted is unwrapped in reactive 'liveChatConnections'
                (agent.isMuted as any) = false;
                }
            }
            performingVTuber.value = null;
            toast.info(t('studio.messages.agentStoppedPerformance', { name: persona.name }));
            result = { success: true, message: 'Performance stopped' };
        }
    }catch(err){

    }

    return result;
};

const handlePerformSongTool = async (persona: any, args: any) => {
	console.log("handlePerformSongTool");
    const loadingToast = toast.loading(t('studio.messages.preparingToSing', { name: persona.name, song: args.songName }));
    try {
        // 1. Search for the song
        const genderSuffix = persona.meta?.voiceConfig?.gender ? ` ${persona.meta.voiceConfig.gender} version` : '';
        const searchResults = await mediaStore.searchYouTubeMusic({
            query: `${args.songName} ${args.artist || ''}${genderSuffix}`,
            preferCovers: false,
            language: args.lyricsLanguage === 'vi' ? 'vietnamese' : 'english', // fallback logic
            maxResults: 5
        });

        if (!searchResults || searchResults.length === 0) {
            throw new Error("No song found");
        }

        const topMatch = searchResults[0];

        // 2. Fetch metadata and lyrics
        const metadata = await mediaStore.fetchYouTubeMetadata({
            videoId: topMatch.videoId,
            fetchLyrics: true,
            songTitle: topMatch.title,
            lyricsLanguage: args.lyricsLanguage || 'en'
        });

        // 3. Mute Gemini and Trigger Modal
        if (activeAgent.value) {
            activeAgent.value.isMuted.value = true;
        }

        performingVTuber.value = persona;
        performanceAudioUrl.value = await getFileUrl(`/api/media/youtube/stream/${topMatch.videoId}`, { cached: true });
        performanceLyrics.value = metadata.lyricsLines || [];
        performanceLyricsStyle.value = args.style || 'bounce';
        performanceLyricsPosition.value = args.position || 'bottom';
        performanceModalVisible.value = true;

        // Initialize store state
        mediaStore.startPerformance(
            persona.uuid || persona.id, 
            metadata.lyricsLines || [], 
            args.style || 'bounce', 
            args.position || 'bottom'
        );

        toast.dismiss(loadingToast);
        toast.success(t('studio.messages.nowSinging', { name: persona.name, song: topMatch.title }));
        return { success: true, song: topMatch.title };
    } catch (e) {
        console.error("[PerformSong] Tool failed", e);
        toast.dismiss(loadingToast);
        toast.error(t('studio.messages.failedToSing', { song: args.songName }));
        if (activeAgent.value) activeAgent.value.isMuted.value = false;
        return { success: false, error: (e as Error).message };
    }
};

const handleToggleRole = (personaId: string) => {
    if (masterAgentId.value === personaId) {
        masterAgentId.value = null;
        toast.info(t('studio.messages.agentRoleReset'));
    } else {
        masterAgentId.value = personaId;
        const name = guestPersonas.value.find(p => p.uuid === personaId)?.name || 'Agent';
        toast.success(t('studio.messages.promotedToGM', { name }), {
            description: "They will now have authority to start quests and coordinate the swarm."
        });
    }
};

// Phase 85: Music Performance Handlers
const handleOpenMusicSelector = (id: string) => {
    selectedVTuberId.value = id;
    musicSelectorVisible.value = true;
};

const handleMusicSelected = async (musicData: any) => {
    if (!selectedVTuberId.value) return;
    
    // Find guest in manager
    const guest = syntheticGuestManager.getGuests().find(
        g => g.persona.uuid === selectedVTuberId.value
    );
    
    if (guest) {
        // Update persona config
        if (!guest.persona.performanceConfig) guest.persona.performanceConfig = {};
        
        guest.persona.performanceConfig = {
            ...guest.persona.performanceConfig,
            backgroundMusic: {
                videoId: musicData.videoId,
                title: musicData.title,
                thumbnail: musicData.thumbnail,
                audioUrl: musicData.audioUrl,
                artist: musicData.artist
            },
            lyrics: musicData.lyrics,
            lyricsStyle: musicData.style || 'bounce',
            lyricsPosition: musicData.position || 'bottom'
        };
        
        // Sync to backend via store
        await vtuberStore.updatePerformanceConfig(selectedVTuberId.value, guest.persona.performanceConfig, true);
        
        toast.success(t('studio.messages.musicSynced', { name: guest.persona.name || 'VTuber' }));
    }
};

const handleStartPerformance = (id: string) => {
    const guest = syntheticGuestManager.getGuests().find(g => g.persona.uuid === id);
    
    if (guest && guest.persona.performanceConfig?.backgroundMusic) {
        performingVTuber.value = guest.persona;
        performanceAudioUrl.value = guest.persona.performanceConfig.backgroundMusic.audioUrl;
        performanceLyrics.value = guest.persona.performanceConfig.lyrics || [];
        performanceLyricsStyle.value = guest.persona.performanceConfig.lyricsStyle || 'bounce';
        performanceLyricsPosition.value = guest.persona.performanceConfig.lyricsPosition || 'bottom';
        performanceModalVisible.value = true;
    } else {
        toast.error(t('studio.messages.selectSongFirst'));
    }
};

// Attribute Handlers
const handleSetEmotion = ({ id, emotion }: { id: string; emotion: string }) => {
    syntheticGuestManager.setEmotion(id, emotion);
    toast.success(t('studio.messages.emotionSet', { emotion }));
};

const handleUpdateAnimation = ({ id, config }: { id: string; config: any }) => {
    syntheticGuestManager.updateAnimation(id, config);
    vtuberStore.updateAnimationConfig(id, config, true);
};

const handleUpdatePerformance = ({ id, config }: { id: string; config: any }) => {
    syntheticGuestManager.updatePerformance(id, config);
    vtuberStore.updatePerformanceConfig(id, config, true);
};

const handleSetBackground = ({ id, url }: { id: string; url: string }) => {
    syntheticGuestManager.setBackground(id, url);
    vtuberStore.updateVisualConfig(id, { backgroundUrl: url }, true);
    toast.success(t('studio.messages.backgroundUpdated'));
};


const handleToggleVision = (persona: any) => {
    if (liveVoiceActiveGuestId.value === persona.id) {
        isVisionActive.value = !isVisionActive.value;
        if (isVisionActive.value) {
            toast.success(t('studio.messages.visionEnabled'));
            startVisionBridge();
        } else {
            toast.info(t('studio.messages.visionDisabled'));
        }
    }
};

let visionTimer: any = null;
const visionCanvas = document.createElement('canvas');
visionCanvas.width = 640;
visionCanvas.height = 360;

const startVisionBridge = () => {
    if (visionTimer) return;
    visionTimer = setInterval(() => {
        if (!isVisionActive.value || !outputCanvas.value || !isGeminiConnected.value) {
            clearInterval(visionTimer);
            visionTimer = null;
            return;
        }

        // Capture canvas frame
        const ctx = visionCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(outputCanvas.value, 0, 0, 640, 360);
            const base64 = visionCanvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            if (activeAgent.value) activeAgent.value.sendVideoFrame(base64);
        }
    }, 500); // 2fps for better responsiveness
};

// Sync Gemini audio levels to the virtual guest component
watch(geminiAudioLevel, (level) => {
    if (liveVoiceActiveGuestId.value && virtualGuestRefs[liveVoiceActiveGuestId.value]) {
        virtualGuestRefs[liveVoiceActiveGuestId.value].setLiveVoiceAudioLevel(level);
    }
});

// Process AI decisions if God Mode is on
const processGodModeDecisions = async () => {
   if (!studioStore.godModeEnabled) return;

   const context = {
      voiceLevel: audioLevel.value,
      activeGuests: studioStore.liveGuests.length,
      chatVelocity: messages.value.filter(m => Date.now() - m.timestamp < 60000).length,
      currentSceneId: studioStore.activeScene.id,
      guestLevels: Object.values(guestLevels.value),
      isTransitioning: false,
      v2cMatch: studioStore.v2cMatch,
      intentScore: studioStore.intentScore,
      currentRatio: studioStore.streamRatio
   };

   const decision = await studioDirector.tick(context as any);
   if (decision.action === 'switch_scene' && decision.payload) {
      studioStore.switchScene(decision.payload);
      toast.info(t('studio.messages.aiChoice', { payload: decision.payload }));
    } else if (decision.action === 'show_lower_third') {
        showLowerThird.value = true;
        toast.info(t('studio.messages.aiShowingInfoCard'));
        setTimeout(() => { showLowerThird.value = false; }, 8000);
    } else if (decision.action === 'trigger_product') {
        let product;
        if (decision.payload && (decision.payload.id || decision.payload._id)) {
             product = studioStore.liveProducts.find((p: any) => p.id === decision.payload.id || p._id === decision.payload.id);
        } else {
             // Auto-select random product if reason provided but no ID
             const products = studioStore.liveProducts;
             if (products.length > 0) {
                 product = products[Math.floor(Math.random() * products.length)];
             }
        }
        
        if (product) {
            studioStore.showcaseProduct(product);
            toast.info(t('studio.messages.aiShowcasingProduct', { name: product.name }), {
                description: "Auto-selected based on engagement context."
            });
        }
    } else if (decision.action === 'trigger_celebration') {
        const type = decision.payload?.type;
        if (type === 'camera_path') {
            syntheticGuestManager.updatePerformance(decision.payload.target, { 
                activeCameraPath: decision.payload.path,
                cameraIntensity: 1.0 
            });
            toast.info(t('studio.messages.aiCinematicCam', { path: decision.payload.path }));
        } else if (type === 'atmosphere') {
            syntheticGuestManager.updatePerformance(decision.payload.target, { 
                particleType: decision.payload.effect,
                auraEnabled: true 
            });
            toast.info(t('studio.messages.aiAtmosphereChange', { effect: decision.payload.effect }));
        } else {
            spawnFX('confetti'); 
            toast(t('studio.messages.aiCelebration'));
        }
    } else if (decision.action === 'publish_viral_moment') {
        if (studioStore.autoDirectorSettings.autoPublishViral && currentSessionId.value) {
            toast.info(t('studio.messages.aiViralMomentDetected'));
            studioStore.captureHighlight(currentSessionId.value, { 
                description: decision.payload?.type === 'hype_burst' ? 'Viral engagement spike' : 'High purchase behavior',
                importance: 10
            }).then((moment: any) => {
                if (moment && (moment.id || moment._id)) {
                    studioStore.publishMoment(moment.id || moment._id);
                }
            });
        }
    } else if (decision.action === 'auto_reframing') {
        studioStore.streamRatio = decision.payload.ratio;
        toast.info(t('studio.messages.aiAutoReframing', { ratio: decision.payload.ratio }));
    } else if (decision.action === 'change_global_atmosphere') {
        globalAtmosphere.value = decision.payload.effect;
        toast.info(t('studio.messages.aiGlobalAtmosphere', { effect: decision.payload.effect }));
    } else if (decision.action === 'react_to_gift') {
        const { userName, giftName, cost } = decision.payload;
        if (cost >= 1000) {
            // High-value gift: Production Escalation
            studioStore.switchScene('shoutout');
            spawnFX('confetti');
            globalAtmosphere.value = 'glitter';
            toast.success(t('studio.messages.aiGiftEscalation', { user: userName, gift: giftName }));
            // Reset to normal after 15s
            setTimeout(() => {
                if (studioStore.activeScene.id === 'shoutout') studioStore.switchScene('standard');
                globalAtmosphere.value = null;
            }, 15000);
        } else {
            toast.info(t('studio.messages.aiGiftReaction', { user: userName, gift: giftName }));
        }
    } else if (decision.action === 'hype_boost') {
        globalAtmosphere.value = 'fireflies';
        toast.info(t('studio.messages.aiHypeBoost'));
        setTimeout(() => { globalAtmosphere.value = null; }, 10000);
    } else if (decision.action === 'trigger_group_action') {
        const { gesture, emotion, toast: toastMsg } = decision.payload;
        syntheticGuestManager.triggerGroupGesture(gesture || 'bow');
        if (emotion) {
            for (const guestId of syntheticGuestManager.activeGuests.keys()) {
                syntheticGuestManager.setEmotion(guestId, emotion);
            }
        }
        if (toastMsg) toast.info(t(`studio.messages.${toastMsg}`));
    } else if (decision.action === 'capture_highlight') {
        handleHighlight();
        toast(t('studio.messages.aiHighlight'));
    } else if ((decision.action as string) === 'trigger_visual_fx' || (decision.action === 'show_overlay' && decision.payload?.type === 'particles')) {
        // Trigger generic particle effect
        spawnFX(decision.payload?.type || 'confetti');
        toast(t('studio.messages.aiVisualEffectsActive'));
    }
};

// Watch for God Mode throttled logic
watch(frameCount, (val) => {
   const now = Date.now();
   if (studioStore.godModeEnabled && val % 300 === 0) { // Every 10 seconds at 30fps
      processGodModeDecisions();
   }
   
   const calculateSentiment = () => {
       const recentMsgs = messages.value.filter(m => Math.abs(Date.now() - m.timestamp) < 60000);
       if (recentMsgs.length === 0) return 0.7; // Default positive baseline
       
       let score = 0;
       const positive = ['lol', 'lmao', 'pog', 'good', 'great', 'love', 'cool', 'w', 'nice', 'awesome'];
       const negative = ['bad', 'lag', 'boring', 'hate', 'l', 'worst', 'stop', 'bug'];
       
       recentMsgs.forEach(m => {
           const text = m.text.toLowerCase();
           if (positive.some(k => text.includes(k))) score += 1;
           if (negative.some(k => text.includes(k))) score -= 1;
       });
       
       // Normalize to 0-1 range (baseline 0.5)
       const normalized = 0.5 + (score * 0.1);
       return Math.max(0.1, Math.min(0.95, normalized));
   };

   // 1. Studio Vibe & Environment (Phase 3)
   if (val % 150 === 0 && !isGuest.value) { // Every 5 seconds at 30fps
      studioVibeAnalyzer.update({
         voiceLevel: audioLevel.value,
         chatVelocity: messages.value.filter(m => Math.abs(now - m.timestamp) < 60000).length,
         userSentiment: calculateSentiment()
      });
      if (now - lastSnapshotTime.value > 30000) captureCanvasSnapshot();
   }

   if (val % 150 === 0) { // Every 5 seconds at 30fps
      studioProducer.tick({
            vibe: studioVibeAnalyzer.state,
            engagement: studioStore.engagement,
            messages: messages.value,
            activeScene: studioStore.activeScene.id,
            vision: canvasContext.value
        });
        conversationOrchestrator.tick({
         voiceLevel: audioLevel.value,
         activeGuests: activeGuests.value.length,
         vibe: studioVibeAnalyzer.state,
         vision: canvasContext.value,
         autoEmotionEnabled: studioStore.autoDirectorSettings.autoEmotionEnabled
      });
   }
});

const captureCanvasSnapshot = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
        const imageData = canvas.toDataURL('image/jpeg', 0.5);

        const response = await vtuberStore.analyzeVision({ 
            image: imageData,
            prompt: "You are a professional live stream director. Analyze this frame and provide one short, actionable advice to improve the visual quality or engagement. Be direct and concise."
        });
        
        if (response.data?.data) {
            directorNotes.value = response.data.data;
        }
    } catch (error) {
        console.warn('[Vision] Analysis skipped:', error);
    }
};



// Methods & Actions
const toggleLive = async () => {
   if (isLive.value) {
      // STOPPING: Trigger Synthesis
    //   if (isGeminiConnected.value) {
          isSynthesizing.value = true;
          showPostStreamSummary.value = true;
          broadcastToVTubers("[Stream Synthesis Request] The live session has ended. Please generate a stream summary and suggest social captions for any highlights captured.");
          
          // Fetch Commercial Report (Phase 17)
          if (currentSessionId.value) {
              try {
                  const data = await studioStore.fetchCommerceReport(currentSessionId.value);
                  commerceReport.value = data;
              } catch (e) {
                  console.error('[Commerce] Failed to fetch final report:', e);
              }
          }
		  isSynthesizing.value = false;
    //   }
   }
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

const directorLog = ref<any[]>([]);

const addDirectorLog = (action: string, reason: string) => {
    directorLog.value.unshift({ action, reason, timestamp: Date.now() });
    if (directorLog.value.length > 20) directorLog.value.pop();
};

const handleMetadataUpdate = async (metadata: { title?: string, description?: string }) => {
    if (metadata.title) currentProject.value.title = metadata.title;
    if (metadata.description !== undefined) currentProject.value.description = metadata.description;
    
    // 1. Sync to ConversationOrchestrator topic if title changed
    if (metadata.title) {
        conversationOrchestrator.setTopic(metadata.title);
    }
    
    // 2. Sync to Platforms if live
    if (isLive.value) {
        toast.info(t('studio.messages.syncingMetadata') || 'Syncing metadata with platforms...');
        try {
            const updatePayload = {
                title: currentProject.value.title,
                description: currentProject.value.description || ''
            };
            await Promise.all(selectedPlatforms.value.map(pId => 
                platformStore.updateLiveMetadata(pId, updatePayload)
            ));
            toast.success(t('studio.messages.metadataSynced') || 'Metadata synced across platforms');
        } catch (e) {
            console.error('[Studio] Platform sync failed:', e);
            toast.error('Failed to sync metadata across all platforms');
        }
    }
};


// Demo Mode Simulated Engagement (Phase 82)
let demoInterval: any = null;
watch(() => studioStore.demoMode, (active) => {
    if (active) {
        addDirectorLog('Demo Mode Engaged', 'Studio is now in simulation mode. External streaming is paused.');
        demoInterval = setInterval(() => {
            const mockUsers = ['CyberSpectator', 'FutureFan', 'NeonViewer', 'DigitalDrift'];
            const mockMsgs = [
                'Wow, the VTuber looks so real!',
                'Love the lighting in this scene!',
                'Is this running on Gemini Live?',
                'Amazing production quality! ��',
                'Can we see the marketplace integration?',
                'The Swarm monitor is showing 100% health, nice!'
            ];
            
            // Randomly push a message
            if (active && Math.random() > 0.7) {
                const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
                const text = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
                messages.value.push({
                    id: 'demo_' + Date.now(),
                    user: user + ' (Demo)',
                    text,
                    timestamp: Date.now(),
                    isSocial: true,
                    platform: 'demo'
                });
                if (messages.value.length > 50) messages.value.shift();
            }

            // Randomly trigger FX (likes)
            if (active && Math.random() > 0.8) {
                spawnFX('hearts');
            }
        }, 5000);
    } else {
        if (demoInterval) {
            clearInterval(demoInterval);
            demoInterval = null;
            addDirectorLog('Demo Mode Disengaged', 'Studio returned to production mode.');
        }
    }
}, { immediate: true });


const toggleRecord = () => {
   if (studioRecorder.isRecording.value) {
      studioRecorder.stopRecording();
      // Dialog will open when recording stops/is processed
      // We watch recorder state or just open it?
      // useStudioRecorder sets recordedUrl on stop.
      // Let's wait a tick or watch `recordedUrl`
      setTimeout(() => {
          showRecordingDialog.value = true;
      }, 500); // Small delay for blob generation
      toast.info(t('studio.messages.recordingSaved'));
   } else {
       const canvas = outputCanvas.value;
       if (canvas) {
           const stream = canvas.captureStream(30);
           if (hostStream.value) {
               hostStream.value.getAudioTracks().forEach(t => stream.addTrack(t));
           }
           studioRecorder.startRecording(stream);
           toast.success(t('studio.messages.recordingStarted'));
       } else {
           toast.error('No video source to record');
       }
   }
};

const handleSaveRecording = async (callback: Function) => {
    try {
        const projectId = currentProject.value.id === 'current' ? undefined : currentProject.value.id;
        const result = await studioRecorder.saveToGallery(projectId);
        callback(result);
    } catch (e) {
        callback(null);
    }
};

const handleHighlight = async () => {
   if (!currentSessionId.value) return;
   await studioStore.captureHighlight(currentSessionId.value);
   
   // AI Guest confirms the capture
   import('@/utils/ai/SyntheticGuestManager').then(({ syntheticGuestManager }) => {
      syntheticGuestManager.handleManualHighlight();
   });
};

watch(() => studioStore.demoMode, (val) => {
   if (val) {
      if (!isLive.value) toggleLive();
      mockChat();
   }
});

// AI Chat Synergy: React to user messages
watch(messages, (newList) => {
    if (newList.length === 0 || isGuest.value) return;
    const lastMsg = newList[newList.length - 1];
    
    // Ignore AI/System messages to prevent loops
    if (lastMsg.user.includes('AI') || lastMsg.id === 'system') return;
    
    // Feed the message to orchestrator history
    conversationOrchestrator.recordInteraction(lastMsg.user, lastMsg.text);

    // Probability of AI guest chiming in reactively
    const activeAIs = activeGuests.value;
    if (activeAIs.length > 0 && Math.random() < 0.2) {
        setTimeout(() => {
            const guest = activeAIs[Math.floor(Math.random() * activeAIs.length)];
            conversationOrchestrator.tick({
                voiceLevel: audioLevel.value,
                activeGuests: activeAIs.length,
                vision: canvasContext.value,
                vibe: studioVibeAnalyzer.state
            });
        }, 1500);
    }
}, { deep: true });

const spawnFX = (type: string = 'hearts', x?: number, y?: number) => {
   const id = Math.random().toString(36).substr(2, 9);
   const isExplosion = type === 'confetti' || type === 'cash';
   
   if (isExplosion) {
       activeExplosions.value.push({
           id,
           type,
           style: {
               left: x !== undefined ? `${x}%` : '50%',
               top: y !== undefined ? `${y}%` : '50%'
           }
       });
       setTimeout(() => {
           activeExplosions.value = activeExplosions.value.filter(e => e.id !== id);
       }, 2000);
   } else {
       const style = {
           left: x !== undefined ? `${x}%` : `${10 + Math.random() * 80}%`,
           animationDuration: `${1.5 + Math.random()}s`
       };
       activeFX.value.push({ id, type, style });
       
       if (activeFX.value.length > 15) {
          triggerCollectiveReaction('nod');
       }

       setTimeout(() => {
          activeFX.value = activeFX.value.filter(fx => fx.id !== id);
       }, 2500);
   }
}

const spawnLike = () => spawnFX('hearts');

const triggerCollectiveReaction = (gesture: string) => {
    activeGuests.value.forEach(guest => {
        syntheticGuestManager.triggerGesture(guest.persona.uuid, gesture);
    });

    window.addEventListener('show:b_roll_generated', (e: any) => {
        const asset = e.detail;
        studioStore.bRollLibrary.push(asset);
        bRollTopic.value = asset.topic;
        currentBRollUrl.value = asset.url;
        showBRoll.value = true;
        setTimeout(() => {
            showBRoll.value = false;
        }, 8000);
    });

    const currentParticleType = ref<string | null>(null);

    window.addEventListener('show:atmosphere_shift', (e: any) => {
        const { mood } = e.detail;
        
        // Always update the store vibe
        studioStore.updateStudioVibe(mood);

        // Human Free Mode: Auto-trigger particles
        if (studioStore.humanFreeMode) {
            let effect: any = null;
            if (mood === 'hype') effect = 'glitter';
            else if (mood === 'chill') effect = 'bubbles';
            else if (mood === 'tense') effect = 'fireflies';
            
            currentParticleType.value = effect;
        }
    });

    // Phase 22: Live Subtitles (CapCut Style)
    const postToWorker = (type: string, payload: any) => {
        window.dispatchEvent(new CustomEvent('studio-worker-command', { detail: { type, payload } }));
    };

    watch(() => studioStore.liveSubtitlesEnabled, (enabled) => {
        if (enabled && hostStream.value) {
            LiveCaptionService.start(hostStream.value);
        } else {
            LiveCaptionService.stop();
        }
    });

    window.addEventListener('show:caption_update', (e: any) => {
        postToWorker('update-caption', e.detail);
    });
};

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
const { health } = storeToRefs(studioStore);
const viewers = computed(() => studioStore.viewerCount);
const health_status = computed(() => health.value.status);
const bitrate = computed(() => health.value.bitrate);

// Sync real-time metrics back to store for worker/director usage
watch(() => messages.value.length, () => {
   const velocity = messages.value.filter(m => Date.now() - m.timestamp < 60000).length;
   studioStore.updateMetrics({ chatVelocity: velocity });
}, { immediate: true });

const { startMonitoring: startViralDetection, stopMonitoring: stopViralDetection } = useViralMomentDetector({
    audioLevel,
    chatVelocity: computed(() => studioStore.chatVelocity),
    onViralMoment: handleHighlight
});

watch(isLive, (val) => {
    if (val) startViralDetection();
    else stopViralDetection();
});

const activePeak = ref<any>(null);

// Translation & Multi-lingual Engines
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any = null;

const startTranscription = () => {
   if (!SpeechRecognition || recognition) return;
   
   recognition = new SpeechRecognition();
   recognition.continuous = true;
   recognition.interimResults = true;
   recognition.lang = sourceLang.value;

   recognition.onresult = async (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
         if (event.results[i].isFinal) {
            const rawText = event.results[i][0].transcript;
            
            if (isTranslating.value && targetLang.value !== sourceLang.value) {
               try {
                  const res = await vtuberStore.translateText({ 
                     text: rawText, 
                     targetLang: targetLang.value, 
                     sourceLang: sourceLang.value 
                  });
                  currentTranscript.value = res.data;

                  // Bridge to Gemini for VTuber Dubbing
                  if (isGeminiConnected.value) {
                      broadcastToVTubers(`[Translate & Dub] From ${sourceLang.value} to ${targetLang.value}: ${rawText}`);
                  }
               } catch (e) {
                  currentTranscript.value = rawText;
               }
            } else {
               currentTranscript.value = rawText;
            }
         }
      }
   };

   recognition.onerror = (event: any) => {
      console.error('[STT] Error:', event.error);
      if (event.error === 'no-speech') return;
      isTranslating.value = false;
   };

   recognition.onend = () => {
      if (isTranslating.value) recognition.start();
   };

   recognition.start();
   console.log('[STT] Started with lang:', sourceLang.value);
};

const stopTranscription = () => {
   if (recognition) {
      recognition.stop();
      recognition = null;
   }
   currentTranscript.value = '';
};

watch(isTranslating, (val) => {
   if (val) startTranscription();
   else stopTranscription();
});

watch(sourceLang, (newLang) => {
   if (isTranslating.value && recognition) {
      stopTranscription();
      startTranscription();
   }
});

// Bridge live transcript to canvas subtitles
watch(currentTranscript, (text) => {
   if (studioStore.visualSettings.accessibility?.showSubtitlesOnCanvas) {
      setSubtitles(text || '');
   }
});

watch(() => studioStore.visualSettings.accessibility?.showSubtitlesOnCanvas, (enabled) => {
   if (!enabled) setSubtitles('');
});

// Watch for captions to trigger intent analysis
watch(() => studioStore.currentCaption, (cap) => {
    if (cap && cap.text && studioStore.visualSettings.ai?.autonomousProduction) {
        intentAnalyzer.analyze(cap.text);
    }
}, { deep: true });

/**
 * Phase 23: Vibe Shop 2.0 - Dynamic Product Pitching & Media Coordination
 * When a product is showcased, trigger transitions, scripts, and relevant media.
 */
watch(() => studioStore.highlightedProduct, async (product) => {
    if (!product) {
        // Clear media state if nothing is highlighted
        studioStore.setMedia(null);
        return;
    }

    console.log(`[Vibe Shop] Showcasing Product: ${product.name}`);

    // 1. Trigger TikTok-style transition
    const transitions: ('glitch' | 'zoom' | 'slide')[] = ['glitch', 'zoom', 'slide'];
    const selectedTransition = transitions[Math.floor(Math.random() * transitions.length)];
    
    window.dispatchEvent(new CustomEvent('studio-worker-command', {
        detail: { type: 'trigger-transition', payload: { type: selectedTransition, duration: 800 } }
    }));

    // 2. Generate Interactive Pitch Script
    const script = ProductPitchService.generateScript({
        product,
        vibe: studioStore.studioVibe,
        chatContext: messages.value.slice(-5).map(m => m.user),
        language: userStore.preferredLanguage === 'vi' ? 'vi-VN' : 'en-US'
    });

    // 3. Coordinate Media & Voice
    const activeAI = activeGuests.value.find(g => g.persona?.visual?.modelType === 'aidol');
    
    if (activeAI) {
        // AIDOL: Switch Neural Video clip + Generate Voice
        
        // Inject product specific clip if available from Phase 24 linking
        const productClip = (product as any).eventClip?.['product'];
        if (productClip) {
            if (!activeAI.persona.visual.aidolClips) activeAI.persona.visual.aidolClips = {};
            activeAI.persona.visual.aidolClips['product'] = productClip;
        }

        syntheticGuestManager.triggerGesture(activeAI.persona.uuid, `product`);
        
        // Use dubber for the voice-over (synchronized lip-sync)
        vtuberDubber.setDubbing(true, userStore.preferredLanguage === 'vi' ? 'vi-VN' : 'en-US');
        vtuberDubber.dubText(script);
        
        // Inform AI agents of the event
        broadcastToVTubers(`[Product Pitch] Product: ${product.name}. Description: ${product.description}. Script: ${script}`);
    } else {
        // 3D/L2D: Play TVC + Live Dubbing
        if (product.video) {
            studioStore.setMedia(product.id || product._id);
        }
        
        // Model speaks the pitch
        vtuberDubber.setDubbing(true, userStore.preferredLanguage === 'vi' ? 'vi-VN' : 'en-US');
        vtuberDubber.dubText(script);
    }
});

watch(() => studioStore.visualSettings.accessibility?.showSubtitlesOnCanvas, (enabled) => {
   if (!enabled) setSubtitles('');
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

      // Real Chat Velocity influence
      const chatVel = studioStore.chatVelocity;
      
      // Calculate vibe based on activity
      const targetScore = Math.min(100, 20 + (chatVel * 10) + (isLive.value ? 20 : 0));
      const drift = (targetScore - studioStore.vibeScore) * 0.2;
      const newScore = Math.max(0, Math.min(100, studioStore.vibeScore + drift));
      studioStore.updateMetrics({ vibeScore: newScore });

      if (studioStore.vibeScore > 80) currentVibeName.value = 'Hype Energy';
      else if (studioStore.vibeScore > 40) currentVibeName.value = 'Techno Chill';
      else currentVibeName.value = 'Deep Focus';

      // We no longer randomly update health or viewerCount here.
      // Health is updated by useStudioSession statistics.
      // viewerCount is updated by ActionSyncService room size.
   }, 5000);
};

const activeScene = computed({
   get: () => studioStore.activeScene,
   set: (val) => studioStore.switchScene(val.id)
});

const remoteGuests = computed(() => studioStore.liveGuests);
const scenes = computed(() => studioStore.scenes);

const activeGuests = computed(() => syntheticGuestManager.getGuests());

// Fix: Define stageGuests for VirtualStudioStage
const stageGuests = computed(() => {
    // Collect all guests from slots
    const guests = [];
    
    // No render host in cinematic mode
    // if (hostStream.value) {
    //     guests.push({
    //         id: 'host',
    //         name: 'Host',
    //         type: 'host',
    //         videoEnabled: camOn.value,
    //         audioLevel: hostLevel.value || 0
    //     });
    // }
    
    for (const [slotId, rawGuest] of Object.entries(studioStore.guestSlotMap)) {
        const guest = rawGuest as any;
        if (!guest) continue;
        
        // Find persona if it's an AI guest
        let persona = null;
        if (guest.type === 'ai') {
            persona = activeGuests.value.find((p: any) => p.persona.uuid === guest.uuid);
        }

        guests.push({
            ...guest,
            slotId, // e.g. guest1
            persona: persona || undefined,
            // Unified visual state
            modelType: persona?.persona?.visual?.modelType || persona?.visual?.modelType,
            modelUrl: persona?.persona?.visual?.modelUrl || persona?.visual?.modelUrl,
            visual: persona?.visual || persona?.persona?.visual || {},
            // Map audio level
            audioLevel: (guestLevels.value && guest.uuid ? guestLevels.value[guest.uuid] : 0)
        });
    }
    return guests;
});

const summonGuest = (persona: any) => {
   syntheticGuestManager.summonGuest(persona);
   toast.success(`Summoning ${persona.name}...`);
}

const toggleGuest = (guest: any) => {
   if (!guest.active) {
      syntheticGuestManager.summonGuest(guest);
      toast.success(`${guest.name} joining session...`);
   } else {
      syntheticGuestManager.removeGuest(guest.uuid);
      toast.info(`${guest.name} left session.`);
   }
}

const handleKickGuest = (guestId: string) => {
    // Check if it's an AI guest or real guest
    const isAI = activeGuests.value.some((p: any) => p.persona.uuid === guestId);
    if (isAI) {
        syntheticGuestManager.removeGuest(guestId);
    } else {
        studioStore.kickGuest(guestId);
    }
};

const isHostSpeaking = computed(() => hostLevel.value > 0.05);

// Auto-sync StudioStore guests with SyntheticGuestManager
watch(() => studioStore.liveGuests, (guests) => {
    if (isGuest.value) return; // Only host manages AI guests

    guests.forEach(guest => {
        if (guest.type === 'ai') {
            const isManaged = syntheticGuestManager.getGuests().some(g => g.persona.uuid === guest.uuid);
            if (!isManaged) {
                console.log(`[Studio] Auto-summoning managed guest: ${guest.name} (${guest.uuid})`);
                // Find full persona from library if possible, or create one
                const library = syntheticGuestManager.getPersonaLibrary();
                const persona = library.find(p => p.uuid === guest.uuid || p.entityId === guest.uuid);
                
                if (persona) {
                    syntheticGuestManager.summonGuest(persona);
                } else {
                    // Fallback: summon with basic data
                    syntheticGuestManager.summonGuest({
                        uuid: guest.uuid,
                        id: guest.uuid,
                        name: guest.name,
                        visual: { thumbnailUrl: guest.avatar },
                        identity: { name: guest.name, role: 'guest' }
                    } as any);
                }
            }
        }
    });

    // Handle removals
    const guestIds = new Set(guests.map(g => g.uuid));
    syntheticGuestManager.getGuests().forEach(managedGuest => {
        if (!guestIds.has(managedGuest.persona.uuid)) {
            console.log(`[Studio] Auto-removing managed guest: ${managedGuest.persona.uuid}`);
            syntheticGuestManager.removeGuest(managedGuest.persona.uuid);
        }
    });
}, { immediate: true, deep: true });

// Automated Studio Direction: Speaker-based Scene Switching
watch(activeGuests, (guests) => {
   if (!studioStore.autoDirectorSettings.autoSwitchOnSpeaker || !isLive.value) return;

   const speakingGuest = guests.find(g => g.isSpeaking);
   if (speakingGuest) {
      // Find which slot this guest is in
      const slotIndex = Object.values(studioStore.guestSlotMap).findIndex((g: any) => g?.uuid === speakingGuest.persona.uuid);
      if (slotIndex !== -1) {
         // Focus on the guest
         const targetScene = `${slotIndex + 1}`;
         if (studioStore.scenes.find(s => s.id === targetScene)) {
            studioStore.switchScene(targetScene);
         } else {
            // Fallback: switch to a multi-view layout
            studioStore.switchScene('grid_auto');
         }
      }
   }
}, { deep: true });

// Also watch host speaking to switch back
watch(isHostSpeaking, (speaking) => {
    if (speaking && studioStore.autoDirectorSettings.autoSwitchOnSpeaker && isLive.value) {
        studioStore.switchScene('host_focus');
    }
});

const handleVirtualGuestStream = (id: string, stream: MediaStream) => {
    // First, register the guest in studioStore NOW that the model is loaded & stream captured.
    // This prevents black screen in guest slots during model loading.
    const persona = guestPersonas.value.find(g => g.uuid === id);
    studioStore.addGuest({
        uuid: id,
        name: persona?.name || 'AI Guest',
        type: 'ai',
        status: 'live',
        audioEnabled: true,
        videoEnabled: true,
        avatar: persona?.visual?.thumbnailUrl
    });

    // Then add the synthetic stream for P2P/canvas rendering
    addSyntheticGuest(id, stream);
    
    // Auto-assign to a slot if available
    const existingSlot = Object.values(studioStore.guestSlotMap).find((g: any) => g?.uuid === id);
    if (!existingSlot) {
        const emptySlotIndex = Object.values(studioStore.guestSlotMap).findIndex(g => !g);
        if (emptySlotIndex !== -1) {
            studioStore.assignGuestToSlot(id, emptySlotIndex);
            toast.success(`${persona?.name || 'AI Guest'} is live in Slot ${emptySlotIndex + 1}`);
        }
    }

    // Auto-switch layout for better visibility
    studioStore.setCameraFocus('wide');
};

const handleProductionSequence = (name: string) => {
    toast.info(`Executing production sequence: ${name.toUpperCase()}`);
    if (name === 'hype_intro') {
        studioStore.setAutoCamera(true);
        setTimeout(() => studioMood.value = 'vibrant', 500);
        const hypeInterval = setInterval(spawnLike, 50);
        setTimeout(() => {
            clearInterval(hypeInterval);
            studioMood.value = 'standard';
        }, 5000);
    } else if (name === 'dramatic_reveal') {
        studioStore.setAutoCamera(true);
        studioMood.value = 'noir';
        setTimeout(() => studioMood.value = 'standard', 3000);
    }
};

const handleTalkGuest = async ({ id, prompt }: { id: string, prompt: string }) => {
   // Inject visual context if available
   const contextualPrompt = canvasContext.value 
      ? `CONTEXT: You can see the studio canvas. It currently shows: ${canvasContext.value}. \nPROMPT: ${prompt}`
      : prompt;

   // Check if this VTuber is connected via LiveChat Manager
   const connection = liveChatConnections[id];
   
   if (connection && connection.isConnected) {
      // Send text via WebSocket (LiveChat)
      connection.geminiLive.sendText(contextualPrompt);
      const name = guestPersonas.value.find((p) => p.uuid === id)?.name || id;
      toast.info(`${name} is responding via Live Chat...`);
   } else {
      // Fallback to HTTP API for non-LiveChat VTubers
      const res = await syntheticGuestManager.generateResponse(id, contextualPrompt);
      if (res) {
         const name = guestPersonas.value.find((p) => p.uuid === id)?.name || id;
         conversationOrchestrator.recordInteraction(name, res.text);
         if (res.action && res.action !== 'none') {
            studioDirector.requestAction(res.action, res.actionPayload);
            toast.success(`${name} requested: ${res.action}`);
         }
         toast.info(`${name} is responding...`);
      }
   }
};

const handleManualGesture = ({ id, gesture }: { id: string, gesture: string }) => {
    syntheticGuestManager.triggerGesture(id, gesture);
    toast.success(`Triggered ${gesture} for guest`);
};

/**
 * Captures a high-res snapshot of the canvas and sends it to the requesting AI guest for "Vision" analysis.
 */
const handleVisionRequest = async (guestId: string) => {
	console.log("handleVisionRequest", guestId);
    if (!outputCanvas.value) return;
    
    // Capture high-res frame from main output
    const dataUrl = outputCanvas.value.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    
    // Find the agent in the swarm
	const persona = guestPersonas.value.find(p => p.uuid === guestId);
    const archiveId = persona?.entityId || persona?.uuid;
    const agent = archiveId ? swarmAgents[archiveId] : null;

    if (agent) {
        toast.info(`AI Vision: ${persona?.name} is analyzing the stage...`);
        agent.sendVideoFrame(base64);
    }
};

const toggleLowerThird = () => {
   studioStore.visualSettings.showLowerThird = !studioStore.visualSettings.showLowerThird;
}

const toggleTicker = () => {
   studioStore.visualSettings.showTicker = !studioStore.visualSettings.showTicker;
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



// Performance Tracking
let snapshotInterval: any = null;
const startPerformanceTracking = () => {
    if (snapshotInterval || isGuest.value) return;
    snapshotInterval = setInterval(() => {
        if (!isLive.value) return;

        const now = Date.now();
        const chatVelocity = messages.value.filter(m => now - m.timestamp < 60000).length;
        
        ActionSyncService.sendPerformanceSnapshot({
            viewerCount: (viewers.value as any)?.length || 0, // Safe access
            chatVelocity,
            vibeScore: vibeScore.value,
            activeStyle: currentFilter.value,
            activePersona: liveVoiceActiveGuestId.value || 'none'
        });
    }, 30000); // Every 30 seconds
};

// Chat handling
onMounted(() => {
   startPerformanceTracking();
   window.addEventListener('studio:chat', (e: any) => {
      const comment = e.detail;
      const msg = {
         id: comment.id,
         user: comment.userName,
         text: comment.text,
         timestamp: new Date(comment.createdAt).getTime(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`
      };
      
      messages.value.push(msg);
      
      // Social Awareness: Route to Gemini
      if (isGeminiConnected.value) {
         const decisions = conversationRouter.routeMessage(msg.text, liveChatConnections, lastSpeakerId.value || undefined);
         
         if (decisions.length > 0) {
            // Send to best matches
            decisions.forEach(decision => {
                const connection = liveChatConnections[decision.targetId];
                if (connection && connection.isConnected) {
                    connection.geminiLive.sendText(`[Chat] ${msg.user}: ${msg.text}`);
                    lastSpeakerId.value = decision.targetId;
                }
            });
         } else {
            // Fallback: broadcast if it's a multi-party trigger or if no one was selected but we want interaction
            if (conversationRouter.isMultiResponseTrigger(msg.text)) {
                broadcastToVTubers(`[Chat] ${msg.user}: ${msg.text}`);
            }
         }
      }

      conversationOrchestrator.recordInteraction(msg.user, msg.text);
      if (messages.value.length > 100) messages.value.shift();

      // Social spawn logic (auto-likes/purchases can be moved here based on chat sentiment if wanted)
   });
});

const sendChat = (text: string) => {
   ActionSyncService.sendChatMessage(text);
};

const mockChat = () => {
   // Retired: Real chat now enabled via Socket.IO
};

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
      studioStore.visualSettings.background.is360 = bg.is360 || false;

      // Persistence for custom uploads
      if (bg.id.startsWith('custom_') && !studioStore.backgroundAssets.find(a => a.id === bg.id)) {
         studioStore.addCustomBackground(bg);
      }
   }

   selectedBackground.value = bg.url;
   toast.info(`Scene updated: ${bg.name}`);
}

const handleApplyPreset = (p: any) => {
    studioMood.value = p.mood;
    if (p.bg) {
        selectStage({
            id: `preset_${p.name}`,
            name: p.name,
            url: p.bg,
            is360: p.is360 || false
        });
    }
    toast.success(`Atmosphere Preset Applied: ${p.name}`);
};

const startPoll = (pollData: any) => {
   if (!pollData) {
       showPollCreator.value = true;
       return;
   }
   const poll = pollData;
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
         title: 'LIVE FLASH SALE',
         expiresAt: Date.now() + 10 * 60000
      });
   }
}

const toggleProduct = (productId: string) => {
   const current = activeProductId.value ? String(activeProductId.value) : null;
   if (current === String(productId)) {
      studioStore.removeProduct(productId);
   } else {
      const product = studioStore.liveProducts.find((p: any) => String(p._id || p.id) === String(productId));
      if (product) {
         studioStore.showcaseProduct(product);
      } else {
         toast.error(t('studio.errors.productNotFound'));
      }
   }
}

const inviteCoHost = () => {
   const link = `${window.location.origin}/studio/${currentProject.value.id || 'current'}?role=host&hostId=${userStore.user?.id}`;
   navigator.clipboard.writeText(link);
   toast.success("Co-host invite link copied to clipboard!");
   // Real co-host arrival will be handled by users:update event in ActionSyncService
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
      console.log("ams", ams);
	  if (ams && ams.credentials?.serverUrl) {
         const serverUrl = ams.credentials.serverUrl;
         const appName = ams.credentials.appName || 'WebRTCAppEE';
         const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
         const wsHost = new URL(serverUrl).host;
         currentWebRTCUrl.value = `${wsProtocol}//${wsHost}/${appName}/websocket`;
      }

      // Auto-select if query param exists
      const qPlatformId = route.query.platformId as string;
      if (qPlatformId) {
         if (availableAccounts.value.find(a => a._id === qPlatformId)) {
            selectedPlatforms.value = [qPlatformId];
            toast.success('Platform pre-selected');
         }
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
               toast.info(`�� ${data.userName} just bought ${data.productName}!`);
            });

            // Listen for Real Order Tracking (Phase 17)
            socket.off('commerce:order_recorded');
            socket.on('commerce:order_recorded', (data: any) => {
               spawnPurchaseNotification(data.customerName, data.productName);
               toast.success(`�� Order Recorded: ${data.customerName} bought ${data.productName}!`, {
                   description: `${data.amount} ${data.currency}`
               });
            });

            // Listen for Virtual Gifting (Phase 82)
            socket.on('economy:gift_received', (data: any) => {
                const { senderId, item } = data;
                const fxType = item.effectId || 'hearts';
                spawnFX(fxType);
                toast.success(`GIFT! ${senderId} sent ${item.name}`, {
                    icon: item.icon,
                    description: item.description
                });
                if (item.cost >= 100) triggerCollectiveReaction('cheer');
            });

            // Listen for Omnichannel Chat (Phase 16)

         // Listen for Omnichannel Chat (Phase 16)
         socket.off('chat:external');
         socket.on('chat:external', (data: { platform: string, messages: any[] }) => {
            data.messages.forEach(m => {
               // Deduplicate by ID
               if (!messages.value.find(existing => existing.id === m.id)) {
                  messages.value.push({
                     id: m.id,
                     user: `${m.author} (${m.platform.charAt(0).toUpperCase() + m.platform.slice(1)})`,
                     text: m.text,
                     isSocial: true,
                     platform: m.platform,
                     timestamp: new Date(m.timestamp).getTime()
                  });
               }
            });
         });


         // --- AI Hive Synchronizers (Phase 61) ---
         socket.on('ai:tool_call', (data: any) => {
            const persona = guestPersonas.value.find((p: any) => p.entityId === data.archiveId || p.id === data.archiveId);
            if (!persona) return;
            
            const guestRef = virtualGuestRefs[persona.uuid];
            if (!guestRef) return;

            for (const call of data.toolCall.functionCalls || []) {
                console.log(`[Socket:AI] [${persona.name}] Tool: ${call.name}`);
                if (call.name === 'set_avatar_pose') {
                    guestRef.setLiveVoicePose(call.args.part, call.args.value);
                } else if (call.name === 'set_eye_focus') {
                    guestRef.setLiveVoiceEyeFocus(call.args.target);
                } else if (call.name === 'trigger_performance') {
                    guestRef.setLiveVoicePerformance(call.args.style, call.args.intensity);
                } else if (call.name === 'change_expression') {
                    guestRef.setLiveVoiceEmotion(call.args.expression);
                } else if (call.name === 'play_animation') {
                    guestRef.setLiveVoiceGesture(call.args.animation);
                }
            }
         });

         socket.on('ai:swarm_message', (data: any) => {
            swarmMessages.value.push(data);
            if (swarmMessages.value.length > 50) swarmMessages.value.shift();
            // Optional: Auto-show monitor if it's important broadcast
            if (data.type === 'broadcast' && !showSwarmMonitor.value) showSwarmMonitor.value = true;
         });

         socket.on('quest:created', (quest: any) => {
            activeQuest.value = {
                title: quest.topic || quest.title,
                type: quest.type,
                goal: quest.metadata?.goal || 'Complete the challenge',
                progress: 0,
                statusText: t('studio.messages.questStartedText'),
                masterId: quest.masterId || 'AI'
            };
            showQuestOverlay.value = true;
            toast.success(`AI Quest Started: ${activeQuest.value.title}`);
         });

         socket.on('quest:updated', (data: any) => {
            if (activeQuest.value) {
                activeQuest.value.progress = data.progress ?? activeQuest.value.progress;
                activeQuest.value.statusText = data.statusText ?? activeQuest.value.statusText;
            }
         });

         socket.on('quest:floor_assigned', (data: any) => {
            floorAgentId.value = data.targetAgentId;
            studioStore.setSpeakerFocus(data.targetAgentId);
            toast.info(`Speaker focus shift: ${data.targetAgentId}`);
         });

         socket.on('ai:mood_shift', (data: any) => {
            studioStore.updateStudioVibe(data.mood);
            toast.info(`Atmosphere Shift: ${data.mood.toUpperCase()}`);
         });

         socket.on('quest:evaluated', (data: any) => {
            toast.info(`${data.targetAgentId} Evaluation`, { description: `Score: ${data.score}. ${data.comment || ''}` });
         });
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

const toggleAutoEmotion = () => {
   studioStore.autoDirectorSettings.autoEmotionEnabled = !studioStore.autoDirectorSettings.autoEmotionEnabled;
   if (studioStore.autoDirectorSettings.autoEmotionEnabled) {
      toast.success(t('studio.autoEmotion.enabled') || 'Auto-Emotion Enabled');
   } else {
      toast.info(t('studio.autoEmotion.disabled') || 'Auto-Emotion Disabled');
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
   (studioStore as any).currentProjectId = route.params.id as string;
   window.addEventListener('keydown', handleKeyPress);
   // Handle AI Producer Actions
    window.addEventListener('producer:action', (e: any) => {
       const { type, payload } = e.detail;
       if (type === 'switch_scene' && payload.actionPayload) {
          studioStore.switchScene(payload.actionPayload);
          toast.success(`Producer Auto-Switch: ${payload.actionPayload}`);
          addDirectorLog('Scene Transition', `Director switched to scene: ${payload.actionPayload}`);
       } else if (type === 'start_poll') {
           startPoll(null);
           addDirectorLog('Interactive Content', 'AI Producer initiated an audience poll.');
       } else if (type === 'trigger_product') {
           studioStore.showcaseProduct({ id: payload.actionPayload });
           addDirectorLog('Live Commerce', `AI Producer showcased product: ${payload.actionPayload}`);
       } else if (type === 'vision:request_snapshot') {
           handleVisionRequest(payload.id);
           addDirectorLog('Vision analysis', 'Director requested canvas snapshot for scene understanding.');
       }
    });

   // Handle Autonomous Style Switches (Phase 26)
    window.addEventListener('style:switch', (e: any) => {
        const { style } = e.detail;
        studioMood.value = style;
        toast.success(`Autonomous Style Switch: ${style.toUpperCase()}`, {
            description: 'Triggered by Style A/B Testing Engine'
        });
        addDirectorLog('Atmosphere Shift', `Switched theme to ${style} for A/B performance optimization.`);
    });

   try {
      hostStream.value = await navigator.mediaDevices.getUserMedia({
         video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: 1.777
         },
         audio: true
      });
      // hostStream.value = stream;

      // Register with audio mixer for multi-track streaming
      if (hostStream.value) {
          audioMixerService.addTrack('host_mic', hostStream.value);
      }

      const setCanvasSize = () => {
         const quality = (qualityPresets as any)[streamQuality.value];
         if (resizeCanvas) {
            resizeCanvas(quality.width, quality.height);
         } else if (outputCanvas.value) {
            // Fallback
            outputCanvas.value.width = quality.width;
            outputCanvas.value.height = quality.height;
         }

          // Capture Canvas Stream for Host (Broadcasting/Recording)
          if (!isGuest.value && !canvasStream.value && outputCanvas.value) {
             try {
                canvasStream.value = (outputCanvas.value as any).captureStream(30);
             } catch (e) {
                console.error("Failed to capture canvas stream:", e);
             }
          }
      };

      setCanvasSize();

      if (sourceVideo.value) {
         sourceVideo.value.srcObject = hostStream.value;
         updateAudioStream(hostStream.value);
         
         const handleVideoReady = () => {
            setCanvasSize();
            startRendering();
            sourceVideo.value?.removeEventListener('loadedmetadata', handleVideoReady);
         };

         if (sourceVideo.value.readyState >= 2) {
            handleVideoReady();
         } else {
            sourceVideo.value.addEventListener('loadedmetadata', handleVideoReady);
         }
      }

      if (isGuest.value) {
         const token = route.query.token as string;
         const sessionId = route.query.sessionId as string;
         if (sessionId && token) {
            ActionSyncService.connect(sessionId, token, { displayName: guestName.value });
            if (hostId.value) {
               setTimeout(() => initiateAsGuest(hostId.value), 2000);
            }
         }
         currentProject.value = { 
            id: 'guest-session',
            title: `${t('studio.guest')} - ${guestName.value}`,
            description: 'Guest Session',
            role: 'guest'
         };

         window.addEventListener('guest:control', (e: any) => {
            const { action, value } = e.detail;
            if (action === 'audio') {
               micOn.value = value;
            } else if (action === 'video') {
               camOn.value = value;
            } else if (action === 'kick') {
               router.push('/');
               toast.error("Removed by host");
            }
         });

         window.addEventListener('guest:approved', (e: any) => {
            const perms = e.detail.permissions;
            if (perms) {
                micOn.value = perms.micEnabled;
                camOn.value = perms.camEnabled;
            }
         });
      } else {
          await fetchAccounts();
          const vtData = await vtuberStore.fetchLibrary();
          if (vtData?.data && Array.isArray(vtData.data)) {
             syntheticGuestManager.setLibrary(vtData.data);
          } else {
             await syntheticGuestManager.syncLibrary();
          }
         
         if (studioStore.liveProducts.length === 0) {
            studioStore.liveProducts = [
               { id: 'p1', name: 'AntStudio Ultra Pro', price: 299, image: '/bg/photo-1590658268037-6bf12165a8df.jpg', stock: 50 },
               { id: 'p2', name: 'Neural Light Ring', price: 79, image: '/bg/photo-1598488035139-bdbb2231ce04.jpg', stock: 12 },
               { id: 'p3', name: 'Studio Box', price: 120, image: '/bg/photo-1590602847861-f357a9332bbc.jpg', stock: 8 }
            ];
         }
         startVibeDrift();
         try {
            const data = await streamingStore.prepareSession(currentProject.value.id);
            if (data) {
               currentSessionId.value = data.sessionId;
               studioStore.currentSessionId = data.sessionId;
               
               // Connect to signaling as host
               if (userStore.user) {
                  ActionSyncService.connect(data.sessionId, userStore.token, {
                     displayName: userStore.user.name,
                     avatar: userStore.user.avatar
                  });
               }
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

// Watch humanFreeMode to disable webcam and save resources
watch(() => studioStore.humanFreeMode, async (isFree) => {
    if (isFree) {
        toast.info("🎭 VTuber Only Mode Active: Webcam Disabled");
        if (hostStream.value) {
            hostStream.value.getTracks().forEach(track => {
                track.stop();
            });
            hostStream.value = null;
        }
        camOn.value = false;
        micOn.value = false;
    } else {
        toast.info("👤 Human Mode Active: Re-initializing Webcam");
        try {
            hostStream.value = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: 1.777 },
                audio: true
            });
            if (sourceVideo.value) {
                sourceVideo.value.srcObject = hostStream.value;
            }
            camOn.value = true;
            micOn.value = true;
            // Note: Canvas and audio processing should automatically resume once hostStream has tracks again
        } catch (e) {
            console.error("Failed to restore webcam", e);
            toast.error("Failed to restore webcam");
        }
    }
});

// Throttled sync to prevent burst connection attempts from multiple watchers
let lastSyncTime = 0;
const throttledSync = async (...args: Parameters<typeof syncLiveChatConnections>) => {
    const now = Date.now();
    if (now - lastSyncTime < 500) return; // Ignore calls within 500ms
    lastSyncTime = now;
    await syncLiveChatConnections(...args);
};

// Auto-sync LiveChat connections when VTubers join/leave OR when persona data is loaded
watch(() => studioStore.guestSlotMap, async (newMap) => {
    // Sync even if host stream is not ready yet; useLiveChatManager will handle delayed start
    await throttledSync(newMap, guestPersonas.value, hostStream.value || undefined);
}, { deep: true });

watch(() => guestPersonas.value, async (newPersonas) => {
    if (newPersonas.length > 0 && Object.keys(studioStore.guestSlotMap).length > 0) {
        // Re-sync when VTuber data arrives to catch any missed initial connections
        await throttledSync(studioStore.guestSlotMap, newPersonas, hostStream.value || undefined);
    }
}, { deep: true });

// Also sync when host stream becomes available
watch(() => hostStream.value, async (stream) => {
    if (stream && Object.keys(studioStore.guestSlotMap).length > 0) {
        await throttledSync(studioStore.guestSlotMap, guestPersonas.value, stream);
    }
});

// Handle tool calls from Gemini Live VTubers
const handleStudioToolCall = async (personaId: string, toolCall: any) => {
    console.log(`[Debug] handleStudioToolCall triggered for ${personaId}`, toolCall);
    const persona = guestPersonas.value.find(p => p.uuid === personaId || p.entityId === personaId);
    if (!persona) {
        console.warn(`[Debug] Persona not found for ${personaId}`);
        return;
    }
    
    // Find the GeminiLive instance to send responses
    const agent = liveChatConnections[personaId]?.geminiLive;
    if (!agent) {
        console.warn(`[Debug] GeminiLive agent instance not found for ${personaId}`);
    }

    const responses: any[] = [];
    for (const call of (toolCall.functionCalls || [])) {
        console.log(`[Debug] Executing tool: ${call.name}`, call.args);
        // Important: Await the tool execution so we have a result
        const result = await executeAgentTool(agent, persona, call.id, call.name, call.args);
        
        if (agent) {
            responses.push({
                id: call.id,
                name: call.name,
                response: result || { success: true }
            });
        }
    }

    // Send all responses back to Gemini to keep the session alive and acknowledged
    if (agent && responses.length > 0) {
        console.log(`[Debug] Sending ${responses.length} tool responses back to ${persona.name}`);
        agent.sendToolResponse(responses[0].id, responses[0].name, responses[0].response); 
        // Note: Gemini Live API currently usually sends one call per message, 
        // but if multiple exist, we should ideally batch or send individually.
        // Our sendToolResponse currently takes a single ID/Name for simple relay.
    }
};

// Register LiveChat tool call handler
setLiveChatToolCallback((personaId, toolCall) => {
    console.log(`[LiveStudio] Tool call from ${personaId}:`, toolCall);
    handleStudioToolCall(personaId, toolCall);
});

// Sync VTuber Audio Tracks to AudioMixerService
watch(() => liveChatConnections, (connections) => {
    Object.values(connections).forEach((conn: any) => {
        if (conn.isConnected && conn.geminiLive) {
            const stream = conn.geminiLive.getAudioStream();
            if (stream && stream.value) {
                audioMixerService.addTrack(`vtuber_${conn.personaId}`, stream.value);
            }
        } else {
            audioMixerService.removeTrack(`vtuber_${conn.personaId}`);
        }
    });
}, { deep: true, immediate: true });

// Initial sync of LiveChat connections
syncLiveChatConnections(studioStore.guestSlotMap, guestPersonas.value, hostStream.value || undefined);

onUnmounted(() => {
   visionAnalyzer.stop();
   studioDirector.setActive(false);
   if (snapshotInterval) clearInterval(snapshotInterval);
   if (visionTimer) clearInterval(visionTimer);
   window.removeEventListener('keydown', handleKeyPress);
   window.removeEventListener('director:cut', handleDirectorCut);
   window.removeEventListener('economy:gift', handleGiftEvent);
//    window.removeEventListener('producer:action', handleProducerAction);
//    window.removeEventListener('style:switch', handleStyleSwitch);
//    window.removeEventListener('guest:control', handleGuestControl);
//    window.removeEventListener('guest:approved', handleGuestApproved);
//    window.removeEventListener('studio:chat', handleStudioChat);
   
   if (hostStream.value) hostStream.value.getTracks().forEach(t => t.stop());
   stopRendering();
   stopAILoop();
   stopGuestSubscriber('host');
   disconnectAllLiveChat();
   ActionSyncService.disconnect();
});

const effectTabs = computed(() => [
   { id: 'ai', name: t('studio.tabs.ai'), icon: Magic },
   { id: 'graphics', name: t('studio.tabs.graphics'), icon: GraphicDesign },
   { id: 'linguistic', name: t('studio.tabs.linguistic'), icon: Translation },
   { id: 'commerce', name: t('studio.tabs.commerce'), icon: Shopping },
   { id: 'economy', name: t('studio.tabs.store'), icon: Handbag },
   { id: 'cinematic', name: t('studio.tabs.cinematic'), icon: Magic },
   { id: 'script', name: t('studio.tabs.script'), icon: Movie },
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
   background: #050505;
   color: #fff;
   height: 100vh;
   display: flex;
   flex-direction: column;
   overflow: hidden;
   font-family: 'Inter', sans-serif;
}

.studio-main {
   flex: 1;
   display: flex;
   overflow: hidden;
   position: relative;
   padding: 12px;
   gap: 12px;

   @media (max-width: 768px) {
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
   }
}

.main-canvas {
   width: 100%;
   height: 100%;
   object-fit: contain;
   border-radius: 2rem;
}

/* Studio Global Elements */
:deep(.glass-dark) {
   background: rgba(13, 13, 13, 0.7);
   backdrop-filter: blur(24px) saturate(180%);
   -webkit-backdrop-filter: blur(24px) saturate(180%);
   border: 1px solid rgba(255, 255, 255, 0.08);
   border-radius: 1.5rem;
}

:deep(.side-rail) {
   width: 80px;
   display: flex;
   flex-direction: column;
   align-items: center;
   padding: 20px 0;
   gap: 12px;
   z-index: 60;
   background: rgba(10, 10, 10, 0.4);
   backdrop-filter: blur(20px);
   border: 1px solid rgba(255, 255, 255, 0.05);
   border-radius: 1.5rem;

   .rail-item {
      width: 60px;
      height: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: rgba(255, 255, 255, 0.3);
      border: 1px solid transparent;

      &:hover {
         background: rgba(255, 255, 255, 0.05);
         color: #fff;
         transform: translateY(-2px);
      }

      &.active {
         background: rgba(59, 130, 246, 0.15);
         color: #3b82f6;
         border-color: rgba(59, 130, 246, 0.3);
         box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .label {
         font-size: 9px;
         font-weight: 900;
         text-transform: uppercase;
         letter-spacing: 0.1em;
      }
   }
}

.effects-drawer {
   position: absolute;
   top: 12px;
   left: 104px;
   bottom: 12px;
   width: 320px;
   z-index: 50;
   padding: 0;
   box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

   @media (max-width: 768px) {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: translateX(-100%);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      background: #050505;
      z-index: 100;
      bottom: 0;
      border-radius: 0;

      &.open {
         transform: translateX(0);
      }
   }

   .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);

      .drawer-title {
         font-size: 11px;
         font-weight: 950;
         text-transform: uppercase;
         letter-spacing: 0.2em;
         color: rgba(255, 255, 255, 0.5);
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

:deep(.performance-dialog) {
    background: rgba(10, 10, 10, 0.95) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 2rem;
    overflow: hidden;

    .el-dialog__header {
        padding: 20px 30px;
        margin: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        .el-dialog__title {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #fff;
        }
    }

    .el-dialog__body {
        padding: 0;
        height: calc(100vh - 60px); // Full screen minus header
    }

    .el-dialog__close {
        color: #fff;
        font-size: 20px;
        &:hover {
            color: #3b82f6;
        }
    }
}
</style>

