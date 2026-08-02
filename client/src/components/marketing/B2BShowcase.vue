<template>
  <section class="b2b-showcase py-32 relative bg-[#05050c] overflow-hidden">
    <!-- Background Accents -->
    <div class="absolute top-1/2 left-0 w-96 h-96 bg-blue-600/10 blur-[150px] -translate-y-1/2 pointer-events-none"></div>
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 blur-[150px] pointer-events-none"></div>

    <div class="container mx-auto px-6 relative z-10">
      <!-- Section Header -->
      <header class="text-center max-w-3xl mx-auto mb-20 space-y-4">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
          {{ $t('marketing.b2b.badge') }}
        </div>
        <h3 class="text-4xl lg:text-5xl font-black text-white leading-tight">
          {{ $t('marketing.b2b.title') }}
        </h3>
        <p class="text-gray-400 text-lg leading-relaxed">
          {{ $t('marketing.b2b.desc') }}
        </p>
      </header>

      <!-- 3 Columns B2B Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Card 1: Whitelabel & Custom Branding -->
        <div class="feature-card group p-8 sm:p-10 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-blue-500/40 transition-all duration-500 relative overflow-hidden backdrop-blur-xl">
          <div class="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl group-hover:bg-blue-600/20 transition-colors"></div>
          <div class="icon-box w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
            <share-two size="28" />
          </div>
          <h4 class="text-xl font-black text-white mb-3">{{ $t('marketing.b2b.whiteLabel.title') }}</h4>
          <p class="text-gray-400 text-sm leading-relaxed mb-8">
            {{ $t('marketing.b2b.whiteLabel.desc') }}
          </p>
          <ul class="space-y-3 pt-4 border-t border-white/10">
            <li v-for="key in ['f1', 'f2', 'f3']" :key="key" class="flex items-center gap-2.5 text-xs font-bold text-gray-300">
              <check-one class="text-blue-400 shrink-0" size="16" /> <span>{{ $t(`marketing.b2b.whiteLabel.${key}`) }}</span>
            </li>
          </ul>
        </div>

        <!-- Card 2: Multi-Tenant Organization Hierarchy -->
        <div class="feature-card group p-8 sm:p-10 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-purple-500/40 transition-all duration-500 relative overflow-hidden backdrop-blur-xl">
          <div class="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl group-hover:bg-purple-600/20 transition-colors"></div>
          <div class="icon-box w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-8 group-hover:scale-110 transition-transform">
            <peoples size="28" />
          </div>
          <h4 class="text-xl font-black text-white mb-3">{{ $t('marketing.b2b.hierarchy.title') }}</h4>
          <p class="text-gray-400 text-sm leading-relaxed mb-8">
            {{ $t('marketing.b2b.hierarchy.desc') }}
          </p>
          <ul class="space-y-3 pt-4 border-t border-white/10">
            <li v-for="key in ['f1', 'f2', 'f3']" :key="key" class="flex items-center gap-2.5 text-xs font-bold text-gray-300">
              <check-one class="text-purple-400 shrink-0" size="16" /> <span>{{ $t(`marketing.b2b.hierarchy.${key}`) }}</span>
            </li>
          </ul>
        </div>

        <!-- Card 3: Centralized Credit & Resource Pools -->
        <div class="feature-card group p-8 sm:p-10 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-green-500/40 transition-all duration-500 relative overflow-hidden backdrop-blur-xl">
          <div class="absolute top-0 right-0 w-32 h-32 bg-green-600/10 blur-3xl group-hover:bg-green-600/20 transition-colors"></div>
          <div class="icon-box w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-8 group-hover:scale-110 transition-transform">
            <chart-histogram size="28" />
          </div>
          <h4 class="text-xl font-black text-white mb-3">{{ $t('marketing.b2b.pools.title') }}</h4>
          <p class="text-gray-400 text-sm leading-relaxed mb-8">
            {{ $t('marketing.b2b.pools.desc') }}
          </p>
          <ul class="space-y-3 pt-4 border-t border-white/10">
            <li v-for="key in ['f1', 'f2', 'f3']" :key="key" class="flex items-center gap-2.5 text-xs font-bold text-gray-300">
              <check-one class="text-green-400 shrink-0" size="16" /> <span>{{ $t(`marketing.b2b.pools.${key}`) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom B2B Callout Box -->
      <div class="bottom-cta mt-20 p-10 sm:p-14 rounded-[36px] bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-white/15 text-center relative overflow-hidden backdrop-blur-2xl">
        <div class="relative z-10 max-w-2xl mx-auto space-y-4">
          <h4 class="text-3xl font-black text-white">{{ $t('marketing.b2b.cta.title') }}</h4>
          <p class="text-gray-300 text-base leading-relaxed">
            {{ $t('marketing.b2b.cta.desc') }}
          </p>
          <div class="pt-4">
            <button 
              class="primary-btn px-10 py-4 text-xs font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/20 hover:scale-105 cursor-pointer transition-all"
              @click="$router.push('/register')"
            >
              {{ $t('marketing.b2b.cta.button') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ShareTwo, Peoples, ChartHistogram, CheckOne } from '@icon-park/vue-next';
import { useUIStore } from '@/stores/ui';

const uiStore = useUIStore();
</script>

<style lang="scss" scoped>
.feature-card {
  backdrop-filter: blur(20px);
}
</style>
