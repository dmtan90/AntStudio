<template>
  <div class="hook-performance glass-panel p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">{{ $t('studio.analytics.hookPerformance') }}</h3>
        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{{ $t('studio.analytics.hookInsightsDesc') }}</p>
      </div>
      
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
          <magic theme="outline" size="12" class="text-blue-400" />
          <span class="text-[10px] font-black uppercase text-blue-400">{{ $t('studio.common.aiOptimized') }}</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-4">
      <refresh theme="outline" size="24" class="text-blue-500 animate-spin" />
      <span class="text-[10px] font-black uppercase tracking-widest text-gray-600">{{ $t('studio.analytics.analyzing') }}</span>
    </div>

    <div v-else-if="stats.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <div class="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
        <trending-up theme="outline" size="32" class="text-gray-700" />
      </div>
      <h4 class="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{{ $t('studio.analytics.noAbData') }}</h4>
      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider max-w-[200px]">
        {{ $t('studio.analytics.hookLabHint') }}
      </p>
    </div>

    <div v-else class="space-y-6">
      <div 
        v-for="(stat, index) in sortedStats" 
        :key="stat.type" 
        class="hook-stat-card p-5 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all relative group"
        :class="{ 'border-blue-500/30 bg-blue-500/[0.02]': index === 0 }"
      >
        <div v-if="index === 0" class="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg border border-blue-400/50 flex items-center gap-1.5">
          <check-correct theme="outline" size="10" />
          {{ $t('studio.analytics.winningConcept') }}
        </div>

        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500" :class="getHookBg(stat.type)">
                <component :is="getHookIcon(stat.type)" theme="filled" size="18" class="text-white" />
            </div>
            <div>
              <div class="text-[11px] font-black uppercase tracking-widest text-white">{{ $t(`studio.analytics.hooks.${stat.type}`) }}</div>
              <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{{ stat.count }} {{ $t('studio.analytics.experimentalRuns') }}</div>
            </div>
          </div>
          
          <div class="flex flex-col items-end">
            <div class="text-lg font-black text-blue-400 group-hover:text-blue-300 transition-colors">{{ formatNumber(stat.avgViews) }}</div>
            <div class="text-[8px] text-gray-600 font-black uppercase tracking-widest">{{ $t('studio.analytics.avgPulse') }}</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4">
          <div 
            class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
            :style="{ width: `${(stat.avgViews / maxAvgViews) * 100}%` }"
          ></div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex items-center gap-2">
            <like theme="outline" size="12" class="text-gray-500" />
            <span class="text-[10px] font-bold text-gray-400">{{ formatNumber(stat.avgLikes) }} {{ $t('studio.analytics.avgLikes') }}</span>
          </div>
          <div class="flex items-center justify-end gap-2">
             <button 
               class="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400 transition-all flex items-center gap-1.5"
               @click="$emit('promote', stat.type)"
             >
               <external-transmission theme="outline" size="10" />
               {{ $t('studio.common.promote') }}
             </button>
             <div class="flex items-center gap-1">
              <trending-up theme="outline" size="12" class="text-green-500" />
              <span class="text-[9px] font-black text-green-500 uppercase">+{{ Math.round((stat.avgViews / maxAvgViews) * 100) }}%</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Magic, Refresh, TrendingUp, Like, Help, Attention, School, CheckCorrect, ExternalTransmission } from '@icon-park/vue-next';

const props = defineProps<{
  stats: any[],
  loading: boolean
}>();

const emit = defineEmits(['promote']);

const sortedStats = computed(() => {
  return [...props.stats].sort((a, b) => b.avgViews - a.avgViews);
});

const maxAvgViews = computed(() => {
  return Math.max(...props.stats.map(s => s.avgViews), 1);
});

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

const getHookIcon = (type: string) => {
  if (type.includes('Curiosity')) return Help;
  if (type.includes('Controversial')) return Attention;
  return School;
};

const getHookBg = (type: string) => {
  if (type.includes('Curiosity')) return 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]';
  if (type.includes('Controversial')) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
  return 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
};
</script>

<style scoped>
.hook-stat-card:hover {
  transform: translateX(4px);
  border-color: rgba(59, 130, 246, 0.2);
}
</style>
