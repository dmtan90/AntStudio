<template>
  <div class="landing-hero relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- Ambient Background Blobs -->
    <div class="blob absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] animate-pulse"></div>
    <div class="blob absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] animate-pulse-slow"></div>

    <div class="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
      <!-- Left Content -->
      <div class="hero-text-content space-y-8">
        <div class="badge inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full animate-fade-in-down">
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">{{ $t('marketing.hero.badge') }}</span>
        </div>
        
        <h1 class="text-6xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter animate-fade-in" v-html="$t('marketing.hero.title')"></h1>
        
        <p class="text-xl text-gray-400 max-w-lg leading-relaxed animate-fade-in delay-100">
          {{ $t('marketing.hero.desc') }}
        </p>

        <div class="cta-group flex flex-wrap gap-4 animate-fade-in delay-200">
          <button class="primary-btn px-10 py-5 text-sm font-black rounded-2xl shadow-2xl shadow-blue-600/20" @click="$router.push('/signup')">
            {{ $t('marketing.hero.cta.start') }}
          </button>
          <button class="secondary-btn px-10 py-5 text-sm font-black rounded-2xl border border-white/10 hover:bg-white/5 backdrop-blur-xl">
            {{ $t('marketing.hero.cta.demo') }}
          </button>
        </div>

        <div class="social-proof pt-8 flex items-center gap-8 opacity-40 grayscale animate-fade-in delay-300">
          <div v-for="i in 4" :key="i" class="w-24 h-8 bg-white/20 rounded-lg"></div>
        </div>
      </div>

      <!-- Right: Interactive AI Demo -->
      <div class="hero-visual animate-float delay-150">
        <div class="glass-card p-1 rounded-[40px] border border-white/10 shadow-2xl bg-gradient-to-br from-white/10 to-transparent">
          <div class="inner-visual bg-black rounded-[36px] overflow-hidden aspect-video relative group">
            <!-- Simulated Video Playback -->
            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" alt="Demo" class="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-[20s]" />
            
            <!-- AI Prompt HUD -->
            <div class="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black to-transparent">
              <div class="prompt-box glass-card p-4 rounded-2xl border border-white/20 translate-y-4 group-hover:translate-y-0 transition-transform">
                <p class="text-[10px] font-black uppercase text-blue-400 mb-2">{{ $t('marketing.hero.demo.aiEngine') }}</p>
                <div class="flex items-center gap-4">
                  <div class="flex-1 text-sm font-medium text-white italic">{{ $t('marketing.hero.demo.prompt') }}</div>
                  <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center animate-pulse"><magic size="20" /></div>
                </div>
              </div>
            </div>

            <!-- Floating Stream Stats -->
            <div class="absolute top-6 right-6 flex flex-col gap-2">
               <div class="px-3 py-1.5 bg-red-500 rounded-lg flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-white animate-ping"></div>
                  <span class="text-[10px] font-black">{{ $t('marketing.hero.demo.live') }}</span>
               </div>
               <div class="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-2 border border-white/10">
                  <peoples size="12" />
                  <span class="text-[10px] font-black">12.4K</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll Indicator -->
    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20">
      <span class="text-[8px] font-black uppercase tracking-[0.2em]">{{ $t('marketing.hero.scroll') }}</span>
      <div class="w-[1px] h-12 bg-white animate-scroll-down"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Magic, Peoples } from '@icon-park/vue-next'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const router = useRouter()
</script>

<style lang="scss" scoped>
.landing-hero {
  background: #030303;
}

.animate-pulse-slow {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes scroll-down {
  0% { transform: scaleY(0); transform-origin: top; }
  50% { transform: scaleY(1); transform-origin: top; }
  51% { transform: scaleY(1); transform-origin: bottom; }
  100% { transform: scaleY(0); transform-origin: bottom; }
}

.animate-scroll-down {
  animation: scroll-down 2s infinite;
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.delay-100 { animation-delay: 100ms; }
.delay-150 { animation-delay: 150ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
</style>
