<template>
  <div class="merchant-hub p-6 animate-in">
    <header class="hub-header mb-8 flex justify-between items-center">
      <div>
        <div class="flex items-center gap-3 mb-1">
           <shopping theme="filled" class="text-blue-500" />
           <h1 class="text-3xl font-black text-white tracking-tight">Merchant Hub</h1>
        </div>
        <p class="text-gray-400">Track and fulfill orders from your live broadcasts.</p>
      </div>
      <div class="header-stats flex gap-8">
         <div class="stat">
            <span class="label">Total Revenue</span>
            <span class="value text-green-500">{{ marketplaceStore.commerceStats.currency }} {{ marketplaceStore.commerceStats.totalRevenue.toLocaleString() }}</span>
         </div>
         <div class="stat">
            <span class="label">Pending Orders</span>
            <span class="value text-orange-500">{{ marketplaceStore.commerceStats.pendingOrders }}</span>
         </div>
      </div>
    </header>

    <div class="orders-table-container glass-card rounded-2xl overflow-hidden border border-white/5">
       <div class="table-header p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 class="text-sm font-black uppercase tracking-widest opacity-50">Recent Orders</h3>
          <div class="filters flex gap-3">
             <el-input placeholder="Search orders..." size="small" class="glass-input w-64" />
             <el-button size="small" class="glass-btn">Export CSV</el-button>
          </div>
       </div>

       <div v-if="loading" class="p-20 text-center opacity-30">Loading your ecommerce data...</div>
       <table v-else class="w-full text-left border-collapse">
          <thead class="text-[10px] font-black uppercase opacity-30 border-b border-white/5">
             <tr>
                <th class="p-6">Order ID</th>
                <th class="p-6">Customer</th>
                <th class="p-6">Product</th>
                <th class="p-6">Amount</th>
                <th class="p-6">Origin</th>
                <th class="p-6">Status</th>
                <th class="p-6">Actions</th>
             </tr>
          </thead>
          <tbody class="text-xs">
             <tr v-for="ord in orders" :key="ord.id" class="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td class="p-6 font-mono opacity-60">#{{ ord.id }}</td>
                <td class="p-6">
                   <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-blue-500/20 text-[8px] @include flex-center flex items-center justify-center">{{ ord.customer[0] }}</div>
                      <span>{{ ord.customer }}</span>
                   </div>
                </td>
                <td class="p-6 font-bold">{{ ord.product }}</td>
                <td class="p-6 text-green-400 font-bold">{{ ord.amount }}</td>
                <td class="p-6">
                   <div class="flex items-center gap-2">
                      <broadcast v-if="ord.source === 'live'" size="12" class="text-blue-500" />
                      <video-file v-else size="12" class="text-purple-500" />
                      <span class="opacity-60">{{ ord.source === 'live' ? 'Live Stream' : 'Video' }}</span>
                   </div>
                </td>
                <td class="p-6">
                   <span class="status-badge" :class="ord.status.toLowerCase()">{{ ord.status }}</span>
                </td>
                <td class="p-6">
                   <button class="text-blue-500 hover:text-white transition-colors">Details</button>
                </td>
             </tr>
          </tbody>
       </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Shopping, Broadcast, VideoFile, More } from '@icon-park/vue-next';
import { useMarketplaceStore } from '@/stores/marketplace';

const marketplaceStore = useMarketplaceStore();

const loading = ref(true);
const orders = ref<any[]>([]);

const fetchData = async () => {
    try {
        await marketplaceStore.fetchCommerceStats();
        const data = await marketplaceStore.fetchOrders();
        orders.value = data.map((o: any) => ({
			id: o._id.substring(o._id.length - 6), // Short ID
			customer: o.customerName,
			product: o.productName,
			amount: `${o.currency} ${o.amount}`,
			source: o.source,
			status: o.status.charAt(0).toUpperCase() + o.status.slice(1)
		}));
    } catch (e) {
        console.error("Failed to load orders", e);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchData);
</script>

<style lang="scss" scoped>
.header-stats {
  .stat {
    display: flex; flex-direction: column; align-items: flex-end;
    .label { font-size: 10px; font-weight: 900; text-transform: uppercase; opacity: 0.3; letter-spacing: 0.1em; }
    .value { font-size: 24px; font-weight: 800; }
  }
}

.status-badge {
  padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase;
  &.pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  &.processing { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
  &.shipped { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
  &.delivered { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
  &.cancelled { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
}

.ordered-table {
  backdrop-filter: blur(20px);
}
</style>
