<template>
    <div class="commerce-settings flex flex-col gap-8 animate-in">
        <!-- Storefront Section -->
        <section>
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">STOREFRONT_SYNC</h4>
                <button class="text-[10px] text-blue-500 font-bold flex items-center gap-1"
                    @click="$emit('trigger-flash-deal')" :class="{ 'text-red-500 animate-pulse': isFlashDeal }">
                    <fire class="mr-1" /> {{ isFlashDeal ? 'END FLASH' : 'FLASH DEAL' }}
                </button>
            </div>

            <div class="grid grid-cols-1 gap-3">
                <div v-for="p in liveProducts" :key="p.id"
                    class="product-item glass-selectable p-3 flex gap-4 items-center bg-white/5 rounded-2xl border border-white/5 transition-all"
                    :class="{ 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]': activeProductId === p.id }"
                    @click="$emit('toggle-product', p.id)">
                    <img :src="p.image" class="w-14 h-14 rounded-xl object-cover border border-white/10" />
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black uppercase tracking-tight truncate">{{ p.title }}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-lg font-black text-blue-400">{{ p.price }}</span>
                            <span v-if="isFlashDeal"
                                class="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-black">-30%</span>
                        </div>
                    </div>
                    <div class="status-dot" :class="{ active: activeProductId === p.id }"></div>
                </div>
            </div>
        </section>

        <!-- Sales Performance -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">SALES_INTELLIGENCE</h4>
            <div class="stats-grid grid grid-cols-2 gap-3">
                <div
                    class="p-4 bg-black/40 rounded-2xl border border-white/5 text-center group hover:border-blue-500/20 transition-all">
                    <div class="flex justify-center mb-2">
                        <ranking theme="outline" size="16" class="opacity-20 group-hover:text-blue-400" />
                    </div>
                    <p class="text-[8px] opacity-30 uppercase font-black mb-1">Total Orders</p>
                    <p class="text-xl font-black">{{ report?.totalOrders || 0 }}</p>
                </div>
                <div
                    class="p-4 bg-black/40 rounded-2xl border border-white/5 text-center group hover:border-green-500/20 transition-all">
                    <div class="flex justify-center mb-2">
                        <shopping-cart theme="outline" size="16" class="opacity-20 group-hover:text-green-400" />
                    </div>
                    <p class="text-[8px] opacity-30 uppercase font-black mb-1">Revenue</p>
                    <p class="text-xl font-black text-green-500">{{ report?.totalRevenue || 0 }} {{ report?.currency || 'USD' }}</p>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { useMarketplaceStore } from '@/stores/marketplace';
import { Fire, Ranking, ShoppingCart } from '@icon-park/vue-next';

const marketplaceStore = useMarketplaceStore();
const studioStore = useStudioStore();

const isFlashDeal = computed(() => !!studioStore.activeFlashSale);
const liveProducts = computed(() => marketplaceStore.products);
const activeProductId = computed(() => studioStore.activeProductId);

const report = ref<any>(null);

onMounted(async () => {
    // Fetch products from marketplace store (centralized)
    marketplaceStore.fetchProducts();

    if (studioStore.currentSessionId) {
        try {
            report.value = await studioStore.fetchCommerceReport(studioStore.currentSessionId);
        } catch (e) {
            console.warn('Commerce report fetch failed');
        }
    }
});

defineEmits(['trigger-flash-deal', 'toggle-product']);
</script>

<style scoped lang="scss">
.product-item {
    .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        transition: all 0.3s;

        &.active {
            background: #3b82f6;
            box-shadow: 0 0 10px #3b82f6;
        }
    }
}
</style>
