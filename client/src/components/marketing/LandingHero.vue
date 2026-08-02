<template>
  <section id="overview" class="landing-hero relative min-h-screen pt-32 pb-20 flex items-center justify-center overflow-hidden bg-[#030308]">
    <!-- Ambient Background Lighting -->
    <div class="blob absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-blue-600/15 blur-[140px] animate-pulse"></div>
    <div class="blob absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-purple-600/15 blur-[140px] animate-pulse-slow"></div>
    <div class="blob absolute top-[40%] left-[30%] w-[35%] h-[35%] bg-pink-600/10 blur-[130px] animate-pulse"></div>

    <!-- Grid Lines Overlay -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

    <div class="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
      <!-- Left Hero Text (7 cols) -->
      <div class="hero-text-content space-y-8 lg:col-span-7">
        <!-- Badge -->
        <div class="badge inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-full backdrop-blur-md shadow-lg shadow-blue-500/5">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          <span class="text-[11px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400">
            {{ $t('marketing.hero.badge') }}
          </span>
        </div>
        
        <!-- Main Headline -->
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight" v-html="$t('marketing.hero.title')"></h1>
        
        <!-- Subtitle -->
        <p class="text-lg sm:text-xl text-gray-300 max-w-2xl leading-relaxed font-normal">
          {{ $t('marketing.hero.desc') }}
        </p>

        <!-- CTA Buttons -->
        <div class="cta-group flex flex-wrap gap-4 pt-2">
          <button 
            class="primary-hero-btn group px-8 py-4 text-xs font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-3 cursor-pointer"
            @click="router.push('/live/sales')"
          >
            <play theme="filled" size="16" />
            <span>{{ $t('marketing.hero.cta.start') }}</span>
            <arrow-right size="16" class="group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            class="secondary-hero-btn px-8 py-4 text-xs font-black uppercase tracking-widest rounded-2xl border border-white/15 text-white bg-white/5 hover:bg-white/10 hover:border-white/25 backdrop-blur-xl transition-all duration-300 flex items-center gap-2 cursor-pointer"
            @click="router.push('/influencer')"
          >
            <magic size="16" class="text-purple-400" />
            <span>{{ $t('marketing.hero.cta.demo') }}</span>
          </button>
        </div>

        <!-- Metric Badges / Social Proof -->
        <div class="pt-6 grid grid-cols-3 gap-6 max-w-xl border-t border-white/10">
          <div>
            <div class="text-2xl font-black text-white">24 / 7</div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{{ $t('marketing.hero.stats.nonStop') }}</div>
          </div>
          <div>
            <div class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{{ $t('marketing.hero.stats.platforms') }}</div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{{ $t('marketing.hero.stats.push') }}</div>
          </div>
          <div>
            <div class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">&lt; 50ms</div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{{ $t('marketing.hero.stats.latency') }}</div>
          </div>
        </div>
      </div>

      <!-- Right Visual Interactive Preview (5 cols) -->
      <div class="hero-visual lg:col-span-5 relative">
        <div class="glass-card p-2 rounded-[36px] border border-white/15 shadow-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl">
          <div class="inner-visual bg-[#070712] rounded-[30px] overflow-hidden aspect-[9/14] sm:aspect-[4/5] relative group border border-white/10 shadow-inner">
            
            <!-- Background Stream Mockup Image -->
            <img 
              src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
              alt="AI Streamer Studio Preview" 
              class="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000" 
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#06060c] via-black/20 to-black/40"></div>

            <!-- Top HUD Bar: Live Badge & Viewers -->
            <div class="absolute top-4 inset-x-4 flex items-center justify-between z-20">
              <div class="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-xl shadow-lg shadow-red-600/30 animate-pulse">
                <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span class="text-[10px] font-black uppercase tracking-widest text-white">{{ $t('marketing.hero.demo.live') }}</span>
              </div>

              <div class="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-white">
                <peoples size="14" class="text-blue-400" />
                <span class="text-[11px] font-black">{{ $t('marketing.hero.demo.viewers') }}</span>
              </div>
            </div>

            <!-- Product Spotlight Card Overlay (Bottom-Left) -->
            <div class="absolute bottom-24 left-4 z-20 max-w-[200px] p-3 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl shadow-2xl space-y-2 animate-bounce-slow">
              <div class="flex items-center justify-between">
                <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-wider">⚡ {{ $t('marketing.hero.demo.flashSale') }}</span>
                <span class="text-[9px] font-bold text-white/50">00:14:59</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-lg bg-white/10 overflow-hidden shrink-0 border border-white/10">
                  <img src="https://images.unsplash.com/photo-1585060544812-6b45742d762f?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80" alt="Product" class="w-full h-full object-cover" />
                </div>
                <div class="min-w-0">
                  <h5 class="text-[10px] font-black text-white truncate leading-tight">{{ $t('marketing.hero.demo.productName') }}</h5>
                  <p class="text-[11px] font-black text-yellow-400 mt-0.5">$65.98 <span class="text-[8px] text-white/40 line-through">$99.99</span></p>
                </div>
              </div>
            </div>

            <!-- Live Speech HUD Banner (Bottom) -->
            <div class="absolute bottom-4 inset-x-4 z-20 p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 backdrop-blur-xl shadow-2xl">
              <div class="flex items-center gap-2 mb-1">
                <broadcast size="14" class="text-indigo-400 animate-pulse" />
                <span class="text-[9px] font-black uppercase tracking-wider text-indigo-300">{{ $t('marketing.hero.demo.hudTitle') }}</span>
              </div>
              <p class="text-xs text-white/90 font-medium italic leading-snug line-clamp-2">
                {{ $t('marketing.hero.demo.hudText') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Play, Magic, Peoples, Broadcast, ArrowRight } from '@icon-park/vue-next';

const router = useRouter();
</script>

<style lang="scss" scoped>
.animate-pulse-slow {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce-slow {
  animation: bounce 4s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>
