<script setup lang="ts">
import { useStudioStore } from '@/stores/studio';
import { useUIStore } from '@/stores/ui';
import { ShoppingCart, Shopping } from '@icon-park/vue-next';
import { computed } from 'vue';

const studioStore = useStudioStore();
const uiStore = useUIStore();
const activeProduct = computed(() => {
    return studioStore.liveProducts.find(p => p.id === studioStore.activeProductId || p._id === studioStore.activeProductId);
});

const landingPageUrl = computed(() => {
    if (!activeProduct.value) return '';
    const id = activeProduct.value._id || activeProduct.value.id;
    return uiStore.getProductLandingLink(id);
});

const buyNow = () => {
    if (landingPageUrl.value) {
        window.open(landingPageUrl.value, '_blank');
    } else if (activeProduct.value?.link) {
        window.open(activeProduct.value.link, '_blank');
    }
};
</script>

<template>
    <Transition name="slide-up">
        <div v-if="activeProduct" class="absolute bottom-6 left-6 z-50 pointer-events-auto">
            <div class="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-orange-500/30 rounded-3xl p-4 flex items-center gap-5 shadow-[0_0_50px_rgba(249,115,22,0.1)] group">
                <!-- Product Image -->
                 <div class="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black flex-shrink-0">
                    <img :src="activeProduct.image" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div class="absolute bottom-2 left-2 px-1.5 py-0.5 bg-orange-500 rounded-md text-[8px] font-black text-white uppercase tracking-widest">Live Now</div>
                 </div>

                 <!-- Content -->
                 <div class="flex-1 min-w-[140px]">
                    <h3 class="text-xs font-black text-white uppercase tracking-tight mb-1">{{ activeProduct.name }}</h3>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-lg font-black text-orange-400 leading-none">${{ activeProduct.price }}</span>
                        <span v-if="studioStore.activeFlashSale" class="text-[9px] line-through text-white/20 font-bold">${{ Math.round(activeProduct.price * 1.3) }}</span>
                    </div>

                    <!-- Scarcity / Stock info -->
                    <div v-if="activeProduct.stock !== undefined" class="mb-3">
                        <div class="flex items-center gap-1.5">
                            <div class="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                <div class="h-full bg-orange-500 rounded-full" :style="{ width: Math.min(100, (activeProduct.stock / 20) * 100) + '%' }"></div>
                            </div>
                            <span class="text-[9px] font-black" :class="activeProduct.stock < 5 ? 'text-red-500 animate-pulse' : 'text-orange-400'">
                                {{ activeProduct.stock }} LEFT
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                         <el-button type="primary" size="small" class="!bg-orange-500 !border-none !h-7 !px-4 !rounded-xl !text-[9px] font-black uppercase tracking-widest" @click="buyNow">
                            <shopping-cart theme="outline" size="12" class="mr-1.5" /> Buy Now
                         </el-button>
                    </div>
                 </div>

                  <!-- QR Code Generator -->
                  <div class="w-16 h-16 bg-white p-1 rounded-xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform flex-shrink-0 ml-2 cursor-pointer" @click="buyNow">
                     <img :src="QRCodeGenerator.getProductQR(landingPageUrl)" class="w-full h-full" />
                  </div>

                 <!-- Close Tag -->
                 <div class="absolute -top-2 -right-2 bg-orange-500 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg cursor-pointer" @click="studioStore.removeProduct(activeProduct.id)">
                    ×
                 </div>
            </div>
        </div>
    </Transition>
</template>

<script lang="ts">
import { QRCodeGenerator } from '@/utils/ai/QRCodeGenerator';
export default {
    setup() {
        return { QRCodeGenerator };
    }
}
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from { opacity: 0; transform: translateY(20px) scale(0.9); }
.slide-up-leave-to { opacity: 0; transform: translateY(20px) scale(0.9); }
</style>
