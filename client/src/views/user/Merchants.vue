<template>
  <div class="merchant-hub min-h-screen bg-[#0a0a0c] text-white font-outfit">
    <!-- Header Section -->
    <MerchantHeader />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-12 px-8">
      
      <!-- Tabs & Actions -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
         <div class="p-1.5 bg-white/5 rounded-2xl border border-white/5 inline-flex backdrop-blur-md">
            <button 
               v-for="tab in tabs" 
               :key="tab.id"
               @click="activeTab = tab.id"
               class="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2"
               :class="activeTab === tab.id ? 'bg-white/10 text-white shadow-lg shadow-black/20 border border-white/10' : 'text-gray-500 hover:text-gray-300'"
            >
               <component :is="tab.icon" theme="filled" size="14" :class="activeTab === tab.id ? (tab.id === 'orders' ? 'text-blue-400' : (tab.id === 'analytics' ? 'text-green-400' : 'text-purple-400')) : 'text-gray-600'" />
               {{ tab.label }}
            </button>
         </div>

         <div v-if="activeTab === 'inventory'">
            <button @click="handleAdd" class="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2 group">
               <plus theme="outline" size="18" />
               <span class="uppercase tracking-wide text-xs">{{ t('merchant.actions.addProduct') }}</span>
            </button>
         </div>
      </div>

      <!-- Content Area -->
      <div class="min-h-[400px]">
         <!-- Analytics View -->
         <MerchantAnalytics v-if="activeTab === 'analytics'" />

         <!-- Orders View -->
         <MerchantOrdersTable 
            v-if="activeTab === 'orders'" 
            :orders="orders" 
            :loading="loading" 
         />

         <!-- Inventory View -->
         <MerchantInventoryGrid 
            v-if="activeTab === 'inventory'" 
            :products="products" 
            :loading="loading"
            @edit="handleEdit"
            @delete="handleDelete"
            @create-ad="createAd"
            @preview="handlePreview"
         />
      </div>
    </main>

    <!-- Dialogs -->
    <ProductEditDialog 
      v-slot="{ save }"
      v-model="dialogVisible" 
      :product="selectedProduct" 
      @saved="fetchData"
    />

    <ProductAdDialog
      v-model="adDialogVisible"
      :product="selectedProductForAd"
    />

    <ProductPreviewDialog
      v-model="previewVisible"
      :product="selectedProductForPreview"
      @edit="handleEdit"
      @remove="handleDelete"
      @create-ad="createAd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Shopping, Plus, Cube, ChartPie } from '@icon-park/vue-next';
import { useMarketplaceStore } from '@/stores/marketplace';
import ProductEditDialog from '@/components/merchant/dialogs/ProductEditDialog.vue';
import ProductAdDialog from '@/components/merchant/dialogs/ProductAdDialog.vue';
import ProductPreviewDialog from '@/components/merchant/dialogs/ProductPreviewDialog.vue';
import { useI18n } from 'vue-i18n';

// Refactored Components
import MerchantHeader from '@/components/merchant/MerchantHeader.vue';
import MerchantOrdersTable from '@/components/merchant/MerchantOrdersTable.vue';
import MerchantInventoryGrid from '@/components/merchant/MerchantInventoryGrid.vue';
import MerchantAnalytics from '@/components/merchant/MerchantAnalytics.vue';

import { ElMessageBox } from 'element-plus';

const { t } = useI18n()
const marketplaceStore = useMarketplaceStore();

const activeTab = ref('inventory');
const tabs = computed(() => [
   { id: 'inventory', label: t('merchant.tabs.inventory'), icon: Cube },
   { id: 'orders', label: t('merchant.tabs.orders'), icon: Shopping },
   { id: 'analytics', label: t('merchant.tabs.analytics'), icon: ChartPie },
]);

const loading = ref(true);
const orders = ref<any[]>([]);
const products = computed(() => marketplaceStore.products);

const dialogVisible = ref(false);
const selectedProduct = ref<any>(null);

const adDialogVisible = ref(false);
const selectedProductForAd = ref<any>(null);

const previewVisible = ref(false);
const selectedProductForPreview = ref<any>(null);

const fetchData = async () => {
    loading.value = true;
    try {
        await marketplaceStore.fetchCommerceStats();
        if (activeTab.value === 'orders') {
            const data = await marketplaceStore.fetchOrders();
            orders.value = data.map((o: any) => ({
                id: o._id.substring(o._id.length - 6),
                customer: o.customerName,
                product: o.productName,
                amount: `${o.currency} ${o.amount}`,
                source: o.source,
                status_raw: o.status,
                status: t(`merchant.orders.statuses.${o.status?.toLowerCase()}`)
            }));
        } else if (activeTab.value === 'inventory') {
            await marketplaceStore.fetchProducts();
        }
    } catch (e) {
        console.error("Failed to load data", e);
    } finally {
        loading.value = false;
    }
};

watch(activeTab, (newTab) => {
    if (newTab !== 'analytics') {
        fetchData();
    }
});

onMounted(fetchData);

const handleAdd = () => {
  selectedProduct.value = null;
  dialogVisible.value = true;
};

const handleEdit = (p: any) => {
  selectedProduct.value = p;
  dialogVisible.value = true;
};

const handleDelete = async (p: any) => {
  try {
    await ElMessageBox.confirm(
      t('merchant.confirmDelete.message', { name: p.name }),
      t('merchant.confirmDelete.title'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        customClass: 'glass-message-box'
      }
    );
    await marketplaceStore.deleteProduct(p._id || p.id);
    await fetchData();
  } catch (e) {
    // Cancelled or error
  }
};

const createAd = (p: any) => {
  selectedProductForAd.value = p;
  adDialogVisible.value = true;
};

const handlePreview = (p: any) => {
  selectedProductForPreview.value = p;
  previewVisible.value = true;
};
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
