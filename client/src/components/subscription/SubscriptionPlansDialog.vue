<template>
  <GDialog
    v-model="visible"
    title="Choose Your Plan"
    width="1200px"
    @close="handleClose"
  >
    <div class="subscription-plans-dialog">
      <!-- Billing Toggle -->
      <div class="billing-toggle">
        <span :class="{ active: billingPeriod === 'monthly' }">Monthly</span>
        <el-switch v-model="isYearly" @change="toggleBilling" />
        <span :class="{ active: billingPeriod === 'yearly' }">
          Yearly
          <span class="save-badge">Save 17%</span>
        </span>
      </div>

      <!-- Plans Grid -->
      <div class="plans-grid justify-center">
        <div 
          v-for="plan in plans" 
          :key="plan.name"
          class="plan-card"
          :class="{ featured: plan.name === 'Pro' || plan.name === 'Enterprise' }"
        >
          <div class="best-value-badge" v-if="plan.name === 'Pro'">Best Value</div>
          <div class="plan-header">
            <div class="plan-icon">{{ getPlanIcon(plan.name) }}</div>
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="currency">$</span>
              <span class="amount">{{ isYearly ? Math.round(plan.yearlyPrice / 12) : plan.price }}</span>
              <span class="period">/month{{ isYearly ? ', billed yearly' : '' }}</span>
            </div>
            <div class="plan-credits">{{ plan.features?.monthlyCredits?.toLocaleString() || 0 }} credits</div>
            <div class="extra-credits" v-if="isYearly && plan.yearlyPrice > 0">
              Save {{ Math.round((1 - (plan.yearlyPrice / (plan.price * 12))) * 100) }}%
            </div>
          </div>
          
          <GButton 
            v-if="plan.price === 0" 
            class="plan-btn" 
            disabled
          >
            Get started
          </GButton>
          <GButton 
            v-else 
            type="primary" 
            class="plan-btn" 
            :class="{ 'featured-btn': plan.name === 'Pro' }"
            @click="selectPlan(plan.name)"
          >
            Upgrade
          </GButton>

          <div class="plan-features">
             <template v-if="getPlanFeatures(plan.name)">
                <template v-for="(category, catName) in getPlanFeatures(plan.name)" :key="catName">
                    <h4>{{ catName }}</h4>
                    <ul>
                    <li v-for="feat in category" :key="feat">{{ feat }}</li>
                    </ul>
                </template>
             </template>
             <template v-else>
                <h4>Features</h4>
                <ul>
                    <li>{{ plan.features?.monthlyCredits?.toLocaleString() }} Monthly Credits</li>
                    <li>{{ plan.features?.prioritySupport ? 'Priority Support' : 'Standard Support' }}</li>
                </ul>
             </template>
          </div>
        </div>
      </div>
    </div>
  </GDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GDialog from '@/components/ui/GDialog.vue'
import GButton from '@/components/ui/GButton.vue'
import { toast } from 'vue-sonner'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const configStore = useConfigStore()
const { plans } = storeToRefs(configStore)

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'select'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isYearly = ref(false)
const billingPeriod = computed(() => isYearly.value ? 'yearly' : 'monthly')

const toggleBilling = () => {
  // Toggle handled by v-model
}

const selectPlan = async (plan: string) => {
  try {
    await userStore.createCheckoutSession({ 
      planName: plan, 
      billingPeriod: billingPeriod.value 
    })
  } catch (error) {
    console.error(error)
  }
}

const handleClose = () => {
  visible.value = false
}

const getPlanIcon = (name: string) => {
    const icons: Record<string, string> = {
        'Free': '',
        'Starter': '🔥',
        'Basic': '⚡',
        'Pro': '💎',
        'Enterprise': '🏢'
    }
    return icons[name] || '✨'
}

const getPlanFeatures = (name: string) => {
    // Hardcoded feature mapping to preserve UI richness while using dynamic plan data
    if (name === 'Free') {
        return {
            'Creator Rewards': ['Weekly Bonus: 500', 'Invite Bonus: 50% of AI'],
            'LLM': ['Gemini 2.0: 500'],
            'Image Model': ['Flux.1 [dev]: 5'],
            'Video Model(720P/5s)': ['Kling 1.6: 5']
        }
    } else if (name === 'Starter') {
        return {
            'Creator Rewards': ['Weekly Bonus: 500', 'Invite Bonus: 50% of AI'],
            'LLM': ['Gemini 2.0: 500'],
            'Image Model': ['Flux.1 [dev]: 14', 'See Pro (product)'],
            'Video Model(720P/5s)': ['Kling 1.6: 5']
        }
    } else if (name === 'Basic') {
        return {
            'Creator Rewards': ['Weekly Bonus: 500', 'Invite Bonus: 50% of AI'],
            'LLM': ['Gemini 2.0: 500'],
            'Image Model': ['Flux.1 [dev]: 14', 'See Pro (product)'],
            'Video Model(720P/5s)': ['Kling 1.6: 5']
        }
    } else if (name === 'Pro') {
        return {
             'Creator Rewards': ['Weekly Bonus: 500', 'Invite Bonus: 90% of AI'],
            'LLM': ['Gemini 2.0: 500'],
            'Image Model': ['Flux.1 [dev]: 14', 'See Pro (product)'],
            'Video Model(720P/5s)': ['Kling 1.6: 5'],
            'Usage Rights': ['Watermark-free Export', 'Commercial Use']
        }
    } else if (name === 'Enterprise') {
         return {
             'Creator Rewards': ['Weekly Bonus: 2000', 'Invite Bonus: 100% of AI'],
            'LLM': ['Gemini 2.0: Unlimited'],
            'Image Model': ['Flux.1 [dev]: Unlimited', 'See Pro (product)'],
             'Video Model(720P/5s)': ['Kling 1.6: 50'],
            'Usage Rights': ['Watermark-free Export', 'Commercial Use', 'API Access']
        }
    }
    return null
}

onMounted(() => {
    configStore.fetchPlans()
})
</script>

<style lang="scss" scoped>
.subscription-plans-dialog {
  padding: 20px 0;
}

.billing-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;

  span {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.3s;

    &.active {
      color: #fff;
    }

    .save-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      background: linear-gradient(135deg, #ffab00, #ff6d00);
      border-radius: 12px;
      font-size: 10px;
      font-weight: 800;
      color: #000;
    }
  }
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.plan-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  position: relative;
  transition: all 0.3s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-4px);
  }

  &.featured {
    border-color: #ffab00;
    background: linear-gradient(135deg, rgba(255, 171, 0, 0.1), rgba(255, 109, 0, 0.05));
  }

  .best-value-badge {
    position: absolute;
    top: -12px;
    right: 20px;
    background: linear-gradient(135deg, #ffab00, #ff6d00);
    color: #000;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .plan-header {
    text-align: center;
    margin-bottom: 20px;

    .plan-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    h3 {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 16px;
    }

    .plan-price {
      display: flex;
      align-items: baseline;
      justify-content: center;
      margin-bottom: 8px;

      .currency {
        font-size: 20px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.7);
      }

      .amount {
        font-size: 48px;
        font-weight: 800;
        color: #fff;
        line-height: 1;
        margin: 0 4px;
      }

      .period {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .plan-credits {
      font-size: 14px;
      font-weight: 700;
      color: #ffab00;
      margin-bottom: 8px;
    }

    .extra-credits {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.4;
    }
  }

  .plan-btn {
    width: 100%;
    margin-bottom: 24px;

    &.featured-btn {
      background: linear-gradient(135deg, #ffab00, #ff6d00);
      border: none;
      color: #000;
      font-weight: 800;

      &:hover {
        transform: scale(1.02);
      }
    }
  }

  .plan-features {
    h4 {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
      margin: 16px 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        padding: 4px 0;
        padding-left: 16px;
        position: relative;

        &::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #ffab00;
          font-weight: 700;
        }
      }
    }
  }
}

@media (max-width: 1200px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
