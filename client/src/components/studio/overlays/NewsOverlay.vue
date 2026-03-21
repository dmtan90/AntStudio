<template>
  <div class="news-overlay absolute inset-0 pointer-events-none overflow-hidden">

    <!-- ─── TOP LEFT: LIVESTUDIO NEWS BRANDING ─── -->
    <div class="absolute top-6 left-6 z-20 pointer-events-none">
      <div class="space-y-0">
        <p class="text-3xl font-black uppercase text-white leading-none tracking-tighter">
          <span class="font-black">LIVE</span><span class="font-light opacity-60">STUDIO</span>
        </p>
        <p class="text-3xl font-black uppercase text-white leading-none tracking-tight">NEWS</p>
        <div class="mt-3 flex items-center gap-2 rounded-lg bg-red-600 w-fit px-3 py-1 shadow-lg shadow-red-500/30">
          <div class="h-2 w-2 rounded-full bg-white animate-pulse"></div>
          <span class="text-[10px] font-black uppercase tracking-wider text-white">LIVE</span>
        </div>
      </div>
    </div>

    <!-- ─── TOP RIGHT: AI FACT-CHECK WIDGET ─── -->
    <div class="absolute top-6 right-6 z-20 pointer-events-auto">
      <Transition name="fact-slide">
        <div v-if="lastFactCheck" :key="lastFactCheck.timestamp"
          class="flex items-start gap-4 rounded-2xl border bg-[#0a0d14]/90 px-5 py-4 backdrop-blur-xl shadow-2xl max-w-xs"
          :class="lastFactCheck.isAccurate ? 'border-green-500/30 shadow-green-500/10' : 'border-red-500/30 shadow-red-500/10'">
          <div class="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <svg viewBox="0 0 24 24" class="h-5 w-5 text-white/40"><path fill="currentColor" d="M12 2l4.5 18-4.5-5.5-4.5 5.5L12 2z"/></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[9px] font-black uppercase tracking-widest text-white">AI FACT-CHECK</span>
            </div>
            <div class="flex items-center gap-2 mb-1">
              <div class="h-4 w-4 rounded-full flex items-center justify-center"
                :class="lastFactCheck.isAccurate ? 'bg-green-500' : 'bg-red-500'">
                <svg viewBox="0 0 24 24" class="h-2.5 w-2.5 fill-white">
                  <path v-if="lastFactCheck.isAccurate" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  <path v-else d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
              </div>
              <span class="text-[10px] font-black uppercase" :class="lastFactCheck.isAccurate ? 'text-green-400' : 'text-red-400'">
                STATUS: {{ lastFactCheck.isAccurate ? 'VERIFIED' : 'INACCURATE' }}
              </span>
            </div>
            <p class="text-[9px] text-white/40 uppercase tracking-widest">DATA SOURCE: GLOBAL WIRE</p>
            <p class="text-[9px] font-black uppercase tracking-wide" :class="lastFactCheck.isAccurate ? 'text-green-400' : 'text-red-400'">
              CONFIDENCE: {{ (lastFactCheck.confidence * 100).toFixed(1) }}%
            </p>
          </div>
        </div>
        <!-- Idle state -->
        <div v-else class="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0d14]/80 px-4 py-3 backdrop-blur-xl">
          <div class="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-white/30"><path fill="currentColor" d="M12 2l4.5 18-4.5-5.5-4.5 5.5L12 2z"/></svg>
          </div>
          <div>
            <p class="text-[9px] font-black uppercase tracking-widest text-white">AI FACT-CHECK</p>
            <p class="text-[8px] text-white/30">Monitoring live statements...</p>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ─── BREAKING NEWS BANNER (over canvas) ─── -->
    <div class="absolute top-[44%] inset-x-[8%] z-20 pointer-events-none">
      <div class="flex items-center gap-0 overflow-hidden rounded-lg shadow-2xl">
        <div class="bg-red-600 px-4 py-2 shrink-0">
          <span class="text-sm font-black uppercase tracking-widest text-white">BREAKING NEWS</span>
        </div>
        <div class="bg-blue-900/90 backdrop-blur-sm flex-1 px-4 py-2 overflow-hidden">
          <div class="whitespace-nowrap overflow-hidden" style="text-overflow: ellipsis">
            <span class="text-sm font-bold text-white">{{ breakingNews }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── LIVE UPDATES / LOWER THIRD ─── -->
    <div class="absolute bottom-24 left-[8%] z-20 pointer-events-none w-[45%]">
      <div class="rounded-xl overflow-hidden shadow-2xl">
        <div class="bg-blue-700/90 px-4 py-1.5 backdrop-blur-sm">
          <span class="text-[10px] font-black uppercase tracking-[0.25em] text-white">LIVE UPDATES</span>
        </div>
        <div class="bg-[#0a0d20]/90 backdrop-blur-sm px-4 py-3 space-y-1">
          <div v-for="(item, i) in liveUpdates" :key="i" class="flex items-start gap-2">
            <span class="text-white/30 text-[10px] shrink-0">•</span>
            <p class="text-[10px] font-medium text-white/80">{{ item }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── ANCHOR NAME LOWER THIRD ─── -->
    <div class="absolute bottom-24 right-[8%] z-20 pointer-events-none">
      <div class="flex items-center gap-0 rounded-lg overflow-hidden shadow-2xl">
        <div class="bg-[#0a0d20]/90 backdrop-blur-sm px-4 py-2.5">
          <p class="text-sm font-black text-white">{{ anchorName }}</p>
        </div>
        <div class="bg-blue-700 px-3 py-2.5 flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-white animate-pulse"></div>
          <div>
            <p class="text-[8px] font-black uppercase text-white leading-none">NEWS</p>
            <p class="text-[8px] font-black uppercase text-white leading-none">LIVE</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── BREAKING NEWS TICKER ─── -->
    <div class="absolute bottom-10 inset-x-0 z-20 flex items-center overflow-hidden h-8 bg-[#1a0808]/90 backdrop-blur-sm pointer-events-none">
      <div class="shrink-0 bg-red-700 px-4 h-full flex items-center">
        <span class="text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap">BREAKING NEWS</span>
      </div>
      <div class="flex-1 overflow-hidden relative">
        <div class="animate-ticker whitespace-nowrap flex gap-20 text-[10px] font-bold uppercase text-white/70">
          <span v-for="i in 3" :key="i">{{ tickerText }}</span>
        </div>
      </div>
    </div>

    <!-- ─── BOTTOM PRODUCTION BAR ─── -->
    <div class="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between border-t border-white/5 bg-[#050508]/90 backdrop-blur-xl px-6 h-10 pointer-events-auto">
      <div class="flex items-center gap-4 text-[9px] font-black text-white/40">
        <span class="text-white/20">UI</span>
        <div class="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" class="h-3 w-3 text-green-500"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>
          <span class="text-white">123.19</span>
          <span class="text-green-500">98.7%</span>
        </div>
        <span class="text-white/20">Inter | SF Pro</span>
        <span>SLICK INFO</span>
        <span class="text-white/20">SR</span>
      </div>
      <div class="flex items-center gap-2 text-[9px] font-black text-white/40">
        <span class="text-white/20">{{ currentTime }}</span>
        <span>PROGRAM</span>
        <span>TICKER</span>
        <span>PRODUCTION</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();

const activeGuests = computed(() => studioStore.liveGuests || []);
const anchorName = computed(() => {
  const g = activeGuests.value[0] as any;
  return g?.persona?.identity?.name || g?.name || 'AI Anchor';
});

const lastFactCheck = computed(() => {
  const facts = studioStore.verifiedFacts || [];
  return facts[facts.length - 1] || null;
});

const breakingNews = computed(() =>
  studioStore.contextData?.news?.breaking || 'AI Technology Reaches New Milestones in Global Innovation Summit'
);

const liveUpdates = computed(() => {
  const u = studioStore.contextData?.news?.updates;
  if (u?.length) return u.slice(0, 3);
  return [
    'Markets rally as economic data shows growth',
    'Global leaders convene for climate summit',
    'Election results: new administration takes office',
  ];
});

const tickerText = computed(() => {
  const t = studioStore.contextData?.news?.ticker;
  if (t?.length) return t.join(' • ') + ' • ';
  return 'MARKETS RALLY AS ECONOMIC DATA SHOWS GROWTH • GLOBAL LEADERS CONVENE • AI TECHNOLOGY SUMMIT 2026 • ';
});

const currentTime = ref('');
let clockInterval: any;
const updateClock = () => {
  currentTime.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
onMounted(() => { updateClock(); clockInterval = setInterval(updateClock, 1000); });
onUnmounted(() => clearInterval(clockInterval));
</script>

<style scoped>
@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
.animate-ticker { animation: ticker 30s linear infinite; }

.fact-slide-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fact-slide-leave-active { transition: all 0.3s ease-in; }
.fact-slide-enter-from { transform: translateX(20px); opacity: 0; }
.fact-slide-leave-to { transform: translateX(20px); opacity: 0; }
</style>
