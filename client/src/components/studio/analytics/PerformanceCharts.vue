<template>
  <div class="performance-charts grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
    <!-- Growth Timeline (Line Chart) -->
    <div class="lg:col-span-2 glass-panel p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">Viral Growth</h3>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Historical views vs Likes (Last 14 Days)</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Views</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-purple-500"></div>
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Likes</span>
          </div>
        </div>
      </div>
      
      <div class="h-[300px] relative">
        <Line :data="lineChartData" :options="lineChartOptions" />
      </div>
    </div>

    <!-- Platform Share (Doughnut Chart) -->
    <div class="glass-panel p-6">
      <div class="mb-6">
        <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">Platform Share</h3>
        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Syndication footprint distribution</p>
      </div>
      
      <div class="h-[240px] relative flex items-center justify-center">
        <Doughnut :data="doughnutChartData" :options="doughnutChartOptions" />
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div class="text-2xl font-black text-white">{{ stats.totalViews > 1000 ? (stats.totalViews/1000).toFixed(1) + 'K' : stats.totalViews }}</div>
          <div class="text-[9px] font-black uppercase tracking-widest text-gray-600">Total Reach</div>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-4 justify-center">
        <div v-for="(val, key) in stats.platformDistribution" :key="key" class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getPlatformColor(key) }"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">{{ key }}: {{ val }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps<{
  stats: {
    platformDistribution: Record<string, number>;
    timeline: { date: string, views: number, likes: number }[];
    totalViews: number;
    totalLikes: number;
  }
}>();

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'youtube': return '#ef4444';
    case 'tiktok': return '#ffffff';
    case 'facebook': return '#3b82f6';
    default: return '#6b7280';
  }
};

const lineChartData = computed(() => ({
  labels: props.stats.timeline.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
  datasets: [
    {
      label: 'Views',
      data: props.stats.timeline.map(t => t.views),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    },
    {
      label: 'Likes',
      data: props.stats.timeline.map(t => t.likes),
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    }
  ]
}));

const lineChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(10, 10, 15, 0.9)',
      titleFont: { family: 'Outfit', weight: 'bold', size: 12 },
      bodyFont: { family: 'Outfit', weight: 'normal', size: 11 },
      padding: 12,
      cornerRadius: 12,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#4b5563',
        font: { family: 'Outfit', weight: 'bold', size: 9 }
      }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: {
        color: '#4b5563',
        font: { family: 'Outfit', weight: 'bold', size: 9 },
        callback: (value: any) => value >= 1000 ? (value/1000).toFixed(1) + 'k' : value
      }
    }
  }
};

const doughnutChartData = computed(() => ({
  labels: Object.keys(props.stats.platformDistribution),
  datasets: [{
    data: Object.values(props.stats.platformDistribution),
    backgroundColor: Object.keys(props.stats.platformDistribution).map(k => getPlatformColor(k)),
    borderWidth: 0,
    hoverOffset: 12
  }]
}));

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '80%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(10, 10, 15, 0.9)',
      padding: 12,
      cornerRadius: 12,
    }
  }
};
</script>

<style scoped>
.glass-panel {
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}
</style>
