<template>
  <div class="sport-overlay absolute inset-0 pointer-events-none">
    <!-- Scoreboard (Top Left) -->
   <div class="absolute top-8 left-8 pointer-events-auto">
        <div class="flex items-center gap-px rounded-2xl overflow-hidden shadow-2xl border border-white/5">
           <div class="flex items-center gap-4 bg-black/80 p-4 px-6 backdrop-blur-2xl">
              <div class="h-10 w-10 flex items-center justify-center rounded-lg bg-red-600 text-white font-black text-xl">{{ data.homeTeam[0] }}</div>
              <span class="text-xl font-black text-white uppercase tracking-tighter">{{ data.homeTeam }}</span>
           </div>
           <div class="flex items-center justify-center bg-red-600 px-6 h-full min-w-[100px]">
              <span class="text-3xl font-black text-white tabular-nums">{{ data.homeScore }} - {{ data.awayScore }}</span>
           </div>
           <div class="flex items-center gap-4 bg-black/80 p-4 px-6 backdrop-blur-2xl">
              <span class="text-xl font-black text-white uppercase tracking-tighter">{{ data.awayTeam }}</span>
              <div class="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xl">{{ data.awayTeam[0] }}</div>
           </div>
           <div class="bg-black/60 p-4 px-6 backdrop-blur-2xl flex flex-col justify-center">
              <span class="text-xs font-black text-red-500 uppercase tracking-widest leading-none">{{ data.time }}</span>
              <span class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">{{ data.period }}</span>
           </div>
        </div>
    </div>

    <!-- Match Stats (Right Sidebar) -->
    <div class="absolute top-8 bottom-32 right-8 w-80 pointer-events-auto rounded-[2.5rem] border border-white/5 bg-[#0a0a0f]/80 p-8 shadow-2xl backdrop-blur-3xl">
       <div class="flex items-center justify-between mb-8">
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Match Insights</h3>
          <div class="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
       </div>

       <div class="space-y-8">
          <div v-for="stat in stats" :key="stat.label">
             <div class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                <span class="text-white/40">{{ stat.label }}</span>
                <span class="text-white">{{ stat.valA }} - {{ stat.valB }}</span>
             </div>
             <div class="flex h-1.5 w-full rounded-full bg-white/5 overflow-hidden gap-1">
                <div class="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" :style="{ width: `${stat.percentA}%` }"></div>
                <div class="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" :style="{ width: `${100 - stat.percentA}%` }"></div>
             </div>
          </div>
       </div>

       <div class="mt-12 space-y-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-white/20">Key Events</p>
          <div v-for="event in events" :key="event.time" class="flex gap-4 items-start">
             <span class="text-xs font-black text-red-500 tabular-nums">{{ event.time }}'</span>
             <div>
                <p class="text-xs font-bold text-white leading-tight">{{ event.desc }}</p>
                <p class="text-[10px] text-white/30 uppercase font-black">{{ event.player }}</p>
             </div>
          </div>
       </div>
    </div>

    <!-- Tactics Analyst (Bottom Left) -->
    <div class="absolute bottom-8 left-8 pointer-events-auto">
       <div class="flex items-center gap-6 rounded-3xl border border-white/5 bg-[#0a0a0f]/80 p-6 px-10 shadow-2xl backdrop-blur-3xl overflow-hidden relative">
          <div class="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
          <div class="h-16 w-16 border-2 border-white/10 rounded-xl relative flex items-center justify-center p-2">
             <div class="absolute inset-2 border border-white/5 rounded-full"></div>
             <div class="h-full w-px bg-white/10 absolute left-1/2 -translate-x-1/2"></div>
             <div v-for="i in 5" :key="i" class="h-1.5 w-1.5 rounded-full bg-red-500 absolute" :style="{ top: `${Math.random()*80}%`, left: `${Math.random()*40}%` }"></div>
          </div>
          <div class="flex flex-col">
             <h4 class="text-sm font-black uppercase tracking-widest text-white">Tactics Analyst</h4>
             <p class="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">AI Formation Tracking: <span class="text-green-500">OPTIMAL</span></p>
             <div class="mt-2 flex items-center gap-4">
                <div class="flex items-center gap-2">
                   <span class="text-[10px] font-black text-red-500">POSSESSION:</span>
                   <span class="text-[10px] font-black text-white">54%</span>
                </div>
                <div class="flex items-center gap-2">
                   <span class="text-[10px] font-black text-red-500">XG:</span>
                   <span class="text-[10px] font-black text-white">2.44</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const data = computed(() => studioStore.contextData.sport);

const stats = computed(() => [
  { label: 'Possession', valA: `${data.value.possessionA}%`, valB: `${100 - data.value.possessionA}%`, percentA: data.value.possessionA },
  { label: 'Shots on Target', valA: data.value.shotsOnTargetA, valB: data.value.shotsOnTargetB, percentA: (data.value.shotsOnTargetA / (data.value.shotsOnTargetA + data.value.shotsOnTargetB)) * 100 },
  { label: 'Pass Accuracy', valA: '88%', valB: '82%', percentA: 52 },
]);

const events = [
  { time: '74', desc: 'Goal scored (Header)', player: 'M. VARANE' },
  { time: '62', desc: 'Yellow Card', player: 'K. DE BRUYNE' },
  { time: '41', desc: 'Goal scored (Long Range)', player: 'M. VARANE' },
];
</script>
