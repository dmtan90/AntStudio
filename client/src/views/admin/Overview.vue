<template>
  <div class="admin-dashboard min-h-screen bg-[#0a0a0c] text-white font-outfit p-8 animate-in fade-in duration-700">
    <header class="mb-12 relative z-10">
      <h1 class="text-5xl font-black uppercase tracking-tighter mb-2">Admin Dashboard</h1>
      <div class="flex items-center gap-3">
         <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
         <p class="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">{{ uiStore.appName }}</p>
      </div>
    </header>

    <div class="grid grid-cols-4 gap-4 mb-12 relative z-10">
      <div v-for="card in statCards" :key="card.label" class="premium-stat-card group">
        <div class="card-content relative z-10">
          <div class="flex justify-between items-start mb-4">
             <span class="label text-[9px] font-black uppercase opacity-40 tracking-widest">{{ card.label }}</span>
             <div :class="['w-8 h-8 rounded-lg flex items-center justify-center transition-colors', card.isPositive ? 'bg-green-500/10 text-green-400 group-hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20']">
                <trending-up v-if="card.isPositive" theme="outline" size="16" />
                <trending-down v-else theme="outline" size="16" />
             </div>
          </div>
          <div class="flex items-baseline gap-3">
             <span class="value text-4xl font-black tracking-tighter text-white">{{ card.value }}</span>
             <span v-if="card.trend" :class="['trend text-[10px] font-bold px-2 py-0.5 rounded-full border', card.isPositive ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400']">
               {{ card.trend }}
             </span>
          </div>
        </div>
        <!-- Hover Glow -->
        <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]"></div>
        <div class="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-all duration-500 group-hover:opacity-40" :style="{ background: card.color }"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
      <!-- Analytics Content -->
      <div class="lg:col-span-2 space-y-8">
        <div class="glass-panel p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden min-h-[450px] group">
            <div class="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-700"></div>
            
           <div class="flex justify-between items-center mb-8 relative z-10">
              <h3 class="text-xs font-black uppercase tracking-widest opacity-60 text-white flex items-center gap-2">
                 <chart-line theme="filled" /> Platform Velocity
              </h3>
              <div class="flex p-1 bg-white/5 rounded-xl border border-white/5">
                 <button class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white text-black shadow-lg">User Growth</button>
                 <button class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase opacity-40 hover:opacity-100 hover:text-white transition-all">Revenue</button>
              </div>
           </div>
           <div class="h-[320px] relative z-10 w-full">
              <Line v-if="chartData.userGrowth" :data="chartData.userGrowth" :options="chartOptions" />
           </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div class="glass-panel p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
              <div class="flex justify-between items-center mb-6">
                 <h3 class="text-xs font-black uppercase tracking-widest opacity-50 text-white">Recent Signups</h3>
                 <button class="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest">View All</button>
              </div>
              <div class="space-y-2">
                 <div v-for="user in stats?.recentSignups?.slice(0, 5)" :key="user.email" 
                     class="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div class="flex items-center gap-4">
                       <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xs font-black text-gray-400 group-hover:text-white group-hover:border-white/20 transition-all">
                          {{ user.name.charAt(0) }}
                       </div>
                       <div>
                          <p class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{{ user.name }}</p>
                          <p class="text-[10px] font-bold opacity-30 uppercase tracking-wide">{{ user.email }}</p>
                       </div>
                    </div>
                    <span class="text-[9px] font-bold opacity-20 uppercase">{{ new Date(user.createdAt).toLocaleDateString() }}</span>
                 </div>
              </div>
           </div>

           <div class="glass-panel p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
              <h3 class="text-xs font-black uppercase tracking-widest opacity-50 mb-6 text-white">Tier Migrations</h3>
               <div class="space-y-4">
                 <div v-for="upgrade in stats?.recentUpgrades?.slice(0, 5)" :key="upgrade.email" class="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div class="flex items-center gap-3">
                       <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                          <trending-up theme="outline" size="14" class="text-green-400" />
                       </div>
                       <div>
                          <p class="text-xs font-bold text-white">{{ upgrade.name }}</p>
                          <p class="text-[9px] text-gray-500">Upgraded Plan</p>
                       </div>
                    </div>
                    <span class="text-[9px] font-black bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-blue-400 uppercase tracking-widest">
                       {{ upgrade.subscription?.plan }}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Infrastructure Sidebar -->
      <div class="space-y-8">
         <div class="glass-panel p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-60 mb-8 text-white relative z-10 flex items-center gap-2">
               <activity-source theme="filled" class="text-green-500" /> VTuber Pulse
            </h3>
            
            <div class="space-y-4 relative z-10">
               <div v-for="svc in healthItems" :key="svc.name" class="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div class="flex items-center gap-3">
                     <div class="relative">
                        <div :class="['w-2 h-2 rounded-full', svc.status === 'ok' ? 'bg-green-500' : 'bg-red-500']"></div>
                        <div :class="['absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75', svc.status === 'ok' ? 'bg-green-500' : 'bg-red-500']"></div>
                     </div>
                     <span class="text-xs font-bold text-gray-300">{{ svc.name }}</span>
                  </div>
                  <span class="text-[10px] font-mono font-bold text-gray-500">{{ svc.latency }}ms</span>
               </div>
            </div>
            <!-- Ambient bg -->
            <div class="absolute -bottom-20 -right-20 w-64 h-64 bg-green-500/5 blur-[80px] rounded-full group-hover:bg-green-500/10 transition-colors"></div>
         </div>

         <div class="glass-panel p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 text-white">Cluster Load</h3>
            <div class="p-8 bg-[#0a0a0c] rounded-[2rem] border border-white/10 flex flex-col items-center relative overflow-hidden">
               <div class="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
               <div class="relative z-10 text-center">
                  <div class="text-5xl font-black text-white mb-1 tracking-tighter">{{ systemHealth?.cpuUsage || 0 }}%</div>
                  <p class="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] mb-6">CPU Fulfillment</p>
                  
                  <div class="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                     <div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-1000 ease-out" :style="{ width: (systemHealth?.cpuUsage || 0) + '%' }"></div>
                  </div>
               </div>
            </div>
         </div>

         <button class="w-full py-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white flex items-center justify-center gap-2 group" @click="$router.push('/admin/infra-health')">
            <setting theme="outline" class="group-hover:rotate-90 transition-transform duration-500" />
            Manage Infrastructure
         </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
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
import { TrendingUp, TrendingDown, ChartLine, Setting, ActivitySource } from '@icon-park/vue-next'
import { useUIStore } from '@/stores/ui'

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

const uiStore = useUIStore();
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
   { label: 'Total Command Units', value: stats.value?.totalUsers || 0, trend: '+12%', isPositive: true, color: '#3b82f6' },
   { label: 'Monthly Delta', value: `$${stats.value?.monthlyRevenue || 0}`, trend: '+8.4%', isPositive: true, color: '#10b981' },
   { label: 'Enterprise Nodes', value: stats.value?.activeSubscriptions || 0, trend: 'Stable', isPositive: true, color: '#a855f7' },
   { label: 'Storage Footprint', value: `${stats.value?.storageUsed || 0} GB`, trend: '+2.1%', isPositive: false, color: '#f59e0b' }
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
          backgroundColor: (context: any) => {
             const ctx = context.chart.ctx;
             const gradient = ctx.createLinearGradient(0, 0, 0, 300);
             gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
             gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
             return gradient;
          },
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#0a0a0c',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          data: stats.value?.charts.userGrowth.data,
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
       backgroundColor: 'rgba(10, 10, 10, 0.9)',
       titleColor: '#fff',
       bodyColor: '#ccc',
       borderColor: 'rgba(255,255,255,0.1)',
       borderWidth: 1,
       padding: 12,
       titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
       bodyFont: { family: 'Outfit', size: 12 }
    }
  },
  scales: {
    x: {
       grid: { display: false, drawBorder: false },
       ticks: { color: '#666', font: { family: 'Outfit', size: 10 } }
    },
    y: {
       grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
       ticks: { color: '#666', font: { family: 'Outfit', size: 10 } }
    }
  }
} as any

onMounted(() => {
  fetchAllData()
})
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.premium-stat-card {
   background: rgba(255, 255, 255, 0.02);
   backdrop-filter: blur(20px);
   border: 1px solid rgba(255, 255, 255, 0.05);
   border-radius: 2.5rem;
   padding: 2rem;
   position: relative;
   overflow: hidden;
   transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
   
   &:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
   }
}

.glass-panel {
   background: rgba(10, 10, 10, 0.4);
   backdrop-filter: blur(40px);
}
</style>
