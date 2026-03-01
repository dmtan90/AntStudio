<template>
  <div class="predictive-trends p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
        <h4 class="text-xs font-black text-white/60 uppercase tracking-widest">{{ $t('studio.analytics.audienceForecast') }}</h4>
      </div>
      <span v-if="prediction" class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" :class="trendClass">
        {{ prediction.trend }} ({{ Math.round(prediction.confidence * 100) }}%)
      </span>
    </div>

    <!-- Mini Chart Simulation -->
    <div class="h-24 w-full flex items-end gap-1 px-2">
      <div v-for="(val, i) in displayedData" :key="i" 
        class="flex-1 rounded-t-sm transition-all duration-500"
        :class="getBarClass(i)"
        :style="{ height: `${val}%` }">
      </div>
    </div>

    <div v-if="prediction" class="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
      <div class="mt-1">
        <magic-wand theme="outline" size="14" class="text-purple-400" />
      </div>
      <div>
        <p class="text-[10px] font-bold text-white/80 leading-relaxed">{{ $t(`studio.analytics.${prediction.reasoning}`) }}</p>
        <p class="text-[8px] font-black text-white/20 uppercase tracking-[0.1em] mt-1">{{ $t('studio.analytics.aiRecommendation') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MagicWand } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const prediction = ref<{ trend: string, confidence: number, reasoning: string } | null>(null);
const history = ref<number[]>([40, 45, 42, 48, 50, 47, 52, 55, 53, 58]);

const displayedData = computed(() => {
  // Combine real history with a future-reaching prediction visualization
  const data = [...history.value];
  if (prediction.value) {
    const last = data[data.length - 1];
    if (prediction.value.trend === 'rise') {
      data.push(last + 10, last + 15, last + 22);
    } else if (prediction.value.trend === 'drop') {
      data.push(last - 15, last - 25, last - 35);
    } else {
      data.push(last + 2, last - 2, last + 1);
    }
  }
  return data.slice(-12);
});

const trendClass = computed(() => {
  if (!prediction.value) return '';
  switch (prediction.value.trend) {
    case 'rise': return 'bg-green-500/20 text-green-400';
    case 'drop': return 'bg-red-500/20 text-red-400';
    default: return 'bg-blue-500/20 text-blue-400';
  }
});

const getBarClass = (index: number) => {
  const isFuture = index >= displayedData.value.length - 3;
  if (!isFuture) return 'bg-white/10';
  if (!prediction.value) return 'bg-white/10';
  
  switch (prediction.value.trend) {
    case 'rise': return 'bg-gradient-to-t from-green-500/20 to-green-500 opacity-60 animate-pulse';
    case 'drop': return 'bg-gradient-to-t from-red-500/20 to-red-400 opacity-60 animate-pulse';
    default: return 'bg-gradient-to-t from-blue-500/20 to-blue-400 opacity-60 animate-pulse';
  }
};

let pollInterval: any = null;

const reasoningPool = [
  'reasoningFollowers',
  'reasoningRevenue',
  'reasoningDefault'
];

onMounted(() => {
  // Simulate fetching prediction from store or backend
  pollInterval = setInterval(async () => {
     // In real app, this would be a socket event or API call
     // For this phase, we'll simulate a random-ish AI update 
     // following the logic that snapshots are being recorded every 30s
     if (Math.random() > 0.7) {
        prediction.value = {
          trend: Math.random() > 0.5 ? 'rise' : 'drop',
          confidence: 0.6 + Math.random() * 0.3,
          reasoning: reasoningPool[Math.floor(Math.random() * reasoningPool.length)]
        };
     }
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.predictive-trends {
  transition: all 0.5s ease;
}
</style>
