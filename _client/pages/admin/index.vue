<template>
  <div class="admin-dashboard">
    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card">
        <template #header>Total Users</template>
        <div class="stat-value">{{ stats.totalUsers }}</div>
        <div class="stat-trend positive">+12% from last month</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <template #header>Monthly Revenue</template>
        <div class="stat-value">${{ stats.monthlyRevenue }}</div>
        <div class="stat-trend positive">+8% from last month</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <template #header>Active Subscriptions</template>
        <div class="stat-value">{{ stats.activeSubscriptions }}</div>
        <div class="stat-trend">Stable</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <template #header>Storage Used (S3)</template>
        <div class="stat-value">{{ stats.storageUsed }} GB</div>
        <div class="stat-trend negative">+15% from last month</div>
      </el-card>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <el-row :gutter="24">
        <el-col :span="12" :xs="24" class="mb-4">
          <el-card class="chart-card">
            <template #header>User Growth</template>
            <div class="chart-container">
              <Line v-if="chartData.userGrowth" :data="chartData.userGrowth" :options="chartOptions" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12" :xs="24" class="mb-4">
          <el-card class="chart-card">
            <template #header>Revenue Trend</template>
            <div class="chart-container">
              <Line v-if="chartData.revenue" :data="chartData.revenue" :options="revenueChartOptions" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- Tables Section -->
    <div class="dashboard-content">
      <el-row :gutter="24">
        <!-- Recent Signups -->
        <el-col :span="8" :xs="24" class="mb-4">
           <el-card class="dashboard-table-card">
            <template #header>Recent Signups</template>
            <el-table :data="stats.recentSignups" style="width: 100%" size="small">
              <el-table-column prop="name" label="User">
                <template #default="scope">
                  <div class="user-mini">
                    <div class="avatar-xs">{{ scope.row.name.charAt(0) }}</div>
                    <span class="truncate">{{ scope.row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="Date" width="100">
                <template #default="scope">
                  {{ new Date(scope.row.createdAt).toLocaleDateString() }}
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
        
        <!-- Recent Upgrades -->
        <el-col :span="8" :xs="24" class="mb-4">
           <el-card class="dashboard-table-card">
            <template #header>Recent Upgrades</template>
            <el-table :data="stats.recentUpgrades" style="width: 100%" size="small">
              <el-table-column prop="name" label="User" />
              <el-table-column prop="subscription.plan" label="Plan">
                 <template #default="scope">
                    <el-tag size="small" effect="dark" type="success">{{ scope.row.subscription?.plan?.toUpperCase() }}</el-tag>
                 </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- System Health -->
        <el-col :span="8" :xs="24" class="mb-4">
          <el-card class="system-health">
            <template #header>System Health</template>
            <div class="health-item">
              <span>Database (MongoDB)</span>
              <el-tag type="success" size="small">Operational</el-tag>
            </div>
            <div class="health-item">
              <span>Storage (AWS S3)</span>
              <el-tag type="success" size="small">Operational</el-tag>
            </div>
            <div class="health-item">
              <span>Gemini AI Service</span>
              <el-tag type="success" size="small">Operational</el-tag>
            </div>
            <div class="health-item">
              <span>Veo3 Video Service</span>
              <el-tag type="warning" size="small">High Latency</el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

definePageMeta({
  layout: 'app',
  middleware: ['admin']
})

const stats = ref({
  totalUsers: 0,
  monthlyRevenue: 0,
  activeSubscriptions: 0,
  storageUsed: 0,
  recentSignups: [],
  recentUpgrades: [],
  charts: {
    userGrowth: { labels: [], data: [] },
    revenue: { labels: [], data: [] }
  }
})

const fetchStats = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const response = await $fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    stats.value = (response as any)
  } catch (error: any) {
    if (error.statusCode === 403) {
      toast.error('Access denied: You do not have admin permissions')
      return
    }
    console.error('Failed to fetch admin stats', error)
  }
}

const chartData = computed(() => {
  if (!stats.value.charts?.userGrowth?.labels) return {}
  
  return {
    userGrowth: {
      labels: stats.value.charts.userGrowth.labels,
      datasets: [
        {
          label: 'Total Users',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10b981',
          data: stats.value.charts.userGrowth.data,
          fill: true,
          tension: 0.4
        }
      ]
    },
    revenue: {
      labels: stats.value.charts.revenue.labels,
      datasets: [
        {
          label: 'Revenue ($)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3b82f6',
          data: stats.value.charts.revenue.data,
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
}

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
  fetchStats()
})
</script>

<style lang="scss" scoped>
.admin-dashboard {
  padding-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  :deep(.el-card__header) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: $text-secondary;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 16px 24px;
  }
  
  :deep(.el-card__body) {
    padding: 24px;
  }
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.stat-trend {
  font-size: 13px;
  color: $text-muted;
  display: flex;
  align-items: center;
  gap: 4px;
}

.positive { color: #10b981; }
.negative { color: #ef4444; }

.charts-section {
  margin-bottom: 32px;
}

.chart-card {
  height: 350px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  
  :deep(.el-card__body) { flex: 1; padding: 16px; min-height: 0; }
  :deep(.el-card__header) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: $text-secondary;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
  }
}

.chart-container {
  height: 100%;
  width: 100%;
}

.dashboard-table-card, .system-health {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  height: 100%;

  :deep(.el-card__header) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: $text-primary;
    font-weight: 600;
    padding: 16px 24px;
  }
  
  :deep(.el-card__body) { padding: 0; }
}

.user-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .avatar-xs {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #333;
    color: #fff;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .truncate { font-size: 13px; color: #fff; }
}

.health-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: $text-secondary;
  font-size: 14px;
  
  &:last-child { border-bottom: none; }
}

.mb-4 { margin-bottom: 24px; }
</style>
