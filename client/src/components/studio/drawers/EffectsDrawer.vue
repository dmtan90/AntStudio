<template>
  <div v-if="activeTab" class="effects-drawer glass-dark animate-slide-left mt-[64px]">
    <header class="drawer-header">
      <h3 class="drawer-title">{{ currentTabName }}</h3>
      <div class="flex items-center gap-3">
        <button v-for="iconTab in iconTabs" :key="iconTab.id"
          @click="$emit('update:activeTab', iconTab.id)" 
          class="p-2 rounded-lg transition-all" 
          :class="activeTab === iconTab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'"
        >
          <component :is="iconTab.icon" theme="filled" size="20" />
        </button>
        <button @click="$emit('update:activeTab', null)" class="close-drawer">
          <close theme="outline" />
        </button>
      </div>
    </header>
    
    <div class="drawer-content px-4 py-6 scrollbar-hide overflow-y-auto max-h-[calc(100vh-120px)]">
      <LayoutSettings v-if="activeTab === 'layout'" />

      <FilterSettings v-if="activeTab === 'filters'" 
        :active-filter="currentFilter" 
        :filters="filters"
        :selected-background="selectedBackground" 
        :backgrounds="backgrounds"
        :enable-chromakey="enableChromakey" 
        :chroma-settings="chromaSettings"
        @update:active-filter="$emit('update:currentFilter', $event)" 
        @update:enable-chromakey="$emit('update:enableChromakey', $event)"
        @select-background="$emit('select-background', $event)" 
      />

      <AIPersonaSettings v-else-if="activeTab === 'ai' || activeTab === 'virtual'" 
        :personas="guestPersonas"
        @summon-guest="$emit('summon-guest', $event)" 
        @toggle-guest="$emit('toggle-guest', $event)" 
        @talk-guest="$emit('talk-guest', $event)"
        @manual-gesture="$emit('manual-gesture', $event)" 
        @toggle-live-voice="$emit('toggle-live-voice', $event)"
        @toggle-vision="$emit('toggle-vision', $event)" 
        @toggle-role="$emit('toggle-role', $event)" 
      />

      <GraphicSettings v-else-if="activeTab === 'graphics'" 
        :branding="branding"
        :show-lower-third="showLowerThird" 
        :show-ticker="showTicker" 
        @toggle-lower-third="$emit('toggle-lower-third', $event)"
        @toggle-ticker="$emit('toggle-ticker', $event)" 
      />

      <GuestSettings v-else-if="activeTab === 'guests'" 
        :guest-personas="guestPersonas"
        :remote-guests="remoteGuests" 
        :guest-video-elements="guestVideoElements" 
        @invite-guest="$emit('invite-guest')"
        @summon-guest="$emit('summon-guest', $event)" 
        @toggle-guest="$emit('toggle-guest', $event)" 
        @add-mobile-cam="$emit('add-mobile-cam')"
        @toggle-role="$emit('toggle-role', $event)" 
      />

      <LinguisticSettings v-else-if="activeTab === 'linguistic'" 
        :is-translating="isTranslating"
        :enable-asl="enableAsl" 
        :source-lang="sourceLang" 
        :target-lang="targetLang"
        :current-transcript="currentTranscript" 
        :is-dubbing="isGeminiSpeaking" 
        @update:is-translating="$emit('update:isTranslating', $event)"
        @update:enable-asl="$emit('update:enableAsl', $event)" 
        @update:source-lang="$emit('update:sourceLang', $event)"
        @update:target-lang="$emit('update:targetLang', $event)" 
      />

      <CommerceSettings v-else-if="activeTab === 'commerce'" 
        :is-flash-deal="isFlashDeal"
        :live-products="liveProducts" 
        :active-product-id="activeProductId" 
        @trigger-flash-deal="$emit('trigger-flash-deal')"
        @toggle-product="$emit('toggle-product', $event)" 
      />

      <EngagementSettings v-else-if="activeTab === 'engagement'" 
        :active-poll="activePoll" 
        :qa-queue="qaQueue"
        @start-poll="$emit('start-poll', $event)" 
        @feature-question="$emit('feature-question', $event)" 
      >
        <div class="mt-6 pt-6 border-t border-white/5 space-y-6">
          <DirectorControlPanel />
          <LeaderboardOverlay />
        </div>
      </EngagementSettings>

      <VibeSettings v-else-if="activeTab === 'vibe'" 
        :vibe-name="currentVibeName" 
        :vibe-score="vibeScore"
        :auto-atmosphere="autoAtmosphere" 
        @update:auto-atmosphere="$emit('update:autoAtmosphere', $event)"
        @apply-preset="$emit('apply-preset', $event)" 
      />

      <CinematicSettings v-else-if="activeTab === 'cinematic'" />

      <CollaborationSettings v-else-if="activeTab === 'collaboration'" 
        :active-collaborators="activeCollaborators"
        :current-user-id="currentUserId" 
        @invite-cohost="$emit('invite-cohost', $event)" 
      />

      <div v-else-if="activeTab === 'script'" class="p-4 space-y-4">
        <div class="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
          <movie-board theme="outline" size="32" class="text-purple-400 mb-2 mx-auto" />
          <h3 class="font-bold text-sm mb-1">AI ShowRunner Logic</h3>
          <p class="text-[10px] text-white/60 mb-4">Generate autonomous run-of-show scripts.</p>
          <button class="w-full py-2 bg-purple-600 rounded-lg text-xs font-bold" @click="$emit('open-script-generator')">
            Open Script Generator
          </button>
          <div v-if="activeScript" class="mt-4 pt-4 border-t border-white/10 text-left">
            <span class="text-[10px] font-bold text-green-400 block mb-1">ACTIVE SCRIPT</span>
            <p class="text-xs truncate">{{ activeScript.title }}</p>
          </div>
        </div>
      </div>

      <EconomySettings v-else-if="activeTab === 'economy'" />

      <div v-else-if="activeTab === 'analytics'" class="h-full overflow-hidden">
        <AnalyticsDashboard />
      </div>

      <ResourcePool v-else-if="activeTab === 'resources'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Close, Peoples, Analysis, FolderOpen, MovieBoard } from '@icon-park/vue-next';
import LayoutSettings from './LayoutSettings.vue';
import FilterSettings from './FilterSettings.vue';
import AIPersonaSettings from './AIPersonaSettings.vue';
import GraphicSettings from './GraphicSettings.vue';
import GuestSettings from './GuestSettings.vue';
import LinguisticSettings from './LinguisticSettings.vue';
import CommerceSettings from './CommerceSettings.vue';
import EngagementSettings from './EngagementSettings.vue';
import VibeSettings from './VibeSettings.vue';
import CinematicSettings from './CinematicSettings.vue';
import CollaborationSettings from './CollaborationSettings.vue';
import EconomySettings from './EconomySettings.vue';
import AnalyticsDashboard from '../dashboard/AnalyticsDashboard.vue';
import ResourcePool from '../ResourcePool.vue';

const props = defineProps<{
  activeTab: string | null;
  effectTabs: any[];
  currentFilter: string;
  filters: any[];
  selectedBackground: string | null;
  backgrounds: any[];
  enableChromakey: boolean;
  chromaSettings: any;
  guestPersonas: any[];
  remoteGuests: any[];
  guestVideoElements: any;
  branding: any;
  showLowerThird: boolean;
  showTicker: boolean;
  isTranslating: boolean;
  enableAsl: boolean;
  sourceLang: string;
  targetLang: string;
  currentTranscript: string;
  isGeminiSpeaking: boolean;
  isFlashDeal: boolean;
  liveProducts: any[];
  activeProductId: string | null;
  activePoll: any;
  qaQueue: any[];
  currentVibeName: string;
  vibeScore: number;
  autoAtmosphere: boolean;
  activeCollaborators: any[];
  currentUserId: string;
  activeScript: any;
}>();

defineEmits([
  'update:activeTab', 'update:currentFilter', 'update:enableChromakey', 'select-background',
  'summon-guest', 'toggle-guest', 'talk-guest', 'manual-gesture', 'toggle-live-voice',
  'toggle-vision', 'toggle-role', 'toggle-lower-third', 'toggle-ticker', 'invite-guest',
  'add-mobile-cam', 'update:isTranslating', 'update:enableAsl', 'update:sourceLang', 'update:targetLang',
  'trigger-flash-deal', 'toggle-product', 'start-poll', 'feature-question',
  'update:autoAtmosphere', 'apply-preset', 'invite-cohost', 'open-script-generator'
]);

const currentTabName = computed(() => {
  const tab = props.effectTabs.find(t => t.id === props.activeTab);
  return tab ? tab.name : props.activeTab;
});

const iconTabs = [
  { id: 'engagement', icon: Peoples },
  { id: 'analytics', icon: Analysis },
  { id: 'resources', icon: FolderOpen }
];
</script>

<style scoped>
.effects-drawer {
  @apply fixed right-0 bottom-0 top-0 w-[360px] z-40 flex flex-col;
}
.drawer-header {
  @apply flex items-center justify-between p-4 border-b border-white/5;
}
.drawer-title {
  @apply text-xs font-black uppercase tracking-widest text-white/40;
}
.close-drawer {
  @apply p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all;
}
</style>
