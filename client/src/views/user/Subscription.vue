<template>
  <div class="subscription-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('subscription.title') }}</h1>
          <p class="subtitle">{{ t('subscription.description') }}</p>
        </div>
      </div>
      <div class="subscription-layout">
        <!-- Current Plan -->
        <GCard class="w-[500px]">
          <template #header>
            <div class="card-title">Current Plan: {{ user.subscription?.plan?.toUpperCase() }}</div>
          </template>
          <div class="plan-details">
            <div class="status">
              Status: <GTag :type="user.subscription?.status === 'active' ? 'success' : 'danger'">
                {{ user.subscription?.status?.toUpperCase() }}
              </GTag>
            </div>
            <div class="period" v-if="user.subscription?.endDate">
              Renews on: {{ new Date(user.subscription.endDate).toLocaleDateString() }}
            </div>
            <div class="actions">
              <GButton type="primary" @click="router.push('/#pricing')">Upgrade Plan</GButton>
              <GButton v-if="user.subscription?.plan !== 'free'">Cancel Subscription</GButton>
            </div>
          </div>
        </GCard>

        <!-- Credits Stats -->
        <GCard>
          <template #header>
            <div class="card-title">Credits Overview</div>
          </template>
          <div class="credits-overview">
            <div class="credit-breakdown">
              <div class="credit-stat">
                <div class="stat-label">Current Balance</div>
                <div class="stat-value primary">{{ user.credits?.balance || 0 }}</div>
              </div>
              <div class="credit-stat">
                <div class="stat-label">Consumed This Month</div>
                <div class="stat-value consumed">{{ creditsConsumedThisMonth }}</div>
                <div class="g-progress">
                  <div class="g-progress-bar" :style="{ width: creditUsagePercent + '%' }"></div>
                </div>
              </div>
            </div>
            
            <div class="credit-breakdown">
              <div class="breakdown-item">
                <span class="label">Membership</span>
                <span class="value">{{ user.credits?.membership || 0 }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">Bonus</span>
                <span class="value">{{ user.credits?.bonus || 0 }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">Weekly</span>
                <span class="value">{{ user.credits?.weekly || 0 }}</span>
              </div>
            </div>
          </div>
        </GCard>
      </div>

      <!-- Payment History -->
      <div class="history-section" >
        <h2>Billing History</h2>
        <GTable 
          :columns="[
            { title: 'Date', key: 'createdAt' },
            { title: 'Plan', key: 'plan' },
            { title: 'Amount', key: 'amount' },
            { title: 'Status', key: 'status' }
          ]"
          :data="payments"
        >
          <template #cell-createdAt="{ value }">
            {{ new Date(value).toLocaleDateString() }}
          </template>
          <template #cell-amount="{ row }">
            ${{ row.amount }} {{ row.currency?.toUpperCase() }}
          </template>
          <template #cell-status="{ value }">
            <GTag :type="value === 'completed' ? 'success' : 'danger'">
              {{ value?.toUpperCase() }}
            </GTag>
          </template>
        </GTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import GCard from '@/components/ui/GCard.vue'
import GTag from '@/components/ui/GTag.vue'
import GButton from '@/components/ui/GButton.vue'
import GTable from '@/components/ui/GTable.vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const payments = ref<any[]>([])

const fetchData = async () => {
  try {
    await userStore.fetchProfile()
    payments.value = await userStore.fetchPaymentHistory()
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to load subscription data')
  }
}

const creditsConsumedThisMonth = computed(() => {
  if (!user.value?.creditLogs) return 0
  const now = new Date()
  const thisMonth = user.value.creditLogs.filter((log: any) => {
    const logDate = new Date(log.timestamp)
    return log.type === 'consumed' && 
           logDate.getMonth() === now.getMonth() && 
           logDate.getFullYear() === now.getFullYear()
  })
  return thisMonth.reduce((sum: number, log: any) => sum + log.amount, 0)
})

const creditUsagePercent = computed(() => {
  const total = user.value?.credits?.balance || 1
  const consumed = creditsConsumedThisMonth.value
  return Math.min((consumed / (total + consumed)) * 100, 100)
})

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.subscription-page {
  min-height: 100vh;
  padding: 40px 0;
}

.subscription-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.page-header {
  margin-bottom: 32px;
  
  h1 {
    font-size: 36px;
    font-weight: 800;
    margin: 0 0 12px 0;
    letter-spacing: -1px;
    color: #fff;
  }

  p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
  }
}

.subscription-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
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
    margin-bottom: 16px;
    font-size: 16px;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .period {
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 24px;
    font-size: 14px;
  }

  .actions {
    display: flex;
    gap: 16px;
    
    & > * { flex: 1; }
  }
}

.credits-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px 0;
}

.credit-stat {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .stat-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 800;
    color: #fff;

    &.primary {
      background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    &.consumed {
      font-size: 24px;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.credit-breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .breakdown-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
  }
}

.g-progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;

  .g-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0.7));
    border-radius: 3px;
    transition: width 0.3s ease;
  }
}

.history-section {
  h2 {
    margin-bottom: 24px;
    font-size: 24px;
    font-weight: 700;
    color: #fff;
  }
}

@media (max-width: 768px) {
  .subscription-layout {
    grid-template-columns: 1fr;
  }
}
</style>
