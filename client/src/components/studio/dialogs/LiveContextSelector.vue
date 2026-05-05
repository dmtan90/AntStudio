<template>
  <el-dialog v-model="visible" :fullscreen="true" :append-to-body="true" :before-close="handleClose">
    <Transition name="fade-scale">
      <div class="flex items-center justify-center backdrop-blur-2xl">
        <!-- Background Decorative Glows -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-primary/5 rounded-full blur-[200px] pointer-events-none"></div>

        <div class="relative w-full max-w-6xl overflow-hidden rounded-[3rem] border border-white/5 bg-[#0a0a0f]/40 p-16 shadow-[0_0_120px_rgba(0,0,0,0.8)] backdrop-blur-[60px]">
          
          <!-- STEP 1: CONTEXT SELECTION -->
          <div v-if="step === 1" class="relative z-10 text-center animate-in fade-in zoom-in duration-500">
            <h1 class="text-5xl font-black uppercase tracking-tighter text-white mb-2">
              {{ $t('studio.contextSelector.greeting', { name: userName }) }}
            </h1>
            <p class="text-lg font-medium text-white/30 mb-16">{{ $t('studio.contextSelector.question') }}</p>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <ContextCard
                v-for="ctx in contexts"
                :key="ctx.id"
                :label="$t(`studio.contextSelector.modes.${ctx.id}.name`)"
                :description="$t(`studio.contextSelector.modes.${ctx.id}.desc`)"
                :icon="ctx.icon"
                :color="ctx.color"
                :active="selectedContextId === ctx.id"
                @select="selectedContextId = ctx.id"
              />
            </div>

            <!-- Action Bar -->
            <div class="mt-20 flex flex-col items-center gap-6">
              <button 
                @click="goToStep2"
                class="group relative h-16 w-full max-w-md overflow-hidden rounded-2xl bg-primary px-12 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                :disabled="!selectedContextId"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <span class="relative text-lg font-black uppercase tracking-widest text-white">
                  {{ $t('studio.contextSelector.continue') || 'CONTINUE' }}
                </span>
              </button>
            </div>
          </div>

          <!-- STEP 2: INFLUENCER SELECTION -->
          <div v-else-if="step === 2" class="relative z-10 flex flex-col items-center animate-in slide-in-from-right-10 fade-in duration-500">
            <div class="w-full flex items-center justify-between mb-12">
              <button @click="backToStep1" class="flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
                <Left theme="outline" size="20" class="group-hover:-translate-x-1 transition-transform" />
                <span class="text-xs font-black uppercase tracking-widest">Back to Categories</span>
              </button>

                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest border"
                    :style="`background:${contextColor}18; border-color:${contextColor}40; color:${contextColor}`">
                    <span class="h-1.5 w-1.5 rounded-full animate-pulse" :style="`background:${contextColor}`"></span>
                    {{ contextLabel }}
                  </div>
                </div>
            </div>

            <div class="text-center mb-10">
              <h2 class="text-4xl font-black uppercase tracking-tighter text-white">Select Your Host Agent</h2>
              <p class="mt-2 text-sm font-medium text-white/30 uppercase tracking-widest">Choose who will lead the broadcast network</p>
            </div>

            <!-- Real Host Option (Human Free focus but still selectable) -->
            <div class="w-full mb-10">
                <div 
                  class="host-type-card flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer"
                  :class="isRealHost ? 'bg-blue-600/10 border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/10'"
                  @click="toggleRealHost"
                >
                  <div class="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group">
                    <Camera theme="outline" size="28" :class="isRealHost ? 'text-blue-400' : 'text-white/20'" />
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-black text-white uppercase tracking-tight">Main Camera Influencer (Human)</h3>
                    <p class="text-xs text-white/40 font-medium">Use your local webcam as the main stream source. Hybrid AI support available.</p>
                  </div>
                  <div v-if="isRealHost" class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <CheckOne theme="outline" size="16" />
                  </div>
                </div>
            </div>

            <!-- AI Persona Grid -->
            <div class="w-full h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div v-if="personas.length === 0" class="flex flex-col items-center justify-center h-full text-white/20 border border-dashed border-white/5 rounded-[2rem]">
                  <Robot theme="outline" size="48" class="mb-4" />
                  <p class="text-sm font-bold uppercase tracking-widest">No AI Entities Manifested</p>
                  <p class="text-[10px] uppercase">Create AI Influencers in the panel first</p>
                </div>
                <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div
                    v-for="persona in personas"
                    :key="persona.uuid"
                    class="persona-card group relative flex flex-col overflow-hidden rounded-[2rem] border cursor-pointer transition-all duration-500"
                    :class="selectedPersonaUuids.includes(persona.uuid) 
                      ? 'border-blue-500/60 shadow-[0_0_40px_rgba(59,130,246,0.3)] scale-[1.03]' 
                      : 'border-white/5 hover:border-white/20'"
                    @click="togglePersona(persona)"
                  >
                    <div class="relative aspect-[4/5] overflow-hidden bg-[#0f0f1a]">
                      <el-image
                        :src="getFileUrl(persona.visual?.thumbnailUrl || persona.visual?.modelUrl || persona.avatarUrl)"
                        class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                        fit="cover"
                      >
                        <template #error>
                          <div class="flex h-full w-full items-center justify-center bg-white/5">
                            <Robot theme="outline" size="32" class="text-white/10" />
                          </div>
                        </template>
                      </el-image>
                      <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                      
                      <div v-if="selectedPersonaUuids.includes(persona.uuid)" 
                        class="absolute top-3 right-3 z-10 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white shadow-lg">
                        <CheckOne theme="outline" size="12" fill="#fff" />
                      </div>
                    </div>
                    <div class="p-4 bg-black/40 backdrop-blur-xl border-t border-white/5">
                      <h4 class="text-xs font-black text-white line-clamp-1 uppercase">{{ persona.name }}</h4>
                      <p class="text-[9px] text-white/40 font-bold tracking-widest">{{ persona.identity?.role || 'NEURAL AGENT' }}</p>
                    </div>
                  </div>
                </div>
            </div>

            <!-- Final Launch Button -->
            <div class="mt-12 w-full max-w-md">
                <button 
                  @click="handleLaunchClick"
                  :disabled="!isSelectionValid"
                  class="group relative h-16 w-full overflow-hidden rounded-2xl bg-indigo-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-20"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  <div class="relative flex items-center justify-center gap-3">
                    <span class="text-lg font-black uppercase tracking-widest text-white">
                      {{ hasWizard ? 'CONFIGURE BROADCAST' : 'LAUNCH STUDIO' }}
                    </span>
                    <ArrowRightUp theme="outline" size="20" fill="#fff" />
                  </div>
                </button>
                <p class="mt-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                  {{ selectedPersonaUuids.length }} / 3 AGENTS SELECTED
                </p>
            </div>
          </div>

          <!-- STEP 3: CATEGORY WIZARD -->
          <div v-else-if="step === 3" class="relative z-10 flex flex-col h-full animate-in slide-in-from-right-10 fade-in duration-500">
             <div class="w-full h-full min-h-[500px]">
                <component 
                  :is="activeWizard" 
                  v-if="activeWizard" 
                  :active-influencers="summonedInfluencers"
                  :inline="true"
                  @close="step = 2"
                  @complete="handleWizardComplete"
                />
             </div>
          </div>

        </div>
      </div>
    </Transition>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useStudioStore, type StreamingContext } from '@/stores/studio';
import { useUserStore } from '@/stores/user';
import { useI18n } from 'vue-i18n';
import ContextCard from '@/components/studio/ContextCard.vue';
import { 
  ShoppingCart, 
  User, 
  Globe, 
  Gamepad, 
  Music, 
  Star,
  Lightning,
  Trophy,
  DegreeHat,
  Message,
  Left,
  CheckOne,
  Robot,
  Camera,
  ArrowRightUp
} from '@icon-park/vue-next';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';

const WIZARD_MAP: Record<string, any> = {
  sales: defineAsyncComponent(() => import('./SaleWizard.vue'))
};

const studioStore = useStudioStore();
const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();

const step = ref(1);
const visible = computed({
  get: () => studioStore.showOnboarding,
  set: (val: boolean) => { studioStore.showOnboarding = val; }
});
const userName = computed(() => userStore.user?.username || 'Creator');
const selectedContextId = ref<StreamingContext | null>(null);

// Influencer State
const personas = ref<any[]>([]);
const selectedPersonaUuids = ref<string[]>([]);
const isRealHost = ref(false);

const contexts: { id: StreamingContext; icon: any, color: string }[] = [
  { id: 'sales', icon: ShoppingCart, color: '#f97316' },
  { id: 'talkshow', icon: User, color: '#06b6d4' },
  { id: 'news', icon: Globe, color: '#3b82f6' },
  { id: 'music', icon: Music, color: '#a855f7' },
  { id: 'gameshow', icon: Lightning, color: '#22c55e' },
  { id: 'game_streaming', icon: Gamepad, color: '#10b981' },
  { id: 'sport', icon: Trophy, color: '#ef4444' },
  { id: 'education', icon: DegreeHat, color: '#3b82f6' },
  { id: 'commentary', icon: Message, color: '#8b5cf6' },
  { id: 'general', icon: Star, color: '#eab308' },
];

const contextColors: Record<string, string> = {
  sales: '#f97316', talkshow: '#06b6d4', news: '#3b82f6', music: '#a855f7',
  gameshow: '#22c55e', game_streaming: '#10b981', sport: '#ef4444',
  education: '#3b82f6', commentary: '#8b5cf6', general: '#eab308'
};
const contextLabels: Record<string, string> = {
  sales: 'SALES MODE', talkshow: 'TALKSHOW', news: 'NEWS', music: 'MUSIC SHOW',
  gameshow: 'GAMESHOW', game_streaming: 'GAME STREAMING', sport: 'SPORTS',
  education: 'EDUCATION', commentary: 'COMMENTARY', general: 'GENERAL'
};

const contextColor = computed(() => contextColors[selectedContextId.value || 'general'] || '#3b82f6');
const contextLabel = computed(() => contextLabels[selectedContextId.value || 'general'] || 'STUDIO');

const hasWizard = computed(() => !!selectedContextId.value && !!WIZARD_MAP[selectedContextId.value]);
const activeWizard = computed(() => selectedContextId.value ? WIZARD_MAP[selectedContextId.value] : null);

const isSelectionValid = computed(() => isRealHost.value || selectedPersonaUuids.value.length > 0);

const summonedInfluencers = ref<any[]>([]);

const handleLaunchClick = async () => {
  if (!isSelectionValid.value) return;
  
  if (hasWizard.value) {
    // Apply Context Preset BEFORE entering wizard so wizard modifies the same state
    studioStore.applyContextPreset(selectedContextId.value);
    
    // Summon influencers first so wizard has access to them
    summonedInfluencers.value = [];
    for (const uuid of selectedPersonaUuids.value) {
      const persona = personas.value.find((p: any) => p.uuid === uuid);
      if (persona) summonedInfluencers.value.push(persona);
    }
    step.value = 3;
  } else {
    await launchStudio();
  }
};

const goToStep2 = async () => {
  if (selectedContextId.value) {
    step.value = 2;
    await syntheticGuestManager.syncLibrary();
    personas.value = syntheticGuestManager.getPersonaLibrary();
  }
};

const backToStep1 = () => {
  step.value = 1;
};

const toggleRealHost = () => {
  isRealHost.value = !isRealHost.value;
};

const togglePersona = (persona: any) => {
  const idx = selectedPersonaUuids.value.indexOf(persona.uuid);
  if (idx !== -1) {
    selectedPersonaUuids.value.splice(idx, 1);
  } else if (selectedPersonaUuids.value.length < 3) {
    selectedPersonaUuids.value.push(persona.uuid);
  } else {
    toast.warning('Neural Limit Reached: Max 3 AI Agents');
  }
};

const launchStudio = async (extraData?: any) => {
  if (!selectedContextId.value) return;

  toast.info('Manifesting Neural Environment...', { icon: '🌌' });
  
  // Apply Context
  studioStore.applyContextPreset(selectedContextId.value);
  
  // Summon AI Guests
  syntheticGuestManager.activeGuests.clear();
  for (const uuid of selectedPersonaUuids.value) {
    const persona = personas.value.find((p: any) => p.uuid === uuid);
    if (persona) {
      await syntheticGuestManager.summonGuest(persona);
    }
  }

  // Handle Real Host camera logic if needed (can be toggled in studio logic later)
  // For now we just close onboarding
  studioStore.showOnboarding = false;
  
  // Navigate
  const query: any = extraData?.platforms ? { platforms: extraData.platforms.join(',') } : {};
  console.log("selectedContextId", selectedContextId.value, "query", query);
  // router.push({ path: `/live/${selectedContextId.value}`, query });
  router.push({ name: 'live-sales', query });
};

const handleWizardComplete = async (data?: any) => {
  // Wizard has already applied most things to studioStore via its own startLive()
  // We just need to ensure guests are properly summoned if wizard didn't do it
  await launchStudio(data);
};

const handleClose = () => {
  studioStore.showOnboarding = false;
};

onMounted(async () => {
  await syntheticGuestManager.syncLibrary();
  personas.value = syntheticGuestManager.getPersonaLibrary();
});
</script>

<script lang="ts">
export default {
    name: 'LiveContextSelector'
}
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.3);
}
</style>
