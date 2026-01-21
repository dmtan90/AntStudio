<template>
  <GDialog
    v-model="visible"
    title="Buy Credits"
    width="800px"
    @close="handleClose"
  >
    <div class="buy-credits-dialog">
      <div class="credits-grid">
        <div 
          v-for="pkg in creditPackages" 
          :key="pkg.id || pkg.name" 
          class="credit-package" 
          :class="{ featured: (pkg.credits / pkg.price) > 100 }"
          @click="selectPackage(pkg)"
        >
          <div class="bonus-badge" v-if="(pkg.credits / pkg.price) > 100">
            Extra {{ Math.round(((pkg.credits / pkg.price) - 100)) }}%
          </div>
          <div class="package-credits">{{ pkg.credits.toLocaleString() }} <span class="credits-icon">🪙</span></div>
          <div class="package-label">Credits</div>
          <div class="package-price">${{ pkg.price }}</div>
        </div>

        <!-- Custom -->
        <div class="credit-package custom" @click="contactUs">
          <div class="package-credits">Custom</div>
          <div class="package-label">Bulk credits</div>
          <div class="package-sublabel">High-consuming<br>options</div>
          <div class="package-action">Contact us</div>
        </div>
      </div>

      <div class="credits-note">
        <p>Credits validity: Unused credits purchased individually can directly purchase credits. Credits purchased individually will be valid for two years.</p>
      </div>

      <div class="payment-section" v-if="selectedPackage">
        <GButton type="primary" class="pay-btn" @click="handlePayment">
          <span>💳</span>
          Pay now
        </GButton>
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
  toast.info('Please contact support for custom credit packages')
}

const handlePayment = async () => {
  if (selectedPackage.value) {
    try {
      // Use ID directly from backend package if available, else fallback to cp_{credits}
      const packageId = selectedPackage.value.id || `cp_${selectedPackage.value.credits}`
      
      await userStore.purchaseCredits(packageId)
    } catch (error) {
      console.error(error)
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
.buy-credits-dialog {
  padding: 20px 0;
}

.credits-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.credit-package {
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.05);
  }

  &.featured {
    border-color: #ffab00;
    background: linear-gradient(135deg, rgba(255, 171, 0, 0.1), rgba(255, 109, 0, 0.05));

    &:hover {
      border-color: #ffab00;
      box-shadow: 0 8px 24px rgba(255, 171, 0, 0.3);
    }
  }

  &.custom {
    background: linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(50, 50, 50, 0.1));
    border-color: rgba(255, 255, 255, 0.2);

    .package-credits {
      font-size: 20px;
      margin-bottom: 8px;
    }

    .package-sublabel {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin: 8px 0;
      line-height: 1.4;
    }

    .package-action {
      margin-top: 12px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }
  }

  .bonus-badge {
    position: absolute;
    top: -10px;
    right: 10px;
    background: linear-gradient(135deg, #ffab00, #ff6d00);
    color: #000;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .package-credits {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 4px;

    .credits-icon {
      font-size: 20px;
      margin-left: 4px;
    }
  }

  .package-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .package-price {
    font-size: 24px;
    font-weight: 800;
    color: #ffab00;
  }
}

.credits-note {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;

  p {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.6;
  }
}

.payment-section {
  display: flex;
  justify-content: center;

  .pay-btn {
    min-width: 200px;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    span {
      font-size: 20px;
    }
  }
}

@media (max-width: 1024px) {
  .credits-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .credits-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
