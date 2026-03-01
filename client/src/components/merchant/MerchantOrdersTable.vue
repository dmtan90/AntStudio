<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Broadcast, VideoFile } from '@icon-park/vue-next';

const { t } = useI18n();

defineProps<{
    orders: any[];
    loading: boolean;
}>();
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div v-if="loading" class="grid grid-cols-1 gap-4">
          <div v-for="i in 5" :key="i" class="h-24 bg-white/5 rounded-2xl animate-pulse"></div>
      </div>
      
      <div v-else class="glass-card rounded-3xl overflow-hidden border border-white/5">
         <table class="w-full text-left border-collapse">
            <thead class="bg-white/5 text-[10px] font-black uppercase text-gray-500 tracking-wider">
               <tr>
                  <th class="p-6 font-black">{{ $t('merchant.orders.table.orderId') }}</th>
                  <th class="p-6 font-black">{{ $t('merchant.orders.table.customer') }}</th>
                  <th class="p-6 font-black">{{ $t('merchant.orders.table.product') }}</th>
                  <th class="p-6 font-black">{{ $t('merchant.orders.table.amount') }}</th>
                  <th class="p-6 font-black">{{ $t('merchant.orders.table.source') }}</th>
                  <th class="p-6 font-black">{{ $t('merchant.orders.table.status') }}</th>
                  <th class="p-6 font-black text-right">{{ $t('merchant.orders.table.actions') }}</th>
               </tr>
            </thead>
            <tbody class="text-xs divide-y divide-white/5">
               <tr v-for="ord in orders" :key="ord.id" class="hover:bg-white/[0.02] transition-colors group">
                  <td class="p-6 font-mono text-gray-500 group-hover:text-blue-400 transition-colors">#{{ ord.id }}</td>
                  <td class="p-6">
                     <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-black">
                           {{ ord.customer[0] }}
                        </div>
                        <span class="font-bold">{{ ord.customer }}</span>
                     </div>
                  </td>
                  <td class="p-6 text-gray-300">{{ ord.product }}</td>
                  <td class="p-6 font-black text-white">{{ ord.amount }}</td>
                  <td class="p-6">
                     <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5">
                        <broadcast v-if="ord.source === 'live'" size="12" class="text-red-500" />
                        <video-file v-else size="12" class="text-blue-500" />
                        <span class="text-[10px] uppercase font-bold text-gray-400">{{ ord.source === 'live' ? $t('merchant.orders.sources.live') : $t('merchant.orders.sources.video') }}</span>
                     </div>
                  </td>
                  <td class="p-6">
                     <span class="status-badge" :class="ord.status_raw?.toLowerCase()">{{ t(`merchant.orders.statuses.${ord.status_raw?.toLowerCase()}`) }}</span>
                  </td>
                  <td class="p-6 text-right">
                     <button class="text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-wider">{{ $t('merchant.orders.details') }}</button>
                  </td>
               </tr>
            </tbody>
         </table>
      </div>
  </div>
</template>

<style lang="scss" scoped>
.glass-card {
   background: rgba(255, 255, 255, 0.02);
   backdrop-filter: blur(10px);
}

.status-badge {
  padding: 6px 12px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em;
  &.pending { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
  &.processing { background: rgba(168, 85, 247, 0.1); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.2); }
  &.shipped { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
  &.delivered { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
  &.cancelled { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
}
</style>
