<template>
    <div class="analytics-dashboard p-6">
        <div class="page-header mb-8">
            <h1>AI Performance Hub</h1>
            <p class="subtitle">Data-driven insights and optimization control.</p>
        </div>

        <!-- Optimization Control -->
        <div class="cinematic-card p-6 mb-8 border-blue-500/30 bg-blue-500/5">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="flex items-center gap-2">
                        <robot theme="outline" size="20" />
                        Autonomous Optimization
                    </h3>
                    <p class="text-xs opacity-50">AI will automatically switch styles to maximize viewer retention.</p>
                </div>
                <el-switch v-model="optimizationActive" @change="toggleOptimization" />
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Performance Metrics -->
            <div class="lg:col-span-2 space-y-6">
                <div class="cinematic-card p-6 h-[400px]">
                    <h3>Engagement vs. AI Configuration</h3>
                    <div class="h-[300px] mt-4">
                        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div class="cinematic-card p-6 text-center">
                        <p class="text-[10px] font-black opacity-30 uppercase mb-2">Optimal Style</p>
                        <p class="text-2xl font-black text-blue-400">{{ insights.optimalStyle || 'ANALYZING...' }}</p>
                    </div>
                    <div class="cinematic-card p-6 text-center">
                        <p class="text-[10px] font-black opacity-30 uppercase mb-2">Optimal Persona</p>
                        <p class="text-2xl font-black text-purple-400">{{ insights.optimalPersona || 'ANALYZING...' }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Right: Director Insights -->
            <div class="cinematic-card p-6 bg-black/40">
                <h3 class="mb-4">Director Insights</h3>
                <div class="insight-list space-y-4">
                    <div v-for="(insight, idx) in insightHistory" :key="idx"
                        class="p-4 rounded-xl bg-white/5 border border-white/5 animate-in">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span class="text-[9px] font-black opacity-40">{{ new Date().toLocaleTimeString() }}</span>
                        </div>
                        <p class="text-xs leading-relaxed">{{ insight }}</p>
                    </div>
                    <div v-if="!insightHistory.length" class="empty-state py-20 text-center opacity-20">
                        Gathering stream data...
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Robot, ChartLine } from '@icon-park/vue-next';
import { Line } from 'vue-chartjs';
import { useAdminStore } from '@/stores/admin';
import { toast } from 'vue-sonner';

const adminStore = useAdminStore();

const optimizationActive = ref(false);
const insights = ref<any>({});
const insightHistory = ref<string[]>([]);
const snapshots = ref<any[]>([]);

const fetchInsights = async () => {
    try {
        const data = await adminStore.fetchAIPerformance();
        if (data) {
            insights.value = data;
            if (data.insight && !insightHistory.value.includes(data.insight)) {
                insightHistory.value.unshift(data.insight);
            }
        }
    } catch (e) { }
};

const toggleOptimization = async () => {
    try {
        if (optimizationActive.value) {
            await adminStore.toggleAIOptimization({
                projectId: 'current-session',
                initialStyle: 'standard',
                candidates: ['neon', 'cinematic', 'noir', 'dreamy']
            });
        } else {
            toast.info("AI Optimizer Disengaged");
        }
    } catch (e) {
        toast.error("Failed to toggle optimizer");
        optimizationActive.value = !optimizationActive.value;
    }
};

onMounted(() => {
    fetchInsights();
    setInterval(fetchInsights, 10000);
});

// Chart Configuration
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } }
};

const chartData = computed(() => ({
    labels: Array(20).fill(''),
    datasets: [{
        label: 'Retention Score',
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        data: Array(20).fill(0).map(() => Math.random() * 100),
        fill: true,
        tension: 0.4
    }]
}));
</script>

<style scoped lang="scss">
.analytics-dashboard {
    h1 {
        font-size: 24px;
        font-weight: 800;
        color: #fff;
        margin: 0;
    }

    .subtitle {
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
        margin-top: 4px;
    }

    h3 {
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.6);
    }
}

.cinematic-card {
    background: rgba(15, 15, 15, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    backdrop-filter: blur(20px);
}
</style>
