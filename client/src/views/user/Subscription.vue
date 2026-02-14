<template>
  <div class="subscription-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('subscription.title').toUpperCase() }}</h1>
          <p class="subtitle">{{ t('subscription.description') }}</p>
        </div>
      </div>
      <div class="subscription-layout">
        <!-- Current Plan -->
        <GCard>
          <template #header>
            <div class="card-title">{{ t('subscription.currentPlan') }}</div>
          </template>
          <div class="plan-details">
            <div class="plan-info-box">
              <div class="label">{{ t('subscription.currentPlan') }}</div>
              <div class="value">{{ user?.subscription?.plan?.toUpperCase() || 'FREE' }}</div>
            </div>

            <div class="status-row">
              <span class="label">STATUS:</span>
              <GTag :type="user.subscription?.status === 'active' ? 'success' : 'danger'">
                {{ user.subscription?.status?.toUpperCase() || 'ACTIVE' }}
              </GTag>
            </div>

            <div class="period" v-if="user.subscription?.endDate">
              RENEWS ON: {{ new Date(user.subscription.endDate).toLocaleDateString() }}
            </div>

            <div class="actions mt-auto">
              <GButton type="primary" class="w-full upgrade-btn" @click="showUpgradeDialog">
                {{ t('subscription.upgrade').toUpperCase() }}
              </GButton>
              <GButton v-if="user?.subscription?.plan && user.subscription.plan !== 'free'"
                class="w-full mt-3 cancel-btn">
                {{ t('subscription.cancel').toUpperCase() }}
              </GButton>
            </div>
          </div>
        </GCard>

        <!-- Credits Stats -->
        <GCard>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <div class="card-title">{{ t('subscription.credits').toUpperCase() }} OVERVIEW</div>
              <GButton size="small" variant="secondary" @click="showBuyCreditsDialog" class="!px-4 !h-8 !text-[10px] !font-black !tracking-widest">
                TOP UP
              </GButton>
            </div>
          </template>
          <div class="credits-overview">
            <div class="credit-grid">
              <div class="credit-stat">
                <div class="stat-label">CURRENT BALANCE</div>
                <div class="stat-value primary">{{ user?.credits?.balance || 0 }}</div>
              </div>
              <div class="credit-stat">
                <div class="stat-label">CONSUMED THIS MONTH</div>
                <div class="stat-value consumed">{{ creditsConsumedThisMonth }}</div>
                <div class="g-progress">
                  <div class="g-progress-bar" :style="{ width: creditUsagePercent + '%' }"></div>
                </div>
              </div>
            </div>

            <div class="credit-breakdown">
              <div class="breakdown-item">
                <span class="label">MEMBERSHIP</span>
                <span class="value">{{ user.credits?.membership || 0 }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">BONUS</span>
                <span class="value">{{ user.credits?.bonus || 0 }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">WEEKLY</span>
                <span class="value">{{ user.credits?.weekly || 0 }}</span>
              </div>
            </div>
          </div>
        </GCard>
      </div>

      <!-- Payment History -->
      <div class="history-section">
        <h2 class="section-title">BILLING HISTORY</h2>
        <GTable :columns="[
          { title: 'DATE', key: 'createdAt' },
          { title: 'PLAN', key: 'plan' },
          { title: 'AMOUNT', key: 'amount' },
          { title: 'STATUS', key: 'status' }
        ]" :data="payments">
          <template #cell-createdAt="{ value }">
            {{ new Date(value).toLocaleDateString() }}
          </template>
          <template #cell-plan="{ value }">
            {{ value?.toUpperCase() }}
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

  <!-- Subscription Plans Dialog -->
  <SubscriptionPlansDialog v-model="subscriptionDialogVisible" @select="handlePlanSelection" />
  
  <!-- Buy Credits Dialog -->
  <BuyCreditsDialog v-model="buyCreditsDialogVisible" />
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
import SubscriptionPlansDialog from '@/components/subscription/SubscriptionPlansDialog.vue'
import BuyCreditsDialog from '@/components/subscription/BuyCreditsDialog.vue'

const { t } = useTranslations()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const payments = ref<any[]>([])
const subscriptionDialogVisible = ref(false)
const buyCreditsDialogVisible = ref(false)

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
  const total = (user.value?.credits?.balance || 0) + (creditsConsumedThisMonth.value || 0)
  if (total === 0) return 0
  return Math.min((creditsConsumedThisMonth.value / total) * 100, 100)
})

const showUpgradeDialog = () => {
  subscriptionDialogVisible.value = true
}

const showBuyCreditsDialog = () => {
  buyCreditsDialogVisible.value = true
}

const handlePlanSelection = (data: any) => {
  // Satisfying TODO: Navigate to tactical billing gateway
  subscriptionDialogVisible.value = false
  fetchData()
  // router.push({ path: '/billing', query: { selectedPlan: data.id } })
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@use "sass:color";
@use "@/assets/scss/_variables.scss" as vars;
// $primary-rgb: var(--primary-rgb);
// $primary: var(--primary-rgb);

.subscription-page {
  min-height: 100vh;
  padding: 60px 0 100px 0;
  background: radial-gradient(circle at top right, rgba(vars.$primary-rgb, 0.05), transparent 40%),
    radial-gradient(circle at bottom left, rgba(vars.$primary-rgb, 0.05), transparent 40%);
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.page-header {
  margin-bottom: 48px;

  .glow-title {
    font-size: 48px;
    font-weight: 900;
    margin: 0 0 12px 0;
    letter-spacing: -2px;
    color: #fff;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
    position: relative;
    display: inline-block;

    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      width: 80px;
      height: 4px;
      background: vars.$primary;
      box-shadow: 0 0 20px vars.$primary;
      border-radius: 2px;
    }
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.5);
    font-size: 16px;
    font-weight: 500;
  }
}

.subscription-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  margin-bottom: 80px;

  @media (min-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card-title {
  font-weight: 800;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.plan-details {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px 0;

  .plan-info-box {
    background: rgba(255, 255, 255, 0.03);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 32px;

    .label {
      font-size: 10px;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }

    .value {
      font-size: 32px;
      font-weight: 900;
      color: #fff;
      letter-spacing: -1px;
    }
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;

    .label {
      font-size: 12px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 1px;
    }
  }

  .period {
    color: rgba(255, 255, 255, 0.3);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 40px;
    letter-spacing: 0.5px;
  }

  .actions {
    margin-top: auto;

    .upgrade-btn {
      height: 54px;
      font-weight: 900;
      letter-spacing: 2px;
      font-size: 14px;
      box-shadow: 0 8px 24px rgba(vars.$primary-rgb, 0.2);
    }

    .cancel-btn {
      color: rgba(255, 255, 255, 0.4);

      &:hover {
        color: #ff4d4f;
      }
    }
  }
}

.credits-overview {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 10px 0;
}

.credit-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 480px) {
    grid-template-columns: 1fr 1.5fr;
    gap: 32px;
  }
}

.credit-stat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;

  .stat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-value {
    font-size: 40px;
    font-weight: 900;
    color: #fff;
    line-height: 1;

    &.primary {
      background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.5) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    &.consumed {
      font-size: 28px;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.credit-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);

  .breakdown-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .label {
      font-size: 10px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .value {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
    }
  }
}

.g-progress {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;

  .g-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, vars.$primary, color.adjust(vars.$primary, $lightness: 20%));
    box-shadow: 0 0 10px rgba(vars.$primary-rgb, 0.5);
    border-radius: 4px;
    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.history-section {
  .section-title {
    margin-bottom: 32px;
    font-size: 20px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 2px;
  }
}

@media (max-width: 1200px) {
  .subscription-layout {
    grid-template-columns: 1fr;
  }

  .page-container {
    padding: 0 20px;
  }

  .page-header h1 {
    font-size: 36px;
  }
}
</style>
