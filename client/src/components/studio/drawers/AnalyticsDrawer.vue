<template>
  <el-dialog v-model="isVisible" :show-close="false" :align-center="true" :width="600"
    class="analytics-drawer-modal glass-dark">
    <template #header>
      <div class="flex justify-between items-center p-6 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <chart-histogram theme="outline" size="20" class="text-purple-400" />
          </div>
          <div>
            <h2 class="text-lg font-black text-white uppercase tracking-tighter">Live Insight</h2>
            <p class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Real-time performance metrics</p>
          </div>
        </div>
        <button @click="$emit('update:modelValue', false)" class="close-btn">
          <close theme="outline" size="20" />
        </button>
      </div>
    </template>

    <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
      <!-- Section: Key Headline Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div
          class="p-5 bg-white/5 border border-white/10 rounded-3xl text-center group hover:bg-blue-500/5 transition-all">
          <p class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Current</p>
          <p class="text-2xl font-black text-white">{{ engagement.viewerCount }}</p>
          <div class="flex items-center justify-center gap-1 mt-1">
            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-[8px] font-bold text-green-500 uppercase">Live Now</span>
          </div>
        </div>
        <div
          class="p-5 bg-white/5 border border-white/10 rounded-3xl text-center group hover:bg-purple-500/5 transition-all">
          <p class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Peak</p>
          <p class="text-2xl font-black text-white">{{ engagement.peakViewers }}</p>
          <span class="text-[8px] font-bold text-white/20 uppercase">Max Audience</span>
        </div>
        <div
          class="p-5 bg-white/5 border border-white/10 rounded-3xl text-center group hover:bg-red-500/5 transition-all">
          <p class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Total Likes</p>
          <p class="text-2xl font-black text-white">{{ engagement.likes }}</p>
          <span class="text-[8px] font-bold text-red-500/40 uppercase">+12% vs last</span>
        </div>
      </div>

      <!-- Section: Stream Health Monitor -->
      <section class="space-y-4">
        <div class="flex justify-between items-center">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Technical Pulse</h4>
          <span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" :class="healthStatusColor">
            {{ health.status }} Connection
          </span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <broadcast theme="outline" size="16" class="text-blue-400" />
              <span class="text-[10px] font-bold text-white/60 uppercase">Bitrate</span>
            </div>
            <span class="text-xs font-black text-white">{{ health.bitrate }} <span
                class="text-[8px] opacity-40">kbps</span></span>
          </div>
          <div class="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <connection-point theme="outline" size="16" class="text-yellow-400" />
              <span class="text-[10px] font-bold text-white/60 uppercase">Latency (RTT)</span>
            </div>
            <span class="text-xs font-black text-white">{{ health.rtt }} <span
                class="text-[8px] opacity-40">ms</span></span>
          </div>
          <div class="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <effects theme="outline" size="16" class="text-green-400" />
              <span class="text-[10px] font-bold text-white/60 uppercase">Frame Rate</span>
            </div>
            <span class="text-xs font-black text-white">{{ health.fps }} <span
                class="text-[8px] opacity-40">fps</span></span>
          </div>
          <div class="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
              <preview-close-one theme="outline" size="16" class="text-red-400" />
              <span class="text-[10px] font-bold text-white/60 uppercase">Packet Loss</span>
            </div>
            <span class="text-xs font-black text-white">{{ health.packetLoss }}%</span>
          </div>
        </div>
      </section>

      <!-- Section: Engagement Velocity -->
      <section class="space-y-4">
        <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Engagement Velocity</h4>
        <div class="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
          <div class="space-y-2">
            <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span class="text-white/60">Chat Activity</span>
              <span class="text-blue-400">{{ engagement.chatMessagesPerMin }} msgs/min</span>
            </div>
            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 transition-all duration-1000"
                :style="{ width: Math.min(100, (engagement.chatMessagesPerMin / 50) * 100) + '%' }"></div>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span class="text-white/60">Share Velocity</span>
              <span class="text-purple-400">{{ engagement.shares }} shares</span>
            </div>
            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-purple-500 transition-all duration-1000"
                :style="{ width: Math.min(100, (engagement.shares / 20) * 100) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Shadowing (Multi-Platform) -->
      <section v-if="shadowStats.length > 0" class="space-y-4">
        <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Platform Distribution</h4>
        <div class="grid grid-cols-1 gap-3">
          <div v-for="s in shadowStats" :key="s.platform"
            class="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
            <div class="flex items-center gap-4">
              <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <youtube v-if="s.platform === 'youtube'" theme="filled" class="text-red-500" />
                <facebook v-else-if="s.platform === 'facebook'" theme="filled" class="text-blue-500" />
                <tiktok v-else-if="s.platform === 'tiktok'" theme="filled" class="text-white" />
                <broadcast v-else theme="outline" class="text-purple-400" />
              </div>
              <div>
                <span class="text-[10px] font-black text-white uppercase tracking-wider">{{ s.platform }}</span>
                <div class="flex items-center gap-2">
                  <span class="text-[8px] font-bold text-white/40 uppercase">{{ s.viewers }} Viewers</span>
                  <div class="w-1 h-1 rounded-full bg-white/20"></div>
                  <span class="text-[8px] font-bold text-green-400 uppercase">{{ Math.round(s.sentiment * 100) }}%
                    Positive</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-white">{{ s.likes }}</span>
              <p class="text-[7px] font-bold text-white/20 uppercase">Likes</p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Section: AI Predictive Analytics -->
      <section class="space-y-4">
        <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">AI Intelligence</h4>
        <PredictiveTrends />
      </section>
    </div>

    <template #footer>
      <div class="p-6 text-center border-t border-white/5">
        <p class="text-[10px] text-white/20 font-bold uppercase tracking-widest">Metrics updated every 2.5 seconds</p>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  ChartHistogram, Close, Broadcast, ConnectionPoint,
  Effects, PreviewCloseOne, Youtube, Facebook, Tiktok
} from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import PredictiveTrends from '../analytics/PredictiveTrends.vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const studioStore = useStudioStore();
const engagement = computed(() => studioStore.engagement);
const health = computed(() => studioStore.health);
const shadowStats = computed(() => studioStore.shadowStats);

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const fetchRealStats = async () => {
  // Assuming we have a projectId in the current context (e.g., from route or somewhere accessible)
  // For now, let's try to get it from a hypothetical source or use a reactive watch
};

watch(() => props.modelValue, (val) => {
  if (val) {
    // If we have an active project ID, fetch it
    const projectId = window.location.pathname.split('/').pop();
    if (projectId && projectId.length === 24) {
      studioStore.fetchAnalytics(projectId);
    }

    // Also fetch shadow stats if we have a current session
    // This is a bit of a hack to find a session from the store if it's there
  }
});

const healthStatusColor = computed(() => {
  switch (health.value.status) {
    case 'good': return 'bg-green-500/20 text-green-400';
    case 'fair': return 'bg-yellow-500/20 text-yellow-400';
    case 'poor': return 'bg-red-500/20 text-red-400';
    default: return 'bg-white/10 text-white/40';
  }
});
</script>

<style scoped lang="scss">
.analytics-drawer-modal {
  :deep(.el-dialog) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :deep(.el-dialog__header) {
    padding: 0;
    margin: 0;
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: rotate(90deg);
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
