<template>
  <div class="gameshow-overlay absolute inset-0 pointer-events-none">
    <!-- Prize Pool (Top Right) -->
    <div class="absolute top-8 right-8 pointer-events-auto">
       <div class="flex flex-col items-center gap-2 rounded-2xl border border-green-500/30 bg-black/80 p-6 px-10 shadow-[0_0_50px_rgba(34,197,94,0.3)] backdrop-blur-3xl">
          <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Total Prize Pool</span>
          <span class="text-4xl font-black text-green-400 tabular-nums animate-pulse">${{ data.prize.toLocaleString() }}</span>
          <div class="h-1 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
             <div class="h-full bg-green-500 transition-all duration-1000" :style="{ width: `${(data.timer / 30) * 100}%` }"></div>
          </div>
       </div>
    </div>

    <!-- Leaderboard (Right Sidebar) -->
    <div class="absolute top-40 right-8 w-80 pointer-events-auto rounded-[2rem] border border-white/5 bg-[#0a0a0f]/80 p-8 shadow-2xl backdrop-blur-3xl">
       <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Current Leaderboard</h3>
       <div class="space-y-4">
          <div v-for="(player, i) in (data.players as any[])" :key="player.name" class="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
             <span class="text-xs font-black" :class="Number(i) === 0 ? 'text-yellow-500' : 'text-white/30'">#{{ Number(i) + 1 }}</span>
             <span class="flex-1 text-xs font-bold text-white">{{ player.name }}</span>
             <span class="text-xs font-black text-green-500">{{ player.score }} pts</span>
          </div>
          <p v-if="data.players.length === 0" class="text-xs italic text-white/20 text-center">Waiting for players...</p>
       </div>
    </div>

    <!-- Active Question (Bottom Center) -->
    <div class="absolute bottom-8 inset-x-32 pointer-events-auto">
       <div class="flex flex-col items-center gap-8 rounded-[3rem] border-t border-white/10 bg-gradient-to-b from-[#1a1a1c]/80 to-black/90 p-12 shadow-2xl backdrop-blur-3xl">
          <div class="flex flex-col items-center">
             <span class="text-[10px] font-black uppercase tracking-[0.4em] text-green-500 mb-4">Question</span>
             <h2 class="text-3xl font-black text-white text-center leading-tight">{{ data.currentQuestion }}</h2>
          </div>
          <div class="grid grid-cols-2 gap-4 w-full max-w-2xl">
               <button v-for="opt in ['A', 'B', 'C', 'D']" :key="opt" class="h-16 rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase tracking-widest active:scale-95">
                  Option {{ opt }}
               </button>
          </div>
       </div>
    </div>

    <!-- AI Survey (Bottom Left) -->
    <div class="absolute bottom-8 left-8 pointer-events-auto">
       <div class="flex items-center gap-6 rounded-3xl border border-white/5 bg-[#0a0a0f]/80 p-6 px-10 shadow-2xl backdrop-blur-3xl">
          <div class="h-16 w-16 flex items-center justify-center rounded-2xl bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
             <svg viewBox="0 0 24 24" class="h-8 w-8"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm3.3-6.2l-1.4 1.4c-.6.6-1.9 1.8-1.9 3.8h-2c0-2.5 1-3.5 2.1-4.6l1.2-1.2c.4-.4.6-.9.6-1.5 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.2 1.8-4 4-4s4 1.8 4 4c0 .9-.3 1.7-.7 2.3z"/></svg>
          </div>
          <div>
             <h4 class="text-xs font-black uppercase tracking-widest text-white">AI Audience Survey</h4>
             <p class="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">Chat Sentiment: <span class="text-green-500">EXCITED</span></p>
             <div class="mt-2 text-[10px] font-black text-yellow-500">82% CORRECT RATE</div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const data = computed(() => studioStore.contextData.gameshow);
</script>

<style scoped>
@keyframes progress {
  from { width: 0; }
  to { width: 65%; }
}
.animate-progress {
  animation: progress 2s ease-out forwards;
}
</style>
