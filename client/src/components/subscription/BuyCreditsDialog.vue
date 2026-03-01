<template>
  <GDialog
    v-model="visible"
    width="800px"
    @close="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-4">
        <div class="h-10 w-1.5 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <div class="flex flex-col">
          <h3 class="text-xl font-black uppercase tracking-[0.2em] text-white/90">{{ t('subscription.dialogs.buyCredits.title') }}</h3>
          <span class="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{{ t('subscription.dialogs.buyCredits.subtitle') }}</span>
        </div>
      </div>
    </template>

    <div class="buy-credits-dialog px-2 pb-2">
      <div class="credits-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
        <div 
          v-for="pkg in creditPackages" 
          :key="pkg.id || pkg.name" 
          :class="cn('credit-package relative group flex flex-col items-center justify-center bg-black/30 border rounded-[28px] p-8 cursor-pointer transition-all duration-500 hover:bg-black/60 hover:-translate-y-2 ring-1 ring-white/5', 
            selectedPackage?.credits === pkg.credits ? 'border-brand-primary bg-brand-primary/[0.05] shadow-[0_15px_35px_rgba(59,130,246,0.2)]' : 'border-white/5 hover:border-white/10')"
          @click="selectPackage(pkg)"
        >
          <div v-if="(pkg.credits / pkg.price) > 100" class="absolute -top-2 right-4 bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
            +{{ Math.round(((pkg.credits / pkg.price) - 100)) }}% {{ t('subscription.dialogs.buyCredits.bonus') }}
          </div>
          <div class="flex flex-col items-center">
            <div class="package-credits text-3xl font-black text-white mb-1 tabular-nums">{{ pkg.credits.toLocaleString() }}</div>
            <div class="package-label text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">{{ t('subscription.dialogs.buyCredits.credits') }}</div>
            <div :class="cn('package-price text-xl font-black tracking-tighter transition-colors', selectedPackage?.credits === pkg.credits ? 'text-white' : 'text-brand-primary group-hover:text-white')">${{ pkg.price }}</div>
          </div>
        </div>

        <!-- Custom -->
        <div @click="contactUs" class="credit-package custom relative group flex flex-col items-center justify-center bg-black/40 border border-white/10 rounded-[28px] p-8 cursor-pointer transition-all duration-500 hover:bg-black/60 hover:-translate-y-2 ring-1 ring-white/5">
          <div class="package-credits text-xl font-black text-white/80 mb-2 uppercase tracking-widest">{{ t('subscription.dialogs.buyCredits.custom') }}</div>
          <div class="package-label text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center" v-html="t('subscription.dialogs.buyCredits.customDesc')"></div>
        </div>
      </div>

      <div class="credits-note bg-white/[0.03] border border-white/5 rounded-2xl p-5 mb-8 flex items-start gap-4 ring-1 ring-white/5">
        <div class="mt-1 p-1.5 rounded-lg bg-white/5 border border-white/10">
          <Attention :size="14" :stroke-width="5" class="text-white/40" />
        </div>
        <p class="text-[11px] font-bold text-white/40 leading-relaxed tracking-tight italic">
          {{ t('subscription.dialogs.buyCredits.policy') }}
        </p>
      </div>

      <div class="payment-section flex justify-center mt-4">
        <el-button 
          @click="handlePayment" 
          :disabled="!selectedPackage"
          :class="cn('cinematic-button !h-14 !px-12 !rounded-[20px] !bg-brand-primary !text-white !border-transparent shadow-[0_12px_30px_rgba(59,130,246,0.3)] hover:!scale-[1.05] active:!scale-95 transition-all group disabled:!opacity-30 disabled:!scale-100 disabled:!shadow-none')"
        >
          <div class="flex items-center gap-4">
             <div class="p-1.5 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                <Wallet :size="18" :stroke-width="6" />
             </div>
             <span class="text-xs font-black uppercase tracking-[0.2em]">{{ t('subscription.dialogs.buyCredits.purchase') }}</span>
          </div>
        </el-button>
      </div>
    </div>
  </GDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GDialog from '@/components/ui/GDialog.vue'
import { toast } from 'vue-sonner'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { storeToRefs } from 'pinia'
import { cn } from '@/utils/ui'
import { Wallet, Attention } from '@icon-park/vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const configStore = useConfigStore()
const { creditPackages } = storeToRefs(configStore)

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'purchase'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const selectedPackage = ref<{ id?: string; credits: number; price: number } | null>(null)

const selectPackage = (pkg: any) => {
  selectedPackage.value = { 
      id: pkg.id,
      credits: pkg.credits, 
      price: pkg.price 
  }
}

const contactUs = () => {
  toast.info(t('subscription.dialogs.buyCredits.toasts.contactSupport'))
}

const handlePayment = async () => {
  if (selectedPackage.value) {
    try {
      // Use ID directly from backend package if available, else fallback to cp_{credits}
      const packageId = selectedPackage.value.id || `cp_${selectedPackage.value.credits}`
      await userStore.purchaseCredits(packageId)
    } catch (error: any) {
      toast.error(error.message || t('subscription.dialogs.buyCredits.toasts.paymentFailed'))
    }
  }
}

const handleClose = () => {
  selectedPackage.value = null
  visible.value = false
}

onMounted(() => {
    configStore.fetchPlans()
})
</script>

<style lang="scss" scoped>
.credit-package {
  &.selected {
    box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
  }
}
</style>
