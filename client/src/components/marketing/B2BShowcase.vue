<template>
  <section class="b2b-showcase py-32 relative bg-[#050505]">
    <div class="container mx-auto px-6">
      <header class="text-center max-w-3xl mx-auto mb-20 space-y-4">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">{{ $t('marketing.b2b.title') }}</h2>
        <h3 class="text-4xl lg:text-5xl font-black text-white leading-tight">{{ $t('marketing.b2b.subtitle') }}</h3>
        <p class="text-gray-400 text-lg">{{ $t('marketing.b2b.desc', { appName: uiStore.appName }) }}</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Card 1: Whitelabel -->
        <div class="feature-card group p-10 rounded-[32px] bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl group-hover:bg-blue-600/20 transition-colors"></div>
          <div class="icon-box w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
            <share-two size="32" />
          </div>
          <h4 class="text-xl font-black text-white mb-4">{{ $t('marketing.b2b.whiteLabel.title') }}</h4>
          <p class="text-gray-500 text-sm leading-relaxed mb-8">{{ $t('marketing.b2b.whiteLabel.desc') }}</p>
          <ul class="space-y-3">
            <li v-for="item in ['domains', 'smtp', 'css']" :key="item" class="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <check-one class="text-blue-500" /> {{ $t(`marketing.b2b.whiteLabel.features.${item}`) }}
            </li>
          </ul>
        </div>

        <!-- Card 2: Multi-Tier -->
        <div class="feature-card group p-10 rounded-[32px] bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl group-hover:bg-purple-600/20 transition-colors"></div>
          <div class="icon-box w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-8 group-hover:scale-110 transition-transform">
            <peoples size="32" />
          </div>
          <h4 class="text-xl font-black text-white mb-4">{{ $t('marketing.b2b.hierarchy.title') }}</h4>
          <p class="text-gray-500 text-sm leading-relaxed mb-8">{{ $t('marketing.b2b.hierarchy.desc') }}</p>
          <ul class="space-y-3">
            <li v-for="item in ['tenants', 'portals', 'provisioning']" :key="item" class="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <check-one class="text-purple-500" /> {{ $t(`marketing.b2b.hierarchy.features.${item}`) }}
            </li>
          </ul>
        </div>

        <!-- Card 3: organization Pools -->
        <div class="feature-card group p-10 rounded-[32px] bg-white/5 border border-white/5 hover:border-green-500/30 transition-all duration-500 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-green-600/10 blur-3xl group-hover:bg-green-600/20 transition-colors"></div>
          <div class="icon-box w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 mb-8 group-hover:scale-110 transition-transform">
            <chart-histogram size="32" />
          </div>
          <h4 class="text-xl font-black text-white mb-4">{{ $t('marketing.b2b.pools.title') }}</h4>
          <p class="text-gray-500 text-sm leading-relaxed mb-8">{{ $t('marketing.b2b.pools.desc') }}</p>
          <ul class="space-y-3">
            <li v-for="item in ['quotas', 'refill', 'auditing']" :key="item" class="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <check-one class="text-green-500" /> {{ $t(`marketing.b2b.pools.features.${item}`) }}
            </li>
          </ul>
        </div>
      </div>

      <div class="bottom-cta mt-24 p-12 rounded-[40px] bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 text-center relative overflow-hidden">
        <div class="relative z-10">
          <h4 class="text-3xl font-black text-white mb-4">{{ $t('marketing.b2b.cta.title') }}</h4>
          <p class="text-gray-400 mb-8 max-w-xl mx-auto">{{ $t('marketing.b2b.cta.desc') }}</p>
          <button class="primary-btn px-12 py-5 text-sm font-black rounded-2xl">{{ $t('marketing.b2b.cta.button') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ShareTwo, Peoples, ChartHistogram, CheckOne } from '@icon-park/vue-next';
import { useUIStore } from '@/stores/ui';
import { useI18n } from 'vue-i18n'; // Optional

const uiStore = useUIStore();
</script>

<style lang="scss" scoped>
.feature-card {
  backdrop-filter: blur(20px);
}
</style>
