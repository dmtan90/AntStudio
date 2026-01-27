<template>
  <GDialog v-model="visible" width="1200px" @close="handleClose">
    <template #header>
      <div class="flex items-center gap-4">
        <div class="h-10 w-1.5 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <div class="flex flex-col">
          <h3 class="text-xl font-black uppercase tracking-[0.2em] text-white/90">Expansion Plans</h3>
          <span class="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Scale your production with
            AI-powered features</span>
        </div>
      </div>
    </template>

    <div class="subscription-plans-dialog px-2">
      <!-- Billing Toggle -->
      <div class="flex justify-center mb-12">
        <div
          class="inline-flex items-center bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-1.5 gap-2">
          <button @click="isYearly = false"
            :class="cn('px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300', !isYearly ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white/60')">
            Monthly
          </button>
          <button @click="isYearly = true"
            :class="cn('px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2', isYearly ? 'bg-brand-primary text-white shadow-[0_8px_20px_rgba(59,130,246,0.3)]' : 'text-white/30 hover:text-white/60')">
            Annually
            <span
              :class="cn('text-[8px] px-1.5 py-0.5 rounded-full font-black', isYearly ? 'bg-white text-brand-primary' : 'bg-brand-primary/20 text-brand-primary')">SAVE
              17%</span>
          </button>
        </div>
      </div>

      <!-- Plans Grid -->
      <div class="plans-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div v-for="plan in plans" :key="plan.name"
          :class="cn('plan-card relative flex flex-col bg-black/30 border border-white/5 rounded-[32px] p-8 transition-all duration-500 hover:bg-black/50 hover:-translate-y-2 ring-1 ring-white/5 group',
            (plan.name === 'Pro' || plan.name === 'Enterprise') ? 'border-brand-primary/30 bg-brand-primary/[0.03] shadow-[0_20px_50px_rgba(59,130,246,0.1)]' : '')">
          <div v-if="plan.name === 'Pro'"
            class="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-[0_8px_20px_rgba(59,130,246,0.5)] z-10">
            Recommended
          </div>

          <div class="plan-header text-center mb-8">
            <div
              class="plan-icon text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              {{ getPlanIcon(plan.name) }}
            </div>
            <h3 class="text-xl font-black uppercase tracking-[0.2em] text-white mb-6">{{ plan.name }}</h3>
            <div class="flex flex-col items-center gap-1">
              <div class="plan-price flex items-baseline gap-1">
                <span class="text-2xl font-black text-white/40 tracking-tighter">$</span>
                <span class="text-5xl font-black text-white tabular-nums tracking-tighter">{{ isYearly ?
                  Math.round(plan.yearlyPrice / 12) : plan.price }}</span>
                <span class="text-[11px] font-bold text-white/30 uppercase tracking-widest pl-1">/mo</span>
              </div>
              <p class="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-2">{{
                plan.features?.monthlyCredits?.toLocaleString() || 0 }} CREDITS</p>
            </div>
          </div>

          <el-button v-if="plan.price === 0" disabled
            class="cinematic-button !h-12 !w-full !rounded-2xl !bg-white/5 !border-white/10 !text-white/40 mb-8">
            <span class="text-xs font-black uppercase tracking-[0.2em]">CURRENT PLAN</span>
          </el-button>
          <el-button v-else @click="openPaymentInterface(plan)"
            :class="cn('cinematic-button !h-12 !w-full !rounded-2xl mb-8 group/btn !transition-all duration-300',
              plan.name === 'Pro' ? '!bg-brand-primary !text-white !border-transparent shadow-[0_8px_25px_rgba(59,130,246,0.3)] hover:!scale-105 active:!scale-95' : '!bg-white/5 !text-white !border-white/10 hover:!bg-white/10')">
            <span class="text-xs font-black uppercase tracking-[0.2em]">UPGRADE NOW</span>
          </el-button>

          <div class="plan-features grow space-y-8">
            <template v-if="getPlanFeatures(plan.name)">
              <div v-for="(category, catName) in getPlanFeatures(plan.name)" :key="catName" class="category">
                <h4 class="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3">{{ catName }}</h4>
                <ul class="space-y-2.5">
                  <li v-for="feat in category" :key="feat" class="flex items-start gap-2.5">
                    <div
                      class="mt-1 flex-shrink-0 w-3 h-3 rounded-full bg-brand-primary/20 flex items-center justify-center">
                      <CheckIcon class="w-2 h-2 text-brand-primary" :stroke-width="5" />
                    </div>
                    <span class="text-[11px] font-bold text-white/60 leading-relaxed">{{ feat }}</span>
                  </li>
                </ul>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>


    <!-- Payment Method Selector -->
    <GDialog v-model="paymentSelectorVisible" title="Select Payment Method" width="400px" append-to-body>
      <div class="payment-methods p-4 space-y-4">
        <div
          class="method-card flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
          @click="initiateStripeCheckout">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <credit theme="filled" />
            </div>
            <div>
              <p class="text-sm font-black text-white">Credit / Debit Card</p>
              <p class="text-[10px] opacity-40">Visa, Master, AMEX</p>
            </div>
          </div>
          <right class="opacity-20" />
        </div>

        <div
          class="method-card flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
          @click="initiatePayPalCheckout">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
              <paypal theme="filled" />
            </div>
            <div>
              <p class="text-sm font-black text-white">PayPal</p>
              <p class="text-[10px] opacity-40">Wallet & Google/Apple Pay</p>
            </div>
          </div>
          <right class="opacity-20" />
        </div>
      </div>
    </GDialog>
  </GDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GDialog from '@/components/ui/GDialog.vue'
import { toast } from 'vue-sonner'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { storeToRefs } from 'pinia'
import { Credit, Paypal, Right, Check as CheckIcon } from '@icon-park/vue-next'
import { cn } from '@/utils/ui'

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
const paymentSelectorVisible = ref(false)
const selectedPlan = ref<any>(null)

const openPaymentInterface = (plan: any) => {
  selectedPlan.value = plan
  paymentSelectorVisible.value = true
}

const initiateStripeCheckout = async () => {
  if (!selectedPlan.value) return
  paymentSelectorVisible.value = false
  try {
    await userStore.createCheckoutSession({
      planName: selectedPlan.value.name,
      billingPeriod: billingPeriod.value
    })
  } catch (error: any) {
    toast.error(error.message || 'Upgrade failed')
  }
}

const initiatePayPalCheckout = async () => {
  if (!selectedPlan.value) return
  paymentSelectorVisible.value = false
  try {
    const response = await userStore.createPayPalOrder({
      planName: selectedPlan.value.name,
      billingPeriod: billingPeriod.value
    })
    // In real PayPal flow, redirect to their checkout or open popup
    if (response.data.orderId) {
      toast.success("PayPal Order Created: " + response.data.orderId)
      // Window.open(response.links[1].href, '_blank')
    }
  } catch (error: any) {
    toast.error("PayPal integration failed")
  }
}

const handleClose = () => {
  visible.value = false
}

const getPlanIcon = (name: string) => {
  const icons: Record<string, string> = {
    'Free': '🌱',
    'Starter': '🔥',
    'Basic': '⚡',
    'Pro': '💎',
    'Enterprise': '🏢'
  }
  return icons[name] || '✨'
}

const getPlanFeatures = (name: string) => {
  if (name === 'Free') {
    return {
      'Rewards': ['Weekly Bonus: 500 Credits', 'Inviter Bonus: 50% AI Rewards'],
      'AI Vision': ['Gemini 2.0 Pro Analysis', 'Flux.1 [dev] Image: 5 Generation'],
      'Motion': ['Kling 1.6 Video: 5 Segment']
    }
  } else if (name === 'Starter') {
    return {
      'Rewards': ['Weekly Bonus: 500 Credits', 'Inviter Bonus: 50% AI Rewards'],
      'AI Vision': ['Gemini 2.0 Flash: 500 Credits', 'Flux.1 [dev]: 14 Generation'],
      'Motion': ['Kling 1.6 Video: 10 Segment']
    }
  } else if (name === 'Basic') {
    return {
      'Rewards': ['Weekly Bonus: 1000 Credits', 'Inviter Bonus: 70% AI Rewards'],
      'AI Vision': ['Gemini 2.0 Flash: 2000 Credits', 'Flux.1 [dev]: 40 Generation'],
      'Motion': ['Kling 1.6 Video: 30 Segment']
    }
  } else if (name === 'Pro') {
    return {
      'Rewards': ['Weekly Bonus: 2500 Credits', 'Inviter Bonus: 90% AI Rewards'],
      'AI Vision': ['Gemini 2.0 Pro: Priority Access', 'Flux.1 [pro]: Premium Quality'],
      'Motion': ['Kling 1.6 Video: Unlimited HQ'],
      'Rights': ['Watermark-free Overlays', 'Full Commercial License']
    }
  } else if (name === 'Enterprise') {
    return {
      'Rewards': ['Weekly Bonus: 10000 Credits', 'Inviter Bonus: 100% Rewards'],
      'AI Vision': ['Unlimited Analysis API', 'Dedicated Model Training'],
      'Motion': ['Custom SOTA Video Models'],
      'Portal': ['Team Seat Management', 'White-label Player']
    }
  }
  return null
}

onMounted(() => {
  configStore.fetchPlans()
})
</script>

<style lang="scss" scoped>
.plan-card {
  &:hover {
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.05);
  }
}
</style>
