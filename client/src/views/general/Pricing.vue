<template>
  <div class="pricing-page">
    <div class="pricing-header">
      <h1>{{ t('pricing.title') }}</h1>
      <p>{{ t('pricing.subtitle') }}</p>
    </div>

    <div class="pricing-cards">
      <GCard 
        v-for="plan in plans" 
        :key="plan.name" 
        class="pricing-card" 
        :class="{ 'pro-card': plan.name === 'Pro' }"
        :hoverable="true"
      >
        <div v-if="plan.name === 'Pro'" class="badge">{{ t('pricing.mostPopular') }}</div>
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span class="currency">$</span>
          <span class="amount">{{ plan.price }}</span>
          <span class="interval">{{ t('pricing.perMonth') }}</span>
        </div>
        <ul class="features">
          <li><check-one theme="outline" size="18" /> {{ t('pricing.features.videosPerMonth', { count: plan.features.videosPerMonth }) }}</li>
          <li><check-one theme="outline" size="18" /> {{ t('pricing.features.storageLimit', { count: plan.features.storageLimit }) }}</li>
          <li><check-one theme="outline" size="18" /> {{ plan.features.prioritySupport ? t('pricing.features.prioritySupport') : t('pricing.features.standardSupport') }}</li>
          <li><check-one theme="outline" size="18" /> Gemini 3 Flash AI</li>
          <li><check-one theme="outline" size="18" /> Veo3 Video AI</li>
        </ul>
        <div class="card-footer">
          <GButton 
            type="primary" 
            :plain="plan.name !== 'Pro'" 
            size="lg" 
            @click="handleSubscribe(plan.name)"
            :loading="loadingPlan === plan.name"
            class="subscribe-btn"
          >
            {{ plan.price === 0 ? t('pricing.getStarted') : t('pricing.subscribeNow') }}
          </GButton>
        </div>
      </GCard>
    </div>

    <div class="faq-section">
      <h2>{{ t('pricing.faq.title') }}</h2>
      <el-collapse v-model="activeFaq">
        <el-collapse-item :title="t('pricing.faq.q1')" name="1">
          <div>{{ t('pricing.faq.a1') }}</div>
        </el-collapse-item>
        <el-collapse-item :title="t('pricing.faq.q2')" name="2">
          <div>{{ t('pricing.faq.a2') }}</div>
        </el-collapse-item>
        <el-collapse-item :title="t('pricing.faq.q3')" name="3">
          <div>{{ t('pricing.faq.a3') }}</div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CheckOne } from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import GCard from '@/components/ui/GCard.vue'
import GButton from '@/components/ui/GButton.vue'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n';

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const plans = ref<any[]>([])
const loading = ref(true)
const loadingPlan = ref<string | null>(null)
const activeFaq = ref(['1'])

const fetchPlans = async () => {
  try {
    plans.value = await userStore.fetchPlans()
  } catch (error) {
    // Fallback default plans if API fails
    plans.value = [
      { name: t('pricing.plans.free'), price: 0, features: { videosPerMonth: 3, storageLimit: 1, prioritySupport: false } },
      { name: t('pricing.plans.pro'), price: 29, features: { videosPerMonth: 50, storageLimit: 50, prioritySupport: true } },
      { name: t('pricing.plans.enterprise'), price: 99, features: { videosPerMonth: 500, storageLimit: 500, prioritySupport: true } }
    ]
  } finally {
    loading.value = false
  }
}

const handleSubscribe = async (planName: string) => {
  if (planName === 'Free') {
    router.push('/dashboard')
    return
  }

  loadingPlan.value = planName
  try {
    const data = await userStore.createCheckoutSession({ planName })
    if (data?.url) {
      window.location.href = data.url
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to initiate checkout')
  } finally {
    loadingPlan.value = null
  }
}

onMounted(() => {
  fetchPlans()
})
</script>

<style lang="scss" scoped>
.pricing-page {
  padding: 80px 24px;
  background: #0a0a0a;
  min-height: 100vh;
}

.pricing-header {
  text-align: center;
  margin-bottom: 60px;
  
  h1 {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 16px;
    color: #fff;
  }

  p {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.pricing-cards {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-card {
  width: 320px;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    padding: 40px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  h3 {
    font-size: 24px;
    color: #fff;
    margin: 0 0 24px 0;
    text-align: center;
  }
}

.pro-card {
  border: 2px solid #3b82f6 !important;
  transform: scale(1.05);

  &:hover {
    transform: scale(1.05) translateY(-8px) !important;
  }
}

.badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #3b82f6;
  color: #fff;
  padding: 4px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  z-index: 10;
}

.price {
  text-align: center;
  margin-bottom: 32px;
}

.currency {
  font-size: 24px;
  vertical-align: top;
  color: #fff;
}

.amount {
  font-size: 56px;
  font-weight: 800;
  color: #fff;
}

.interval {
  color: rgba(255, 255, 255, 0.4);
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 40px 0;
  flex-grow: 1;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
  }
}

.subscribe-btn {
  width: 100%;
}

.faq-section {
  max-width: 800px;
  margin: 100px auto 0;

  h2 {
    text-align: center;
    margin-bottom: 40px;
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }
}

:deep(.el-collapse) {
  border: none;
  background: transparent;
  
  .el-collapse-item__header {
    background: transparent;
    color: #fff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 16px;
    padding: 16px 0;
    
    &:hover {
      color: #3b82f6;
    }
  }
  
  .el-collapse-item__wrap {
    background: transparent;
    border: none;
  }
  
  .el-collapse-item__content {
    color: rgba(255, 255, 255, 0.6);
    padding-bottom: 24px;
    line-height: 1.6;
  }
}
</style>
