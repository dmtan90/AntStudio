<template>
    <div class="creator-analytics p-6 animate-in">
        <header class="page-header mb-8">
            <h1 class="text-3xl font-black text-white tracking-tight mb-2">Production Analytics</h1>
            <p class="text-gray-400">Deep insights powered by AI for your latest broadcast.</p>
        </header>

        <!-- Key Metrics -->
        <div class="grid grid-cols-4 gap-4 mb-8">
            <div class="metric-card glass-card p-4 rounded-xl border border-white/5">
                <p class="label text-[10px] font-black uppercase opacity-40 mb-1">Peak Viewers</p>
                <p class="value text-2xl font-bold">{{ stats?.peakViewers?.toLocaleString() || 0 }}</p>
                <span class="trend up text-green-500 text-xs">{{ stats?.peakViewersTrend || '0% vs avg' }}</span>
            </div>
            <div class="metric-card glass-card p-4 rounded-xl border border-white/5">
                <p class="label text-[10px] font-black uppercase opacity-40 mb-1">Engagement Score</p>
                <p class="value text-2xl font-bold">{{ stats?.engagementScore?.toFixed(1) || '0.0' }}</p>
                <span class="trend up text-green-500 text-xs" :class="stats?.engagementScore > 80 ? 'text-purple-400' : ''">
                    {{ stats?.engagementScore > 80 ? 'High Viral Potential' : 'Stable Engagement' }}
                </span>
            </div>
            <div class="metric-card glass-card p-4 rounded-xl border border-white/5">
                <p class="label text-[10px] font-black uppercase opacity-40 mb-1">Avg Watch Time</p>
                <p class="value text-2xl font-bold">{{ stats?.avgWatchTime || '0m 0s' }}</p>
                <span class="trend text-xs opacity-40">Stable</span>
            </div>
            <div class="metric-card glass-card p-4 rounded-xl border border-white/5">
                <p class="label text-[10px] font-black uppercase opacity-40 mb-1">Commerce Revenue</p>
                <p class="value text-2xl font-bold text-green-400">${{ (stats?.commerceRevenue || 0).toLocaleString() }}</p>
                <span class="trend up text-green-500 text-xs">{{ stats?.revenueContext || 'N/A' }}</span>
            </div>
        </div>

        <div class="grid grid-cols-3 gap-6">
            <!-- Audience Retention Chart -->
            <div class="col-span-2 glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-sm font-black uppercase tracking-widest text-white/50">Audience Heatmap</h3>
                    <div class="legend flex gap-4 text-[10px]">
                        <span class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-blue-500"></div> Viewers
                        </span>
                        <span class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-purple-500"></div> Chat Velocity
                        </span>
                    </div>
                </div>
                <!-- Mock Chart Visual -->
                <div class="chart-container h-64 w-full bg-black/20 rounded-xl relative flex items-end px-4 gap-1">
                    <div v-for="h in chartData" :key="h"
                        class="flex-1 bg-gradient-to-t from-blue-500/20 to-blue-500/80 rounded-t-sm transition-all hover:opacity-100 opacity-60"
                        :style="{ height: h + '%' }"></div>

                    <!-- Highlight Annotations -->
                    <div
                        class="absolute top-10 left-1/4 bg-purple-500/20 border border-purple-500/50 px-2 py-1 rounded text-[10px] text-purple-200">
                        Poll Started 📊
                    </div>
                    <div
                        class="absolute top-4 left-2/3 bg-red-500/20 border border-red-500/50 px-2 py-1 rounded text-[10px] text-red-200">
                        Flash Deal 🔥
                    </div>
                </div>
            </div>

            <!-- AI Auto-Clips -->
            <div class="col-span-1 glass-card rounded-2xl p-6 border border-white/5">
                <h3 class="text-sm font-black uppercase tracking-widest text-white/50 mb-4">AI Highlights (Auto-Clipped)
                </h3>
                <div class="flex flex-col gap-3 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <div v-for="clip in clips" :key="clip.id"
                        class="clip-item flex gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                        <div class="thumb w-20 h-12 bg-black rounded relative overflow-hidden">
                            <img :src="clip.thumb"
                                class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div class="absolute bottom-1 right-1 px-1 bg-black/80 rounded text-[8px] font-mono">{{
                                clip.duration }}</div>
                        </div>
                        <div class="info flex-1 min-w-0">
                            <p class="text-xs font-bold truncate text-white">{{ clip.reason }}</p>
                            <p class="text-[10px] opacity-40">{{ clip.time }} • {{ clip.score }} Score</p>
                        </div>
                        <button class="icon-btn xs">
                            <download theme="outline" />
                        </button>
                    </div>
                </div>
                <button
                    class="w-full mt-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-bold rounded-lg transition-colors border border-blue-500/30">
                    Generate Short Video from Top 3
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Download } from '@icon-park/vue-next';
import { useAnalyticsStore } from '@/stores/analytics';
import { storeToRefs } from 'pinia';

const analyticsStore = useAnalyticsStore();
const { stats, recentClips: clips, loading: isLoading } = storeToRefs(analyticsStore);

// Chart data based on stats heatmap or fall back to mock
const chartData = computed(() => {
    if (stats.value?.heatmap && stats.value.heatmap.length > 0) {
        return stats.value.heatmap;
    }
    // Return empty array or baseline if no data
    return Array.from({ length: 40 }, () => 10 + Math.random() * 20);
});

onMounted(async () => {
    await analyticsStore.fetchOverview();
});
</script>

<style lang="scss" scoped>
.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
}
</style>
