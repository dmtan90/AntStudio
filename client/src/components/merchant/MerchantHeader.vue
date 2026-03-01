<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useMarketplaceStore } from '@/stores/marketplace';

const { t } = useI18n();
const marketplaceStore = useMarketplaceStore();
</script>

<template>
  <header class="relative py-20 px-8 overflow-hidden border-b border-white/5">
    <div class="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent pointer-events-none"></div>
    
    <!-- Ambient Glows -->
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
    <div class="absolute top-1/2 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] animate-pulse" style="animation-delay: 1s"></div>

    <div class="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <div class="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-green-400">{{ $t('merchant.header.liveCommerce') }}</span>
        </div>
        
        <h1 class="text-6xl font-black mb-4 tracking-tighter leading-[0.9]">
          {{ $t('merchant.header.title') }} <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">{{ $t('merchant.header.hub') }}</span>
        </h1>
        <p class="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
          {{ $t('merchant.header.subtitle') }}
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="flex gap-4">
         <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm min-w-[200px]">
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ $t('merchant.header.totalRevenue') }}</div>
            <div class="text-3xl font-black text-white flex items-baseline gap-1">
               <span class="text-lg text-gray-500">{{ marketplaceStore.commerceStats.currency }}</span>
               {{ marketplaceStore.commerceStats.totalRevenue.toLocaleString() }}
            </div>
         </div>
         <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm min-w-[200px]">
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{{ $t('merchant.header.pendingOrders') }}</div>
            <div class="text-3xl font-black text-orange-400">
               {{ marketplaceStore.commerceStats.pendingOrders }}
            </div>
         </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
</style>
