<template>
  <div class="admin-dashboard p-6 animate-in">
    <header class="mb-10">
      <h1 class="text-3xl font-black uppercase tracking-tighter">Command Center</h1>
      <p class="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">AntFlow Enterprise Orchestration</p>
    </header>

    <div class="stats-grid mb-10">
      <div v-for="card in statCards" :key="card.label" class="premium-stat-card">
        <div class="card-content">
          <span class="label text-[10px] font-black uppercase opacity-40 tracking-widest block mb-2">{{ card.label }}</span>
          <div class="flex items-end gap-3">
             <span class="value text-4xl font-black tracking-tighter">{{ card.value }}</span>
             <span v-if="card.trend" :class="['trend text-[10px] font-bold px-2 py-0.5 rounded-full', card.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400']">
               {{ card.trend }}
             </span>
          </div>
        </div>
        <div class="card-glow" :style="{ background: card.color }"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Analytics Content -->
      <div class="lg:col-span-2 space-y-8">
        <div class="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden h-[400px]">
           <div class="flex justify-between items-center mb-6 relative z-10">
              <h3 class="text-xs font-black uppercase tracking-widest opacity-50 text-white">Platform Velocity</h3>
              <div class="flex gap-4">
                 <button class="text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity">User Growth</button>
                 <button class="text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity">Revenue</button>
              </div>
           </div>
           <div class="h-[300px] relative z-10">
              <Line v-if="chartData.userGrowth" :data="chartData.userGrowth" :options="chartOptions" />
           </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div class="glass-panel p-6 rounded-3xl border border-white/5">
              <h3 class="text-xs font-black uppercase tracking-widest opacity-50 mb-6 text-white">Recent Signups</h3>
              <div class="space-y-4">
                 <div v-for="user in stats?.recentSignups?.slice(0, 4)" :key="user.email" class="flex items-center justify-between group">
                    <div class="flex items-center gap-3">
                       <div class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black group-hover:bg-blue-500/20 transition-colors">
                          {{ user.name.charAt(0) }}
                       </div>
                       <div>
                          <p class="text-xs font-bold text-white">{{ user.name }}</p>
                          <p class="text-[9px] font-black opacity-30 uppercase">{{ user.email }}</p>
                       </div>
                    </div>
                    <span class="text-[9px] font-black opacity-20 uppercase">{{ new Date(user.createdAt).toLocaleDateString() }}</span>
                 </div>
              </div>
           </div>

           <div class="glass-panel p-6 rounded-3xl border border-white/5">
              <h3 class="text-xs font-black uppercase tracking-widest opacity-50 mb-6 text-white">Tier Migrations</h3>
               <div class="space-y-4">
                 <div v-for="upgrade in stats?.recentUpgrades?.slice(0, 4)" :key="upgrade.email" class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                       <div class="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <trending-up theme="outline" size="14" class="text-green-400" />
                       </div>
                       <p class="text-xs font-bold text-white">{{ upgrade.name }}</p>
                    </div>
                    <span class="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-widest text-blue-400">
                       {{ upgrade.subscription?.plan }}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Infrastructure Sidebar -->
      <div class="space-y-8">
         <div class="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-50 mb-6 text-white relative z-10">VTuber Pulse</h3>
            <div class="space-y-6 relative z-10">
               <div v-for="svc in healthItems" :key="svc.name" class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                     <div :class="['w-2 h-2 rounded-full', svc.status === 'ok' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]']"></div>
                     <span class="text-[11px] font-bold text-white/80">{{ svc.name }}</span>
                  </div>
                  <span class="text-[9px] font-black opacity-30 uppercase tracking-widest">{{ svc.latency }}ms</span>
               </div>
            </div>
            <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
         </div>

         <div class="glass-panel p-6 rounded-3xl border border-white/5">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-50 mb-6 text-white">Fleet Status</h3>
            <div class="p-6 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
               <div class="text-4xl font-black text-white mb-2">{{ systemHealth?.cpuUsage || 0 }}%</div>
               <p class="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">Total Cluster Load</p>
               <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div class="bg-blue-500 h-full transition-all duration-500" :style="{ width: (systemHealth?.cpuUsage || 0) + '%' }"></div>
               </div>
            </div>
         </div>

         <button class="w-full py-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white" @click="$router.push('/admin/infra-health')">
            Manage Infrastructure
         </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { toast } from 'vue-sonner'
import { Line } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js'
import { useAdminStore } from '@/stores/admin'
import { storeToRefs } from 'pinia'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
)

const adminStore = useAdminStore()
const { stats } = storeToRefs(adminStore)
const systemHealth = ref<any>(null);
const healthItems = ref([
    { name: 'Core API Hub', status: 'ok', latency: 42 },
    { name: 'S3 Asset Matrix', status: 'ok', latency: 120 },
    { name: 'Gemini VTuber Cluster', status: 'ok', latency: 1350 },
    { name: 'Redis Cache Cluster', status: 'ok', latency: 2 }
]);

const statCards = computed(() => [
   { label: 'Total Command Units', value: stats.value?.totalUsers || 0, trend: '+12%', isPositive: true, color: 'rgba(59, 130, 246, 0.3)' },
   { label: 'Monthly Delta revenue', value: `$${stats.value?.monthlyRevenue || 0}`, trend: '+8.4%', isPositive: true, color: 'rgba(16, 185, 129, 0.3)' },
   { label: 'Enterprise Nodes', value: stats.value?.activeSubscriptions || 0, trend: 'Stable', isPositive: true, color: 'rgba(168, 85, 247, 0.3)' },
   { label: 'Storage Footprint', value: `${stats.value?.storageUsed || 0} GB`, trend: '+2.1%', isPositive: false, color: 'rgba(245, 158, 11, 0.3)' }
]);

const fetchAllData = async () => {
  try {
    const [statsRes, healthData] = await Promise.all([
        adminStore.fetchStats(),
        adminStore.fetchMonitoringHealth()
    ]);
    
    if (healthData) {
        systemHealth.value = healthData;
    }
  } catch (error: any) {
    if (error.status === 403) {
      toast.error('Access denied: You do not have admin permissions')
      return
    }
    console.error('Failed to fetch admin stats', error)
  }
}

const chartData = computed(() => {
  if (!stats.value?.charts?.userGrowth?.labels) return {}
  
  return {
    userGrowth: {
      labels: stats.value?.charts.userGrowth.labels,
      datasets: [
        {
          label: 'Total Users',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10b981',
          data: stats.value?.charts.userGrowth.data,
          fill: true,
          tension: 0.4
        }
      ]
    },
    revenue: {
      labels: stats.value?.charts.revenue.labels,
      datasets: [
        {
          label: 'Revenue ($)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3b82f6',
          data: stats.value?.charts.revenue.data,
          fill: true,
          tension: 0.4
        }
      ]
    }
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
       mode: 'index',
       intersect: false,
       backgroundColor: 'rgba(0,0,0,0.8)',
       titleColor: '#fff',
       bodyColor: '#ccc',
       borderColor: 'rgba(255,255,255,0.1)',
       borderWidth: 1
    }
  },
  scales: {
    x: {
       grid: { display: false, drawBorder: false },
       ticks: { color: '#64748b' }
    },
    y: {
       grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
       ticks: { color: '#64748b' }
    }
  }
} as any

const revenueChartOptions = {
  ...chartOptions,
  scales: {
    ...chartOptions.scales,
    y: {
       ...chartOptions.scales.y,
       ticks: {
          callback: (value: any) => '$' + value,
          color: '#64748b'
       }
    }
  }
}

onMounted(() => {
  fetchAllData()
})
</script>

<style lang="scss" scoped>
.admin-dashboard {
  min-height: 100vh;
  background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.03), transparent 40%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.premium-stat-card {
   position: relative;
   background: rgba(255, 255, 255, 0.02);
   backdrop-filter: blur(20px);
   border: 1px solid rgba(255, 255, 255, 0.05);
   border-radius: 2rem;
   padding: 24px;
   overflow: hidden;
   transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
   
   &:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
   }

   .card-glow {
      position: absolute;
      width: 100px;
      height: 100px;
      right: -50px;
      bottom: -50px;
      filter: blur(40px);
      border-radius: 50%;
      opacity: 0.2;
   }
}

.glass-panel {
   background: rgba(10, 10, 10, 0.4);
   backdrop-filter: blur(40px);
}

.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
