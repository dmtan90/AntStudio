<template>
  <div class="game-overlay absolute inset-0 pointer-events-none overflow-hidden" style="font-family: 'Courier New', monospace">

    <!-- ─── TOP HEADER BAR ─── -->
    <div class="absolute top-0 inset-x-0 z-20 pointer-events-auto">
      <div class="flex items-center justify-between px-6 py-3 bg-[#050a05]/90 backdrop-blur-xl border-b border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
        <!-- Logo + Stream Info -->
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 rounded-md bg-green-500/20 border border-green-500/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-green-400"><path fill="currentColor" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            </div>
            <span class="text-sm font-black uppercase tracking-widest text-green-400">LIVESTUDIO</span>
          </div>
          <div class="flex items-center gap-1.5 text-[10px] font-black text-green-400/60 uppercase tracking-widest">
            <div class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span>STREAMING NOW</span>
          </div>
          <span class="text-[10px] font-bold text-white/40 uppercase">VIEWERS: <span class="text-white">{{ viewers }}</span></span>
          <span class="text-[10px] font-bold text-white/40 uppercase">BITRATE: <span class="text-white">{{ bitrate }}</span></span>
          <span class="text-[10px] font-bold text-white/40 uppercase">LATENCY: <span class="text-green-400">{{ latency }}</span></span>
        </div>
        <!-- Recording badge + player -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5">
            <div class="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
            <span class="text-[10px] font-black uppercase tracking-widest text-red-400">RECORDING</span>
          </div>
          <span class="text-[10px] font-bold text-white/40 border border-white/10 rounded px-2 py-1 uppercase">{{ playerName }}</span>
        </div>
      </div>
    </div>

    <!-- ─── GAME TITLE LABEL ─── -->
    <div class="absolute top-14 left-5 z-20 pointer-events-none">
      <div class="flex items-center gap-2 mb-1">
        <div class="h-5 w-5 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" class="h-3 w-3 text-green-400"><path fill="currentColor" d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
        </div>
        <p class="text-base font-black uppercase tracking-tight text-white">{{ gameTitle }}</p>
      </div>
      <p class="text-[10px] text-white/40 font-medium">Game: {{ gameName }}</p>
    </div>

    <!-- ─── LEFT: CHAT PANEL ─── -->
    <div class="absolute top-24 left-5 bottom-12 w-52 z-20 pointer-events-auto">
      <div class="rounded-2xl border border-green-500/20 bg-[#050a05]/80 backdrop-blur-xl overflow-hidden h-full flex flex-col shadow-[0_0_20px_rgba(34,197,94,0.1)]">
        <div class="px-4 py-2 border-b border-green-500/10">
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-green-400">CHAT</span>
        </div>
        <div class="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-hide">
          <div v-for="msg in chatMessages" :key="msg.id" class="flex gap-2">
            <div class="h-5 w-5 shrink-0 rounded flex items-center justify-center text-[8px] font-black"
              :style="`background:${msg.color}20; color:${msg.color}`">
              {{ msg.name?.[0] }}
            </div>
            <div>
              <p class="text-[9px] font-black" :style="`color:${msg.color}`">{{ msg.name }}</p>
              <p class="text-[9px] text-white/70 leading-snug">{{ msg.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── RIGHT: LIVE ANALYST PANEL ─── -->
    <div class="absolute top-14 right-5 bottom-12 w-56 z-20 pointer-events-auto">
      <div class="rounded-2xl border border-green-500/30 bg-[#050a05]/90 backdrop-blur-xl overflow-hidden flex flex-col shadow-[0_0_25px_rgba(34,197,94,0.15)]">
        <div class="px-4 py-2.5 border-b border-green-500/20 flex items-center gap-2">
          <div class="h-5 w-5 rounded bg-green-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-3 w-3 text-green-400"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-green-400">LIVE ANALYST</span>
        </div>
        <div class="p-4 space-y-3">
          <!-- Game Stats -->
          <div class="space-y-1.5 text-[9px] font-bold uppercase">
            <div class="flex justify-between">
              <span class="text-white/40">GAME:</span>
              <span class="text-white">{{ gameName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/40">PLAYER:</span>
              <span class="text-green-400">{{ playerName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/40">STATUS:</span>
              <span class="text-green-400">ACTIVE</span>
            </div>
            <div class="flex justify-between">
              <span class="text-white/40">MOMENTUM:</span>
              <span class="text-yellow-400">PEAK</span>
            </div>
          </div>
          <!-- Mini Graph -->
          <div class="h-12 flex items-end gap-0.5 border-b border-white/5 pb-1">
            <div v-for="i in 20" :key="i"
              class="flex-1 rounded-t"
              :style="`height:${20 + Math.sin(i * 0.8) * 40 + Math.random() * 20}%; background: rgba(34,197,94,${0.3 + i/40})`">
            </div>
          </div>
          <!-- Clutch Alert -->
          <div class="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
            <div class="flex items-center gap-2 mb-1.5">
              <div class="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"></div>
              <span class="text-[9px] font-black uppercase tracking-widest text-yellow-400">CLUTCH ALERT</span>
            </div>
            <p class="text-[9px] text-yellow-300/80">{{ clutchAlert }}</p>
          </div>
          <!-- Recent Actions -->
          <div>
            <p class="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1.5">RECENT ACTIONS</p>
            <div class="space-y-1">
              <div v-for="action in recentActions" :key="action"
                class="text-[9px] text-white/60 flex items-center gap-1.5">
                <span class="text-green-500">›</span>{{ action }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── BOTTOM STATS BAR ─── -->
    <div class="absolute bottom-0 inset-x-0 z-20 pointer-events-none">
      <div class="flex items-center justify-between px-6 py-2 bg-[#050a05]/90 backdrop-blur-xl border-t border-green-500/20">
        <div class="flex items-center gap-6 text-[9px] font-black uppercase text-white/40">
          <div class="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" class="h-3 w-3"><path fill="currentColor" d="M3 3h18v2H3V3zm0 8h18v2H3v-2zm0 8h18v2H3v-2z"/></svg>
            <span>VIEWERS: <span class="text-green-400">{{ viewers }}</span></span>
          </div>
          <span>BITRATE: <span class="text-white">{{ bitrate }}</span></span>
          <span>LATENCY: <span class="text-green-400">{{ latency }}</span></span>
        </div>
        <div class="flex items-center gap-3 text-[9px] font-black uppercase text-white/30">
          <button class="p-1.5 rounded border border-white/10 hover:border-green-500/40 hover:text-green-400 transition-colors pointer-events-auto">
            <svg viewBox="0 0 24 24" class="h-3 w-3"><path fill="currentColor" d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>
          <button class="p-1.5 rounded border border-white/10 hover:border-green-500/40 hover:text-green-400 transition-colors pointer-events-auto">
            <svg viewBox="0 0 24 24" class="h-3 w-3"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();

const gameName = computed(() => studioStore.contextData?.game_streaming?.game || 'Valorant');
const gameTitle = computed(() => studioStore.contextData?.game_streaming?.title || 'Game Streaming');
const playerName = computed(() => {
  const g = studioStore.liveGuests?.[0];
  return g?.name || 'Shadow_Striker';
});
const viewers = computed(() => {
  const v = studioStore.viewerCount || 12800;
  return v > 1000 ? `${(v/1000).toFixed(1)}K` : `${v}`;
});
const bitrate = computed(() => studioStore.contextData?.game_streaming?.bitrate || '8400 Kbps');
const latency = computed(() => studioStore.contextData?.game_streaming?.latency || '12ms');

const clutchAlert = computed(() =>
  studioStore.contextData?.game_streaming?.clutchAlert || 'T vs 2 Situation (65% Probability)'
);
const recentActions = computed(() =>
  studioStore.contextData?.game_streaming?.recentActions || ['KILLS (2)', 'PLANT DEPLOYED']
);

const chatMessages = computed(() => {
  const sample = [
    { id:1, name:'clan1', text:'GOATs!', color:'#22c55e' },
    { id:2, name:'user2', text:'pogchamp!', color:'#a855f7' },
    { id:3, name:'angrijess', text:'Nice play!', color:'#f97316' },
    { id:4, name:'klujo', text:'Clutch incoming!', color:'#06b6d4' },
    { id:5, name:'user5', text:'ABM monitor is crazy!', color:'#22c55e' },
  ];
  return sample;
});
</script>

<style scoped>
.game-overlay { background: transparent; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
