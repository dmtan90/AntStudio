<template>
    <div class="network-control p-6">
        <div class="page-header mb-8 flex justify-between items-end">
            <div>
                <h1 class="text-3xl font-black italic tracking-tighter uppercase">Network Command</h1>
                <p class="subtitle opacity-40">Omni-channel orchestration across the autonomous empire.</p>
            </div>
            <div class="network-stats flex gap-8">
                <div class="stat text-right">
                    <p class="text-[10px] font-black opacity-30 uppercase">Total Nodes</p>
                    <p class="text-2xl font-black text-blue-500">{{ snapshots.length }}</p>
                </div>
                <div class="stat text-right">
                    <p class="text-[10px] font-black opacity-30 uppercase">Live Viewers</p>
                    <p class="text-2xl font-black text-purple-500">{{ totalViewers }}</p>
                </div>
            </div>
        </div>

        <!-- Global Controls -->
        <div class="cinematic-card p-6 mb-8 border-purple-500/20 bg-purple-500/5">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="flex items-center gap-2">
                        <earth theme="outline" size="20" fill="#a855f7" />
                        Global Hype Synchronization
                    </h3>
                    <p class="text-[10px] opacity-40">Trigger network-wide effects across all active studios.</p>
                </div>
                <div class="flex gap-4">
                    <el-button @click="triggerGlobalEvent('celebration')" round size="small" type="primary"
                        class="!bg-purple-600 !border-purple-600">🎉 Global Celebration</el-button>
                    <el-button @click="triggerGlobalEvent('breaking_news')" round size="small" plain>🗞️ Breaking
                        News</el-button>
                </div>
            </div>
        </div>

        <!-- Multi-Stream Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div v-for="node in snapshots" :key="node.projectId" class="cinematic-card overflow-hidden group">
                <!-- Node Header -->
                <div class="p-4 border-b border-white/5 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div
                            :class="['w-2 h-2 rounded-full shadow-lg', node.status === 'online' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50']">
                        </div>
                        <span class="text-xs font-black uppercase tracking-widest">{{ node.title }}</span>
                    </div>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                        <el-button link size="small">
                            <More theme="outline" size="16" />
                        </el-button>
                    </div>
                </div>

                <!-- Visualization Placeholder -->
                <div class="aspect-video bg-black/40 relative flex items-center justify-center border-b border-white/5">
                    <div v-if="node.status === 'online'"
                        class="w-full h-full flex flex-col items-center justify-center gap-2">
                        <Terminal theme="outline" size="30" class="opacity-10" />
                        <span class="text-[9px] font-black opacity-20 uppercase tracking-[4px]">Active Neural
                            Pipeline</span>
                    </div>
                    <div v-else class="text-[10px] font-black opacity-10 uppercase tracking-widest italic">Node
                        Synchronizing...</div>

                    <!-- Overlay Stats -->
                    <div class="absolute bottom-2 left-2 flex gap-4">
                        <div class="px-2 py-0.5 rounded bg-black/80 flex items-center gap-1 border border-white/10">
                            <Peoples theme="outline" size="10" />
                            <span class="text-[9px] font-bold">{{ formatNumber(node.viewerCount) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Node Metrics -->
                <div class="p-4 bg-white/2 space-y-4">
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-[9px] font-black opacity-30 uppercase">Autonomy Depth</span>
                            <span class="text-[9px] font-black italic">{{ node.autonomyLevel }}%</span>
                        </div>
                        <el-progress :percentage="node.autonomyLevel" :show-text="false" :stroke-width="2"
                            color="#3b82f6" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
                            <p class="text-[8px] font-black opacity-30 uppercase mb-0.5">Uptime</p>
                            <p class="text-xs font-black">{{ formatUptime(node.uptime) }}</p>
                        </div>
                        <div class="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
                            <p class="text-[8px] font-black opacity-30 uppercase mb-0.5">Stability</p>
                            <p class="text-xs font-black text-green-400">NOMINAL</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Earth, Peoples, More, Terminal, ChartPie } from '@icon-park/vue-next';
import axios from 'axios';
import { toast } from 'vue-sonner';

const snapshots = ref<any[]>([]);

const fetchSnapshots = async () => {
    try {
        const { data } = await axios.get('/api/network/snapshot');
        if (data.success) {
            snapshots.value = data.data;
        }
    } catch (e) { }
};

const totalViewers = computed(() => {
    return snapshots.value.reduce((acc, curr) => acc + curr.viewerCount, 0);
});

const triggerGlobalEvent = async (type: string) => {
    try {
        await axios.post('/api/network/event/global', { eventType: type });
        toast.success(`Broadcasting global ${type} pulse to entire network!`);
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
    .cinematic-card {
        background: rgba(15, 15, 15, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        backdrop-filter: blur(20px);
    }
}
</style>
