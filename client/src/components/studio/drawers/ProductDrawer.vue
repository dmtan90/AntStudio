<template>
  <el-dialog v-model="isVisible" :show-close="false" :align-center="true" :width="650"
    class="product-drawer-modal glass-dark">
    <template #header>
      <div class="flex justify-between items-center p-6 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <shopping theme="outline" size="20" class="text-orange-400" />
          </div>
          <div>
            <h2 class="text-lg font-black text-white uppercase tracking-tighter">Live Commerce</h2>
            <p class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Inventory & Flash Deals</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button
            class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-white/60 tracking-widest transition-all">
            Sync Store
          </button>
          <button @click="$emit('update:modelValue', false)" class="close-btn">
            <close theme="outline" size="20" />
          </button>
        </div>
      </div>
    </template>

    <div class="p-8 space-y-10 max-h-[75vh] overflow-y-auto scrollbar-hide">
      <!-- Section: Featured Products -->
      <section class="space-y-4">
        <div class="flex justify-between items-end">
          <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Featured Inventory</h4>
          <span
            class="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Ready
            to Showcase</span>
        </div>

        <div v-if="products.length > 0" class="grid grid-cols-1 gap-3">
          <div v-for="product in products" :key="product.id"
            class="group p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-6 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all cursor-pointer"
            :class="{ 'border-orange-500 bg-orange-500/10': product.isActive }" @click="toggleProduct(product)">
            <div class="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black">
              <img :src="product.image"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div v-if="product.isActive" class="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                <Check theme="outline" size="24" class="text-white drop-shadow-lg" />
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start mb-1">
                <h5 class="text-sm font-black text-white uppercase tracking-tight">{{ product.name }}</h5>
                <span class="text-xs font-black text-orange-400">${{ product.price }}</span>
              </div>
              <p class="text-[10px] text-white/40 font-medium line-clamp-1 mb-3">{{ product.description }}</p>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full" :class="product.stock > 10 ? 'bg-green-500' : 'bg-red-500'">
                  </div>
                  <span class="text-[9px] font-black text-white/30 uppercase tracking-widest">{{ product.stock }} IN
                    STOCK</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Ranking theme="outline" size="12" class="text-white/20" />
                  <span class="text-[9px] font-black text-white/30 uppercase tracking-widest">{{ product.clicks || 0 }}
                    CLICKS</span>
                </div>
              </div>
            </div>

            <button class="px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              :class="product.isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'">
              {{ product.isActive ? 'Live' : 'Pin' }}
            </button>
          </div>
        </div>
        <div v-else
          class="p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center opacity-30 gap-4">
          <shopping theme="outline" size="48" />
          <p class="text-[10px] font-black uppercase tracking-[0.2em]">No products found</p>
        </div>
      </section>

      <!-- Section: Flash Sales Engine -->
      <section class="space-y-4">
        <h4 class="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Flash Sale Engine</h4>
        <div
          class="p-8 rounded-[40px] bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 relative overflow-hidden group">
          <div
            class="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[60px] group-hover:bg-orange-500/20 transition-all">
          </div>

          <div class="relative flex items-center justify-between">
            <div class="space-y-2">
              <h3 class="text-xl font-black text-white uppercase tracking-tighter">AI-Driven Flash Sale</h3>
              <p class="text-xs text-white/40 font-medium max-w-[300px]">Triggers a high-urgency countdown with special
                discounts when chat engagement spikes.</p>
            </div>

            <div class="flex flex-col items-center gap-4">
              <div v-if="isFlashSaleActive" class="flex flex-col items-center gap-2">
                <div class="text-3xl font-mono font-black text-orange-500 animate-pulse">{{ flashTimeLeft }}</div>
                <button @click="stopFlashSale"
                  class="px-8 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">
                  Stop Sale
                </button>
              </div>
              <button v-else @click="startFlashSale"
                class="px-10 py-5 bg-orange-500 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all">
                Trigger Sale
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="p-6 text-center border-t border-white/5 bg-white/[0.02]">
        <p class="text-[10px] text-white/20 font-bold uppercase tracking-widest">Connect your Shopify or WooCommerce
          store in global settings</p>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Close, Shopping, Lightning, Flashlamp, ShoppingCart, Share, PreviewOpen, DeleteOne as Trash, Check, Ranking } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { useUIStore } from '@/stores/ui';
import { toast } from 'vue-sonner';

const props = defineProps<{
  modelValue: boolean;
}>();

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const emit = defineEmits(['update:modelValue']);

const studioStore = useStudioStore();
const uiStore = useUIStore();
const isLive = ref(false);
const activeTab = ref('products');
const flashTimer = ref<any>(null);
const flashTimeLeft = ref('00:00');

const updateFlashTimer = () => {
  if (!studioStore.activeFlashSale) return;
  const now = Date.now();
  const expires = new Date(studioStore.activeFlashSale.expiresAt).getTime();
  const diff = expires - now;
  if (diff <= 0) {
    flashTimeLeft.value = '00:00';
    return;
  }
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  flashTimeLeft.value = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const shopUrl = computed(() => `${uiStore.domain}/shop/`);
const isFlashSaleActive = computed(() => !!studioStore.activeFlashSale);
const products = computed(() => studioStore.liveProducts);

onMounted(() => {
  studioStore.fetchCommerceProducts();
  flashTimer.value = setInterval(updateFlashTimer, 1000);
  updateFlashTimer();
});

onUnmounted(() => {
  if (flashTimer.value) clearInterval(flashTimer.value);
});

const toggleProduct = (product: any) => {
  product.isActive = !product.isActive;
  if (product.isActive) {
    studioStore.showcaseProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      link: 'https://antflow.ai/shop/' + product.id
    });
    toast.info(`Showcasing ${product.name} on stream`);
  } else {
    studioStore.removeProduct(product.id);
  }
};

const startFlashSale = () => {
  studioStore.startFlashSale({
    id: 'flash_' + Date.now(),
    title: 'HOT DEAL: -30% OFF',
    discount: 0.3,
    expiresAt: new Date(Date.now() + 10 * 60000)
  });
  toast.success('Flash sale triggered! Urgency overlays active.');
};

const stopFlashSale = () => {
  studioStore.endFlashSale();
  toast.info('Flash sale ended.');
};
</script>

<style scoped lang="scss">
.product-drawer-modal {
  :deep(.el-dialog) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :deep(.el-dialog__header) {
    padding: 0;
    margin: 0;
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: rotate(90deg);
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
