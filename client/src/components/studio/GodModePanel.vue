<template>
  <div v-if="studioStore.godModeEnabled" class="god-mode-panel glass-dark" :style="panelStyle" @mousedown="startDrag">
    <div class="panel-header">
      <div class="flex items-center gap-2">
        <magic theme="filled" size="18" class="text-purple-400 animate-pulse" />
        <span class="text-xs font-black uppercase tracking-widest text-white">{{ $t('studio.godMode.title') }}</span>
      </div>
      <div class="flex gap-1">
        <button class="icon-btn" @click="isMinimized = !isMinimized">
          <component :is="isMinimized ? 'FullScreen' : 'Minus'" theme="outline" size="14" />
        </button>
      </div>
    </div>

    <transition name="slide-fade">
      <div v-if="!isMinimized" class="panel-content">
        <!-- Status Indicator -->
        <div class="status-indicator">
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] font-bold text-white/40 uppercase">{{ $t('studio.godMode.directorStatus') }}</span>
            <span class="text-[10px] font-black text-green-400">{{ $t('studio.godMode.active') }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${voiceLevel * 100}%` }"></div>
          </div>
          <div class="flex justify-between text-[9px] mt-1 text-white/30">
            <span>{{ $t('studio.godMode.silence') }}</span>
            <span>{{ $t('studio.godMode.speaking') }}</span>
          </div>
        </div>

        <!-- Hype Meter (Phase 10) -->
        <div class="status-indicator mt-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] font-bold text-white/40 uppercase">{{ $t('studio.godMode.hypeMeter') }}</span>
            <span class="text-[10px] font-black text-orange-400">{{ (chatHypeLevel * 100).toFixed(0) }}%</span>
          </div>
          <div class="progress-bar bg-white/5">
            <div class="progress-fill bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]" :style="{ width: `${Math.min(100, chatHypeLevel * 50)}%` }"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="space-y-4 mt-6">
          <div class="control-group">
            <div class="flex justify-between items-center mb-2">
              <label class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.sensitivity') }}</label>
              <span class="text-xs font-mono text-purple-400">{{ sensitivity.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="sensitivity" min="0.01" max="0.30" step="0.01" class="studio-slider" />
          </div>

          <div class="control-group">
            <div class="flex justify-between items-center mb-2">
              <label class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.switchDelay') }}</label>
              <span class="text-xs font-mono text-purple-400">{{ (cooldown / 1000).toFixed(1) }}s</span>
            </div>
            <input type="range" v-model.number="cooldown" min="2000" max="20000" step="500" class="studio-slider" />
          </div>

          <div class="divider"></div>

          <div class="toggle-group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.humanFreeMode') || 'HUMAN FREE MODE' }}</span>
              <button @click="studioStore.humanFreeMode = !studioStore.humanFreeMode" class="studio-toggle" :class="{ active: studioStore.humanFreeMode }">
                <div class="toggle-inner"></div>
              </button>
            </div>
            <p class="text-[9px] text-white/30 mt-1">{{ $t('studio.godMode.humanFreeModeDesc') || 'Disable host webcam & mic. Fully AI VTuber driven show.' }}</p>
          </div>

          <div class="toggle-group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.autoPublishViral') || 'AUTO PUBLISH VIRAL' }}</span>
              <button @click="studioStore.autoDirectorSettings.autoPublishViral = !studioStore.autoDirectorSettings.autoPublishViral" 
                class="studio-toggle" :class="{ active: studioStore.autoDirectorSettings.autoPublishViral }">
                <div class="toggle-inner"></div>
              </button>
            </div>
            <p class="text-[9px] text-white/30 mt-1">{{ $t('studio.godMode.autoPublishViralDesc') || 'Automatically clip and publish viral moments to TikTok/Shorts.' }}</p>
          </div>

          <div class="toggle-group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.autoEffects') }}</span>
              <button @click="autoEffects = !autoEffects" class="studio-toggle" :class="{ active: autoEffects }">
                <div class="toggle-inner"></div>
              </button>
            </div>
            <p class="text-[9px] text-white/30 mt-1">{{ $t('studio.godMode.autoEffectsDesc') }}</p>
          </div>

          <div class="toggle-group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.autoCam') }}</span>
              <button @click="studioStore.autoDirectorSettings.autoSwitchOnSpeaker = !studioStore.autoDirectorSettings.autoSwitchOnSpeaker" 
                class="studio-toggle" :class="{ active: studioStore.autoDirectorSettings.autoSwitchOnSpeaker }">
                <div class="toggle-inner"></div>
              </button>
            </div>
            <p class="text-[9px] text-white/30 mt-1">{{ $t('studio.godMode.autoCamDesc') }}</p>
          </div>

          <div class="toggle-group">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-white/60 uppercase">{{ $t('studio.godMode.autoPilot') }}</span>
              <button @click="studioStore.autoDirectorSettings.autoPivotEnabled = !studioStore.autoDirectorSettings.autoPivotEnabled" 
                class="studio-toggle" :class="{ active: studioStore.autoDirectorSettings.autoPivotEnabled }">
                <div class="toggle-inner"></div>
              </button>
            </div>
            <p class="text-[9px] text-white/30 mt-1">{{ $t('studio.godMode.autoPilotDesc') }}</p>
          </div>
        </div>

        <!-- Board Consensus (Collective Intelligence) -->
        <div class="mini-log mt-6">
          <div class="flex justify-between items-center mb-2">
            <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">{{ $t('studio.godMode.boardConsensus') }}</div>
            <div v-if="lastConsensus" class="flex gap-1">
              <div v-for="vote in lastConsensus.votes" :key="vote.agentId" 
                class="w-1.5 h-1.5 rounded-full"
                :class="vote.vote === 'approve' ? 'bg-green-500' : 'bg-red-500'"
                :title="`${vote.persona}: ${vote.reason}`">
              </div>
            </div>
          </div>
          <div v-if="lastConsensus" class="text-[8px] text-white/40 italic leading-tight p-2 bg-white/5 rounded-lg border border-white/5">
            {{ lastConsensus.debrief.split('\n')[0] }}...
          </div>
          <div v-else class="text-[8px] text-white/20 italic">{{ $t('studio.godMode.awaitingEvaluation') }}</div>
        </div>

        <!-- Log/History (Mini) -->
        <div class="mini-log mt-6">
          <div class="text-[9px] font-black text-white/20 uppercase mb-2">{{ $t('studio.godMode.decisionLog') }}</div>
          <div class="log-entries">
            <div v-for="(log, i) in decisionLogs" :key="i" class="log-entry">
              <span class="time">{{ log.time }}</span>
              <span class="action" :class="{ 'text-red-400': log.isRejected }">{{ log.action }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
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
  width: 220px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
  user-select: none;
}

.panel-header {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
}

.panel-content {
  padding: 20px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #a855f7);
  transition: width 0.1s ease;
}

.studio-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #a855f7;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
  }
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
}

.studio-toggle {
  width: 32px;
  height: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  transition: all 0.3s;
  cursor: pointer;

  .toggle-inner {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s;
  }

  &.active {
    background: #3b82f6;
    .toggle-inner {
      left: 18px;
    }
  }
}

.mini-log {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-entry {
  display: flex;
  justify-content: space-between;
  font-family: monospace;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.4);

  .action {
    color: #60a5fa;
  }
}

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
