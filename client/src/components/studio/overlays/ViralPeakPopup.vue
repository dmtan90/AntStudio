<template>
  <Transition name="peak-slide">
    <div v-if="visible" class="viral-peak-notification glass-dark border border-blue-500/30 shadow-2xl shadow-blue-500/10">
      <div class="peak-header flex items-center justify-between p-3 border-b border-white/5">
        <div class="flex items-center gap-2">
          <div class="pulse-icon">
            <chart-histogram theme="filled" size="16" class="text-blue-400" />
          </div>
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">Viral Peak Detected</span>
        </div>
        <button @click="visible = false" class="text-white/30 hover:text-white">
          <close theme="outline" size="14" />
        </button>
      </div>
      
      <div class="peak-body p-4">
        <h3 class="text-lg font-black tracking-tight mb-1">{{ reason }}</h3>
        <p class="text-[10px] opacity-40 mb-4 uppercase font-bold tracking-wider">AI Producer is capturing this moment...</p>
        
        <div class="metrics-grid grid grid-cols-2 gap-2 mb-4">
          <div class="metric p-2 rounded-lg bg-white/5 border border-white/5">
            <span class="block text-[8px] opacity-30 uppercase font-black">Engagement Vibe</span>
            <span class="text-sm font-bold text-purple-400">{{ vibe }}%</span>
          </div>
          <div class="metric p-2 rounded-lg bg-white/5 border border-white/5">
            <span class="block text-[8px] opacity-30 uppercase font-black">Chat Speed</span>
            <span class="text-sm font-bold text-blue-400">{{ velocity }} / min</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="openMoments" class="flex-1 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors">
            View Clips
          </button>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChartHistogram, Close } from '@icon-park/vue-next';

const props = defineProps<{
  reason: string;
  vibe: number;
  velocity: number;
}>();

const emit = defineEmits(['close', 'view-moments']);

const visible = ref(true);
const progress = ref(100);

onMounted(() => {
  const duration = 8000;
  const interval = 50;
  const step = (interval / duration) * 100;

  const timer = setInterval(() => {
    progress.value -= step;
    if (progress.value <= 0) {
      clearInterval(timer);
      visible.value = false;
      setTimeout(() => emit('close'), 500);
    }
  }, interval);
});

const openMoments = () => {
  visible.value = false;
  emit('view-moments');
};
</script>

<style scoped lang="scss">
.viral-peak-notification {
  position: fixed;
  top: 100px;
  right: 340px; // Left of interaction panel
  width: 280px;
  border-radius: 20px;
  z-index: 1000;
  overflow: hidden;
}

.pulse-icon {
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { transform: scale(0.9); opacity: 0.7; }
  to { transform: scale(1.1); opacity: 1; }
}

.progress-bar {
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
  width: 100%;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.05s linear;
}

.peak-slide-enter-active,
.peak-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.peak-slide-enter-from,
.peak-slide-leave-to {
  transform: translateX(100%) scale(0.9);
  opacity: 0;
}
</style>
