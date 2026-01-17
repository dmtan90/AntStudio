<template>
  <div class="pricing-page">
    <div class="pricing-header">
      <h1>Simple, Transparent Pricing</h1>
      <p>Choose the plan that's right for your creative journey.</p>
    </div>

    <div class="pricing-cards">
      <GCard 
        v-for="plan in plans" 
        :key="plan.name" 
        class="pricing-card" 
        :class="{ 'pro-card': plan.name === 'Pro' }"
        :hoverable="true"
      >
        <div v-if="plan.name === 'Pro'" class="badge">Most Popular</div>
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span class="currency">$</span>
          <span class="amount">{{ plan.price }}</span>
          <span class="interval">/month</span>
        </div>
        <ul class="features">
          <li><check-one theme="outline" size="18" /> {{ plan.features.videosPerMonth }} Videos / month</li>
          <li><check-one theme="outline" size="18" /> {{ plan.features.storageLimit }}GB Storage</li>
          <li><check-one theme="outline" size="18" /> {{ plan.features.prioritySupport ? 'Priority' : 'Standard' }} Support</li>
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
            {{ plan.price === 0 ? 'Get Started' : 'Subscribe Now' }}
          </GButton>
        </div>
      </GCard>
    </div>

    <div class="faq-section">
      <h2>Frequently Asked Questions</h2>
      <el-collapse v-model="activeFaq">
        <el-collapse-item title="Can I cancel my subscription at any time?" name="1">
          <div>Yes, you can cancel your subscription at any time from your account settings. You will continue to have access to your plan until the end of your current billing period.</div>
        </el-collapse-item>
        <el-collapse-item title="What happens if I exceed my video quota?" name="2">
          <div>If you reach your monthly limit, you can upgrade to a higher plan or wait until your next billing cycle for your quota to reset.</div>
        </el-collapse-item>
        <el-collapse-item title="Do you offer enterprise custom plans?" name="3">
          <div>Yes! Please contact our sales team for custom solutions tailored to your organization's needs.</div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CheckOne } from '@icon-park/vue-next'
import { toast } from 'vue-sonner'

import { navigateTo, useHead } from '#app'

const plans = ref<any[]>([])
const loading = ref(true)
const loadingPlan = ref<string | null>(null)
const activeFaq = ref(['1'])

const fetchPlans = async () => {
  try {
    const res: any = await $fetch('/api/admin/settings/plans')
    plans.value = res.data.plans
  } catch (error) {
    // Fallback default plans if API fails
    plans.value = [
      { name: 'Free', price: 0, features: { videosPerMonth: 3, storageLimit: 1, prioritySupport: false } },
      { name: 'Pro', price: 29, features: { videosPerMonth: 50, storageLimit: 50, prioritySupport: true } },
      { name: 'Enterprise', price: 99, features: { videosPerMonth: 500, storageLimit: 500, prioritySupport: true } }
    ]
  } finally {
    loading.value = false
  }
}

const handleSubscribe = async (planName: string) => {
  if (planName === 'Free') {
    navigateTo('/dashboard')
    return
  }

  loadingPlan.value = planName
  try {
    const token = localStorage.getItem('auth-token')
    const { url } = await $fetch<{ url: string }>('/api/payment/create-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { planName }
    })
    window.location.href = url
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to initiate checkout')
  } finally {
    loadingPlan.value = null
  }
}

onMounted(() => {
  fetchPlans()
})

useHead({
  title: 'Pricing Plans | Simple & Transparent - AntFlow',
  meta: [
    { name: 'description', content: 'Choose the best plan for your AI video generation needs. Free, Pro, and Enterprise options available.' }
  ]
})
</script>

<style lang="scss" scoped>
.pricing-page {
  padding: 80px $spacing-lg;
  background: $bg-dark;
  min-height: 100vh;
}

.pricing-header {
  text-align: center;
  margin-bottom: 60px;
  
  h1 {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: $spacing-md;
    @include text-gradient(linear-gradient(to bottom, #fff 0%, rgba(255, 255, 255, 0.7) 100%));
  }

  p {
    font-size: 18px;
    color: $text-secondary;
  }
}

.pricing-cards {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: $spacing-xl;
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-card {
  width: 320px;
  position: relative;
  transition: $transition-base;
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    padding: 40px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  // Override GCard generic styles if needed
  // But GCard styles are good. We just removed glass-card mixin.
  
  h3 {
    font-size: 24px;
    color: #fff;
    margin: 0 0 $spacing-lg 0;
    text-align: center;
  }
}

.pro-card {
  border: 2px solid $brand-accent !important;
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
  background: $brand-accent;
  color: #fff;
  padding: 4px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba($brand-accent, 0.3);
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
  color: $text-muted;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 40px 0;
  flex-grow: 1;

  li {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;
    color: $text-secondary;
    font-size: 14px;
  }

  i {
    color: $brand-accent;
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
    @include text-gradient(linear-gradient(to right, #fff, rgba(255, 255, 255, 0.7)));
  }
}

:deep(.el-collapse) {
  border: none;
  background: transparent;
  
  .el-collapse-item__header {
    background: transparent;
    color: #fff;
    border-bottom: 1px solid $border-glass;
    font-size: 16px;
    padding: $spacing-md 0;
    
    &:hover {
      color: $brand-accent;
    }
  }
  
  .el-collapse-item__wrap {
    background: transparent;
    border: none;
  }
  
  .el-collapse-item__content {
    color: $text-secondary;
    padding-bottom: $spacing-lg;
    line-height: 1.6;
  }
}
</style>
