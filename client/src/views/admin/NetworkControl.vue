<template>
    <div class="network-control min-h-screen p-8 relative overflow-hidden">
        <!-- Ambient Glows -->
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div class="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <!-- Page Header -->
        <div class="page-header mb-10 flex justify-between items-end relative z-10">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-1 h-8 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                    <h1 class="text-3xl font-black tracking-tight text-white">Network Command</h1>
                </div>
                <p class="text-sm text-white/30 ml-4 pl-3">Omni-channel orchestration across the autonomous empire.</p>
            </div>
            <!-- Stats -->
            <div class="flex gap-6">
                <div class="glass-stat text-right">
                    <p class="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Total Nodes</p>
                    <p class="text-2xl font-black text-blue-400 tabular-nums">{{ snapshots.length }}</p>
                </div>
                <div class="w-px h-10 bg-white/5 self-center" />
                <div class="glass-stat text-right">
                    <p class="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Live Viewers</p>
                    <p class="text-2xl font-black text-indigo-400 tabular-nums">{{ formatNumber(totalViewers) }}</p>
                </div>
            </div>
        </div>

        <!-- Global Controls -->
        <div class="glass-card p-5 mb-8 border-blue-500/15 bg-blue-500/5 relative z-10">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <earth theme="outline" size="20" class="text-blue-400" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-white">Global Hype Synchronization</h3>
                        <p class="text-[11px] text-white/30">Trigger network-wide effects across all active studios.</p>
                    </div>
                </div>
                <div class="flex gap-3">
                    <el-button @click="triggerGlobalEvent('celebration')" round size="small"
                        class="!bg-blue-600 !border-blue-600 !text-white !font-bold !text-[11px] shadow-[0_4px_15px_rgba(59,130,246,0.25)] hover:brightness-110 transition-all">
                        🎉 Global Celebration
                    </el-button>
                    <el-button @click="triggerGlobalEvent('breaking_news')" round size="small"
                        class="!bg-white/5 !border-white/10 !text-white/70 !font-bold !text-[11px] hover:!bg-white/10 transition-all">
                        🗞️ Breaking News
                    </el-button>
                </div>
            </div>
        </div>

        <!-- Multi-Stream Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
            <div v-for="node in snapshots" :key="node.projectId"
                class="glass-card overflow-hidden group hover:border-blue-500/20 hover:shadow-[0_8px_30px_rgba(59,130,246,0.08)] transition-all duration-300">

                <!-- Node Header -->
                <div class="px-5 py-4 border-b border-white/5 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div :class="['w-2 h-2 rounded-full', node.status === 'online'
                            ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse'
                            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]']" />
                        <span class="text-xs font-bold text-white/80 uppercase tracking-wider">{{ node.title }}</span>
                        <span :class="['text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                            node.status === 'online'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20']">
                            {{ node.status }}
                        </span>
                    </div>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                        <el-button link size="small" class="!text-white/40 hover:!text-white">
                            <More theme="outline" size="16" />
                        </el-button>
                    </div>
                </div>

                <!-- Visualization -->
                <div class="aspect-video bg-black/50 relative flex items-center justify-center border-b border-white/5 overflow-hidden">
                    <!-- Online State -->
                    <div v-if="node.status === 'online'"
                        class="w-full h-full flex flex-col items-center justify-center gap-3">
                        <!-- Animated ring -->
                        <div class="relative">
                            <div class="w-16 h-16 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                                <div class="w-12 h-12 rounded-full border border-blue-500/10 flex items-center justify-center">
                                    <Terminal theme="outline" size="22" class="text-blue-500/30" />
                                </div>
                            </div>
                            <div class="absolute inset-0 rounded-full border border-blue-400/20 animate-ping" />
                        </div>
                        <span class="text-[9px] font-bold text-white/20 uppercase tracking-[4px]">Active VTuber Pipeline</span>
                    </div>
                    <!-- Offline State -->
                    <div v-else class="flex flex-col items-center gap-2">
                        <Terminal theme="outline" size="24" class="text-white/10" />
                        <span class="text-[10px] font-bold text-white/10 uppercase tracking-widest italic">Synchronizing...</span>
                    </div>

                    <!-- Overlay Stats -->
                    <div class="absolute bottom-3 left-3 flex gap-2">
                        <div class="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md flex items-center gap-1.5 border border-white/10">
                            <Peoples theme="outline" size="11" class="text-white/40" />
                            <span class="text-[10px] font-bold text-white/60">{{ formatNumber(node.viewerCount) }}</span>
                        </div>
                    </div>

                    <!-- Gradient overlay at bottom -->
                    <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>

                <!-- Node Metrics -->
                <div class="p-5 space-y-4">
                    <!-- Autonomy Bar -->
                    <div>
                        <div class="flex justify-between mb-2">
                            <span class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Autonomy Depth</span>
                            <span class="text-[10px] font-bold text-blue-400">{{ node.autonomyLevel }}%</span>
                        </div>
                        <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                :style="{ width: node.autonomyLevel + '%' }" />
                        </div>
                    </div>

                    <!-- Stat Cards -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 rounded-xl bg-white/3 border border-white/5 text-center hover:bg-white/5 transition-colors">
                            <p class="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-1">Uptime</p>
                            <p class="text-sm font-black text-white/80">{{ formatUptime(node.uptime) }}</p>
                        </div>
                        <div class="p-3 rounded-xl bg-white/3 border border-white/5 text-center hover:bg-white/5 transition-colors">
                            <p class="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-1">Stability</p>
                            <p class="text-sm font-black text-green-400">NOMINAL</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="snapshots.length === 0"
                class="col-span-full glass-card p-16 flex flex-col items-center justify-center gap-4 text-center">
                <div class="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2">
                    <Terminal theme="outline" size="28" class="text-blue-400/50" />
                </div>
                <p class="text-sm font-bold text-white/20 uppercase tracking-widest">No Nodes Online</p>
                <p class="text-[12px] text-white/10">Network nodes will appear here when active.</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Earth, Peoples, More, Terminal } from '@icon-park/vue-next';

import { toast } from 'vue-sonner';
import { useAdminStore } from '@/stores/admin';

const adminStore = useAdminStore();
const snapshots = ref<any[]>([]);

const fetchSnapshots = async () => {
    try {
        const data = await adminStore.fetchNetworkSnapshot();
        if (data) {
            snapshots.value = data;
        }
    } catch (e) { }
};

const totalViewers = computed(() => {
    return snapshots.value.reduce((acc, curr) => acc + curr.viewerCount, 0);
});

const triggerGlobalEvent = async (type: string) => {
    try {
        await adminStore.triggerNetworkEvent(type);
    } catch (e) {
        toast.error("Global pulse failed to propagate.");
    }
};

const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
};

const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

onMounted(() => {
    fetchSnapshots();
    setInterval(fetchSnapshots, 5000);
});
</script>

<style scoped lang="scss">
.network-control {
    background: #0a0a0c;
    color: #e5e5e5;
    font-family: 'Inter', sans-serif;
}

.glass-card {
    background: rgba(15, 15, 18, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 20px;
    backdrop-filter: blur(30px) saturate(180%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-stat {
    padding: 4px 0;
}
</style>
