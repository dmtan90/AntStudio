<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import { useMarketplaceStore } from '@/stores/marketplace';
import { Info, Calendar, Download } from '@icon-park/vue-next';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement);

const marketplaceStore = useMarketplaceStore();
const loading = ref(true);

const report = ref<any>(null);

const lineData = ref<any>({ datasets: [] });
const barData = ref<any>({ datasets: [] });
const doughnutData = ref<any>({ datasets: [] });
const geoData = ref<any>({ datasets: [] });
const deviceData = ref<any>({ datasets: [] });

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        }
    },
    scales: {
        y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } }
        },
        x: {
            grid: { display: false },
            ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } }
        }
    }
};

const fetchData = async () => {
    loading.value = true;
    try {
        const data = await marketplaceStore.fetchAnalyticsReport();
        report.value = data;

        // Process Line Chart (Engagement Flow)
        const days = Object.keys(data.byDay).sort();
        lineData.value = {
            labels: days.map(d => d.split('-').slice(1).join('/')),
            datasets: [
                {
                    label: 'Landing Views',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    data: days.map(d => data.byDay[d].views),
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Order Clicks',
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    borderColor: '#a855f7',
                    data: days.map(d => data.byDay[d].clicks),
                    tension: 0.4,
                    fill: true
                }
            ]
        };

        // Process Bar Chart (Age Groups)
        barData.value = {
            labels: Object.keys(data.demographics.age),
            datasets: [
                {
                    label: 'User Age Groups',
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'],
                    data: Object.values(data.demographics.age)
                }
            ]
        };

        // Process Doughnut Chart (Gender)
        doughnutData.value = {
            labels: Object.keys(data.demographics.gender),
            datasets: [
                {
                    backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'],
                    data: Object.values(data.demographics.gender)
                }
            ]
        };

        // Process Geo Chart (Top Regions)
        const topRegions = Object.keys(data.geo || {}).sort((a,b) => data.geo[b] - data.geo[a]).slice(0, 5);
        geoData.value = {
            labels: topRegions,
            datasets: [
                {
                    label: 'Top Regions',
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    data: topRegions.map(r => data.geo[r])
                }
            ]
        };

        // Process Device Chart
        deviceData.value = {
            labels: Object.keys(data.devices || {}),
            datasets: [
                {
                    backgroundColor: ['#6366f1', '#f43f5e', '#10b981'],
                    data: Object.values(data.devices || {})
                }
            ]
        };
    } catch (err) {
        console.error('Failed to load analytics', err);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchData);
</script>

<template>
  <div v-if="report" class="merchant-analytics space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Top Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="stat in [
            { label: 'Total Views', value: report.totalViews, color: 'text-blue-400', sub: 'Cumulative engagement' },
            { label: 'Total Clicks', value: report.totalClicks, color: 'text-purple-400', sub: 'Interest conversion' },
            { label: 'Conversion Rate', value: ((report.totalClicks / (report.totalViews || 1)) * 100).toFixed(1) + '%', color: 'text-green-400', sub: 'Healthy performance' },
            { label: 'Total Orders', value: marketplaceStore.commerceStats.pendingOrders, color: 'text-orange-400', sub: 'Orders pending fulfillment' }
        ]" :key="stat.label" class="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
            <div class="relative z-10">
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ stat.label }}</div>
                <div class="text-4xl font-black mb-2" :class="stat.color">{{ stat.value }}</div>
                <div class="text-[10px] font-bold text-gray-500">{{ stat.sub }}</div>
            </div>
            <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <calendar size="80" />
            </div>
        </div>
    </div>

    <!-- Main Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Engagement Over Time -->
        <div class="lg:col-span-8 p-8 rounded-[40px] bg-white/5 border border-white/5 backdrop-blur-xl">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h3 class="text-xl font-black uppercase tracking-tight">Engagement Flow</h3>
                    <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">Views vs Click Intent (Last 7 Days)</p>
                </div>
                <button class="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <download size="16" class="text-blue-400" />
                </button>
            </div>
            <div class="h-[300px]">
                <Line :data="lineData" :options="chartOptions" />
            </div>
        </div>

        <!-- Demographics & Devices -->
        <div class="lg:col-span-4 space-y-8">
            <!-- Audience Profile (Age/Gender) -->
            <div class="p-8 rounded-[40px] bg-white/5 border border-white/5 backdrop-blur-xl">
                <h3 class="text-xl font-black uppercase tracking-tight mb-8">Audience profile</h3>
                <div class="space-y-8">
                    <div class="h-[150px]">
                        <Bar :data="barData" :options="chartOptions" />
                    </div>
                    <div class="flex items-center gap-8">
                        <div class="w-32 h-32">
                            <Doughnut :data="doughnutData" :options="{ ...chartOptions, plugins: { legend: { display: false } } }" />
                        </div>
                        <div class="flex-1 space-y-2">
                            <div v-for="(label, i) in doughnutData.labels" :key="label" class="flex items-center justify-between text-[10px] uppercase font-black">
                                <span class="text-gray-500 flex items-center gap-2">
                                    <span class="inline-block w-2 h-2 rounded-full" :style="{ background: doughnutData.datasets[0].backgroundColor[i] }"></span>
                                    {{ label }}
                                </span>
                                <span class="text-white">{{ doughnutData.datasets[0].data[i] }}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Device Distribution -->
            <div class="p-8 rounded-[40px] bg-white/5 border border-white/5 backdrop-blur-xl">
                <h3 class="text-sm font-black uppercase tracking-widest text-gray-500 mb-6">Device Distribution</h3>
                <div class="flex items-center gap-6">
                    <div class="w-24 h-24">
                        <Doughnut :data="deviceData" :options="{ ...chartOptions, plugins: { legend: { display: false } } }" />
                    </div>
                    <div class="flex-1 grid grid-cols-1 gap-2">
                        <div v-for="(label, i) in deviceData.labels" :key="label" class="flex items-center justify-between text-[10px] uppercase font-black">
                            <span class="text-gray-500">{{ label }}</span>
                            <span class="text-white">{{ deviceData.datasets[0].data[i] }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Geographic & Product Performance -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Top Regions -->
        <div class="lg:col-span-5 p-8 rounded-[40px] bg-white/5 border border-white/5 backdrop-blur-xl">
            <h3 class="text-xl font-black uppercase tracking-tight mb-8">Geographic reach</h3>
            <div class="h-[250px]">
                <Bar :data="geoData" :options="{ ...chartOptions, indexAxis: 'y' as const }" />
            </div>
        </div>

        <!-- Product Table -->
        <div class="lg:col-span-7 p-8 rounded-[40px] bg-white/5 border border-white/5 backdrop-blur-xl">
            <div class="flex items-center gap-3 mb-8">
                <div class="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                    <info size="18" />
                </div>
                <div>
                    <h3 class="text-xl font-black uppercase tracking-tight">Product performance</h3>
                    <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">Conversion by product</p>
                </div>
            </div>

            <table class="w-full text-left border-collapse">
                <thead class="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <tr class="border-b border-white/5">
                    <th class="pb-4 font-black">Product Name</th>
                    <th class="pb-4 font-black text-center">Views</th>
                    <th class="pb-4 font-black text-center">Clicks</th>
                    <th class="pb-4 font-black text-right">Conversion</th>
                </tr>
                </thead>
                <tbody class="text-xs">
                <tr v-for="(pData, pid) in report.byProduct" :key="pid" class="group">
                    <td class="py-6 font-bold text-white group-hover:text-blue-400 transition-colors">{{ pData.name }}</td>
                    <td class="py-6 text-center text-gray-400">{{ pData.views }}</td>
                    <td class="py-6 text-center text-gray-400">{{ pData.clicks }}</td>
                    <td class="py-6 text-right">
                        <span class="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 font-black">
                            {{ ((pData.clicks / (pData.views || 1)) * 100).toFixed(1) }}%
                        </span>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
