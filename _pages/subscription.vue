<template>
  <div class="subscription-page">
    <div class="container" v-if="user">
      <div class="page-header">
        <h1>My Subscription</h1>
        <p>Manage your plan, billing, and usage.</p>
      </div>

      <div class="subscription-layout">
        <!-- Current Plan -->
        <GCard>
          <template #header>
            <div class="card-title">Current Plan: {{ user.subscription.plan.toUpperCase() }}</div>
          </template>
          <div class="plan-details">
            <div class="status">
              Status: <GTag :type="user.subscription.status === 'active' ? 'success' : 'danger'">
                {{ user.subscription.status.toUpperCase() }}
              </GTag>
            </div>
            <div class="period" v-if="user.subscription.endDate">
              Renews on: {{ new Date(user.subscription.endDate).toLocaleDateString() }}
            </div>
            <div class="actions">
              <GButton type="primary" @click="navigateTo('/#pricing')">Upgrade Plan</GButton>
              <GButton v-if="user.subscription.plan !== 'free'">Cancel Subscription</GButton>
            </div>
          </div>
        </GCard>

        <!-- Usage Stats -->
        <GCard>
          <template #header>
            <div class="card-title">Usage Statistics</div>
          </template>
          <div class="usage-items">
            <div class="usage-item">
              <div class="usage-label">
                <span>Videos</span>
                <span>{{ user.quota.videosUsed }} / {{ user.quota.videosPerMonth }}</span>
              </div>
              <div class="g-progress">
                <div class="g-progress-bar" :style="{ width: (user.quota.videosUsed / user.quota.videosPerMonth * 100) + '%' }"></div>
              </div>
            </div>
            <div class="usage-item">
              <div class="usage-label">
                <span>Storage</span>
                <span>{{ storageUsedGB }} / {{ user?.quota.storageLimit }}GB</span>
              </div>
              <div class="g-progress">
                <div class="g-progress-bar warning" :style="{ width: Math.min(((user?.quota.storageUsed || 0) / (user?.quota.storageLimit * 1024 * 1024 * 1024)) * 100, 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </GCard>
      </div>

      <!-- Payment History -->
      <div class="history-section" v-if="payments.length > 0">
        <h2>Billing History</h2>
        <GTable 
          :columns="[
            { label: 'Date', key: 'createdAt' },
            { label: 'Plan', key: 'plan' },
            { label: 'Amount', key: 'amount' },
            { label: 'Status', key: 'status' }
          ]"
          :data="payments"
        >
          <template #cell-createdAt="{ value }">
            {{ new Date(value).toLocaleDateString() }}
          </template>
          <template #cell-amount="{ row }">
            ${{ row.amount }} {{ row.currency.toUpperCase() }}
          </template>
          <template #cell-status="{ value }">
            <GTag :type="value === 'completed' ? 'success' : 'default'">
              {{ value.toUpperCase() }}
            </GTag>
          </template>
        </GTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'app'
})

const user = ref<any>(null)
const payments = ref<any[]>([])
const loading = ref(true)

const fetchData = async () => {
  try {
    const token = localStorage.getItem('auth-token')
    const headers = { Authorization: `Bearer ${token}` }
    
    const [userRes, paymentsRes] = await Promise.all([
      $fetch('/api/auth/me', { headers }),
      $fetch('/api/payment/history', { headers }) // Need to create this endpoint
    ])
    
    user.value = (userRes as any).user
    payments.value = (paymentsRes as any).data.payments
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load subscription data')
  } finally {
    loading.value = false
  }
}

const storageUsedGB = computed(() => {
  if (!user.value?.quota?.storageUsed) return '0.00'
  const gb = user.value.quota.storageUsed / (1024 * 1024 * 1024)
  return gb.toFixed(2)
})

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.subscription-page {
  min-height: 100vh;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: $spacing-xl;
  
  h1 {
    font-size: 36px;
    font-weight: 800;
    margin: 0 0 $spacing-sm 0;
    letter-spacing: -1px;
  }

  p {
    color: $text-secondary;
    font-size: 16px;
  }
}

.subscription-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;
  margin-bottom: 60px;
}

.card-title {
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.plan-details {
  padding: 10px 0;
  .status {
    margin-bottom: $spacing-md;
    font-size: 16px;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .period {
    color: $text-muted;
    margin-bottom: $spacing-xl;
    font-size: 14px;
  }

  .actions {
    display: flex;
    gap: $spacing-md;
    
    & > * { flex: 1; }
  }
}

.usage-items {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  padding: 10px 0;
}

.usage-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
  font-size: 13px;
  color: $text-secondary;
  font-weight: 600;
}

.g-progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;

  .g-progress-bar {
    height: 100%;
    background: #fff;
    border-radius: 3px;
    
    &.warning {
      background: $brand-accent;
    }
  }
}

.history-section {
  h2 {
    margin-bottom: $spacing-lg;
    font-size: 24px;
    font-weight: 700;
  }
}
</style>
