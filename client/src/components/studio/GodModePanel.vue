<template>
  <div v-if="studioStore.godModeEnabled" class="god-mode-panel pointer-events-auto" :style="panelStyle" @mousedown="startDrag">
    <!-- Premium Glass Container -->
    <div class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0f]/80 shadow-2xl backdrop-blur-3xl">
      <!-- Glow Accent -->
      <div class="absolute -top-12 -left-12 h-24 w-24 bg-purple-500/20 blur-3xl"></div>
      
      <!-- Panel Header -->
      <div class="panel-header border-b border-white/5 bg-white/5 p-4 px-6 flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div class="flex items-center gap-3">
          <div class="relative h-6 w-6">
             <magic theme="filled" size="18" class="text-purple-400" />
             <div class="absolute inset-0 bg-purple-500/40 blur-lg animate-pulse"></div>
          </div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {{ studioStore.humanFreeMode ? 'AI Supervisor Agent' : 'Production Director' }}
          </span>
        </div>
        <div class="flex gap-2">
          <button class="h-6 w-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-white/40" @click="isMinimized = !isMinimized">
            <component :is="isMinimized ? 'FullScreen' : 'Minus'" theme="outline" size="12" />
          </button>
        </div>
      </div>

      <transition name="panel-slide">
        <div v-if="!isMinimized" class="p-8 space-y-8">
          <!-- Status Indicator -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Decision Engine</span>
              <span class="flex items-center gap-1.5 text-[10px] font-black text-green-500 italic">
                <div class="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                Live
              </span>
            </div>
            <div class="h-1 w-full rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-100" :style="{ width: `${voiceLevel * 100}%` }"></div>
            </div>
          </div>

          <!-- Hype Meter -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Audience Hype</span>
              <span class="text-xs font-black text-orange-400 tabular-nums">{{ (chatHypeLevel * 100).toFixed(0) }}%</span>
            </div>
            <div class="h-1 w-full rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-orange-600 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all duration-500" :style="{ width: `${Math.min(100, chatHypeLevel * 50)}%` }"></div>
            </div>
          </div>

          <!-- Main Controls Grid -->
          <div class="grid grid-cols-1 gap-6 pt-4">
            <div class="space-y-4">
              <div v-for="toggle in toggles" :key="toggle.key" class="group flex items-center justify-between p-3 py-2 -mx-3 rounded-2xl hover:bg-white/5 transition-colors">
                <div class="flex flex-col">
                  <span class="text-[10px] font-black text-white/60 uppercase tracking-widest">{{ toggle.label }}</span>
                  <p class="text-[8px] text-white/20 mt-0.5 leading-tight">{{ toggle.desc }}</p>
                </div>
                <button @click="toggle.action" class="relative h-5 w-10 rounded-full bg-white/5 border border-white/5 transition-all p-1" :class="{ 'bg-primary/20 border-primary/30': toggle.value }">
                   <div class="h-full aspect-square rounded-full bg-white/20 transition-all" :class="{ 'translate-x-5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]': toggle.value }"></div>
                </button>
              </div>
            </div>

            <!-- Parameters Sliders -->
            <div class="space-y-6 pt-2">
               <div class="space-y-3">
                  <div class="flex justify-between">
                     <span class="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Sensitivity</span>
                     <span class="text-[10px] font-black text-purple-400">{{ sensitivity.toFixed(2) }}</span>
                  </div>
                  <input type="range" v-model.number="sensitivity" min="0.01" max="0.30" step="0.01" class="premium-slider" />
               </div>
               <div class="space-y-3">
                  <div class="flex justify-between">
                     <span class="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Action Cooldown</span>
                     <span class="text-[10px] font-black text-purple-400">{{ (cooldown / 1000).toFixed(1) }}s</span>
                  </div>
                  <input type="range" v-model.number="cooldown" min="2000" max="20000" step="500" class="premium-slider" />
               </div>
            </div>
          </div>

          <!-- AI Log -->
          <div class="pt-6 border-t border-white/5">
             <div class="flex justify-between items-center mb-4">
                <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Autonomous Timeline</span>
                <span class="text-[8px] font-bold text-white/40">{{ decisionLogs.length }} EVENTS</span>
             </div>
             <div class="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scroll">
                <div v-for="(log, i) in decisionLogs" :key="i" class="flex gap-4 items-start animate-fade-in-down">
                   <span class="text-[9px] font-black text-white/20 tabular-nums whitespace-nowrap">{{ log.time }}</span>
                   <p class="text-[10px] font-bold uppercase tracking-tight leading-tight" :class="log.isRejected ? 'text-red-500/60' : 'text-white/60'">
                      {{ log.action }}
                   </p>
                </div>
             </div>
          </div>

          <!-- Consensus Footer -->
          <div v-if="lastConsensus" class="rounded-2xl bg-white/5 p-4 border border-white/5 space-y-3">
             <div class="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/20">
                <span>Board Approval</span>
                <span class="text-green-500">{{ lastConsensus.result }}</span>
             </div>
             <p class="text-[10px] font-bold text-white/60 leading-tight italic line-clamp-2">
                "{{ lastConsensus.debrief.split('\n')[0] }}"
             </p>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { Magic, Minus, FullScreen } from '@icon-park/vue-next';
import { studioDirector } from '@/utils/ai/StudioDirector';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import { useI18n } from 'vue-i18n';

const studioStore = useStudioStore();
const { t } = useI18n();
const isMinimized = ref(false);
const sensitivity = ref(0.05);
const cooldown = ref(8000);
const autoEffects = ref(true);
const voiceLevel = ref(0);
const chatHypeLevel = computed(() => syntheticGuestManager.chatHypeScore);

// Dragging Logic
const position = ref({ x: 20, y: 150 });
const panelStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}));

const startDrag = (e: MouseEvent) => {
  const startX = e.clientX - position.value.x;
  const startY = e.clientY - position.value.y;

  const onMouseMove = (e: MouseEvent) => {
    position.value.x = e.clientX - startX;
    position.value.y = e.clientY - startY;
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

// Log Logic
const decisionLogs = ref<{ time: string, action: string, isRejected?: boolean }[]>([]);
const lastConsensus = ref<any>(null);

const toggles = computed(() => [
  { 
    key: 'humanFree', 
    label: t('studio.godMode.humanFreeMode') || 'Human Free Mode', 
    desc: t('studio.godMode.humanFreeModeDesc') || 'Full AI Autonomy',
    value: studioStore.humanFreeMode,
    action: () => studioStore.humanFreeMode = !studioStore.humanFreeMode
  },
  { 
    key: 'autoPublish', 
    label: t('studio.godMode.autoPublishViral') || 'Viral Syndication', 
    desc: 'Auto-clip viral moments',
    value: studioStore.autoDirectorSettings.autoPublishViral,
    action: () => studioStore.autoDirectorSettings.autoPublishViral = !studioStore.autoDirectorSettings.autoPublishViral
  },
  { 
    key: 'autoEffects', 
    label: t('studio.godMode.autoEffects'), 
    desc: 'AI-trigger animations',
    value: autoEffects.value,
    action: () => autoEffects.value = !autoEffects.value
  },
  { 
    key: 'autoCam', 
    label: t('studio.godMode.autoCam'), 
    desc: 'Smart speaker switching',
    value: studioStore.autoDirectorSettings.autoSwitchOnSpeaker,
    action: () => studioStore.autoDirectorSettings.autoSwitchOnSpeaker = !studioStore.autoDirectorSettings.autoSwitchOnSpeaker
  }
]);

const addLog = (action: string, isRejected = false) => {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  decisionLogs.value.unshift({ time, action, isRejected });
  if (decisionLogs.value.length > 8) decisionLogs.value.pop();
};

// Sync with Director
onMounted(() => {
  // Listen for producer actions (which now carry consensus data)
  window.addEventListener('producer:action', (e: any) => {
    const { type, payload } = e.detail;
    if (payload.consensus) {
      lastConsensus.value = payload.consensus;
      addLog(`${type}: ${t('studio.godMode.' + payload.title)}`, payload.consensus.result === 'rejected');
    } else if (payload.boardFeedback) {
      addLog(`REJECTED: ${payload.title}`, true);
    } else if (type === 'autonomous_gesture') {
      const translatedAction = t(`studio.messages.${payload.title}`, { name: payload.name });
      addLog(translatedAction);
    }
  });
});
watch([sensitivity, cooldown], () => {
  studioDirector.updateSettings({ cooldown: cooldown.value });
}, { immediate: true });

onMounted(() => {
  // Listen for director decisions (emitted via event bus or global state if we had one)
  // For now, we'll just track value changes in store
});

watch(() => studioStore.activeScene.id, (newSceneId) => {
    if (studioStore.godModeEnabled) {
        addLog(`Switched to ${newSceneId}`);
    }
});
</script>

<style scoped lang="scss">
.god-mode-panel {
  position: fixed;
  width: 280px;
  z-index: 1000;
  user-select: none;
}

.premium-slider {
  @apply w-full h-1 bg-white/10 rounded-full appearance-none outline-none;
  &::-webkit-slider-thumb {
    @apply appearance-none w-3 h-3 bg-purple-500 rounded-full cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-transform hover:scale-125;
  }
}

.custom-scroll {
  &::-webkit-scrollbar { width: 2px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { @apply bg-white/10 rounded-full; }
}

.animate-fade-in-down {
  animation: fade-in-down 0.5s ease-out forwards;
}

@keyframes fade-in-down {
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
