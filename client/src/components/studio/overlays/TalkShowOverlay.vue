<template>
  <div class="talkshow-overlay absolute inset-0 pointer-events-none overflow-hidden">

    <!-- ─── TOP STATUS BAR ─── -->
    <div class="absolute top-6 inset-x-6 flex items-center justify-between pointer-events-auto z-20">
      <!-- LiveStudio Logo + Session Info -->
      <div class="flex items-center gap-6 rounded-2xl border border-cyan-500/20 bg-[#0a0d14]/80 px-6 py-3 backdrop-blur-xl shadow-xl">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-cyan-400"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          </div>
          <div>
            <p class="text-[8px] font-black uppercase tracking-[0.25em] text-white/30 leading-none">LIVESTUDIO</p>
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-none">BROADCAST</p>
          </div>
        </div>
        <div class="h-6 w-px bg-white/10"></div>
        <div>
          <p class="text-[8px] font-black uppercase tracking-[0.25em] text-white/30">SESSION</p>
          <p class="text-[11px] font-black uppercase tracking-tight text-white">{{ sessionTitle }}</p>
        </div>
        <div class="h-6 w-px bg-white/10"></div>
        <div class="flex items-center gap-1.5">
          <div class="flex gap-0.5 items-end h-3">
            <div v-for="i in 4" :key="i" class="w-1 bg-cyan-400 rounded-full" :style="`height:${25*i}%`"></div>
          </div>
          <span class="text-[10px] font-black text-white">STABLE</span>
        </div>
        <div class="h-6 w-px bg-white/10"></div>
        <div class="text-right">
          <p class="text-[8px] font-black uppercase tracking-widest text-white/30">VIEWERS</p>
          <p class="text-sm font-black text-white">{{ viewers }}</p>
        </div>
      </div>

      <!-- Clock -->
      <div class="text-right">
        <p class="text-lg font-black text-white tabular-nums">{{ currentTime }}</p>
        <p class="text-[9px] font-black uppercase tracking-widest text-white/30">{{ currentDate }}</p>
      </div>
    </div>

    <!-- ─── GUEST LABELS (Over Canvas) ─── -->
    <!-- Host label: bottom-left of left half -->
    <div class="absolute z-20 bottom-[calc(50%-15px)] left-[5%] pointer-events-none">
      <div class="bg-[#0a0d14]/80 border-l-4 border-cyan-400 backdrop-blur-md px-4 py-2 inline-flex items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></div>
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">ON AIR · HOST</span>
          </div>
          <p class="text-base font-black uppercase tracking-tighter text-white">{{ hostName }}</p>
          <p class="text-[10px] font-medium text-white/40">{{ hostRole }}</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-black text-white/30 uppercase">HD</span>
        </div>
      </div>
    </div>
    <!-- LEVEL bar below host label -->
    <div class="absolute z-20 bottom-[calc(50%-35px)] left-[5%] flex items-center gap-1 pointer-events-none">
      <span class="text-[8px] font-black uppercase tracking-widest text-white/30">LEVEL</span>
      <div class="flex gap-0.5 items-end h-3 ml-1">
        <div v-for="i in 16" :key="i"
          class="w-1.5 rounded-sm transition-all duration-150"
          :class="i <= audioBarLevel ? 'bg-cyan-400' : 'bg-white/10'"
          :style="`height: ${(i/16)*100}%`"></div>
      </div>
    </div>

    <!-- Guest label: bottom-left of right half -->
    <div class="absolute z-20 bottom-[calc(50%-15px)] left-[53%] pointer-events-none">
      <div class="bg-[#0a0d14]/80 border-l-4 border-blue-400 backdrop-blur-md px-4 py-2 inline-flex items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">LIVE · GUEST</span>
          </div>
          <p class="text-base font-black uppercase tracking-tighter text-white">{{ guestName }}</p>
          <p class="text-[10px] font-medium text-white/40">{{ guestRole }}</p>
        </div>
        <div>
          <span class="text-[10px] font-black text-white/30 uppercase">HD</span>
        </div>
      </div>
    </div>
    <!-- LEVEL bar below guest label -->
    <div class="absolute z-20 bottom-[calc(50%-35px)] left-[53%] flex items-center gap-1 pointer-events-none">
      <span class="text-[8px] font-black uppercase tracking-widest text-white/30">LEVEL</span>
      <div class="flex gap-0.5 items-end h-3 ml-1">
        <div v-for="i in 16" :key="i"
          class="w-1.5 rounded-sm transition-all duration-150"
          :class="i <= guestBarLevel ? 'bg-blue-400' : 'bg-white/10'"
          :style="`height: ${(i/16)*100}%`"></div>
      </div>
    </div>

    <!-- ─── BOTTOM PANEL ─── -->
    <div class="absolute bottom-6 inset-x-6 flex items-start gap-4 pointer-events-auto z-20">
      <!-- Left Controls Rail -->
      <div class="flex flex-col items-center gap-2 shrink-0">
        <button class="ctrl-btn ctrl-rec">
          <div class="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span>REC</span>
        </button>
        <button class="ctrl-btn ctrl-live">
          <span class="text-[9px] font-black tabular-nums">{{ liveTime }}</span>
          <span>LIVE</span>
        </button>
        <button class="ctrl-btn">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>
          <span>MUTE</span>
        </button>
        <button class="ctrl-btn">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          <span>CAM 1/2</span>
        </button>
        <button class="ctrl-btn">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          <span>AUDIO MIX</span>
        </button>
        <button class="ctrl-btn ctrl-ai">
          <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          <span>AI ASSIST</span>
        </button>
      </div>

      <!-- Script Feed Panel -->
      <div class="flex-1 rounded-[1.5rem] border border-white/5 bg-[#0a0d14]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <span class="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">SCRIPT FEED</span>
          <svg viewBox="0 0 24 24" class="h-4 w-4 text-white/20"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-32 overflow-y-auto scrollbar-hide">
          <div v-for="(line, idx) in scriptLines" :key="idx" class="text-sm leading-relaxed">
            <span class="font-black text-cyan-400 uppercase mr-2">{{ line.speaker }}:</span>
            <span class="text-white/80">{{ line.text }}</span>
            <span v-if="line.isAI" class="ml-2 text-[9px] font-black text-cyan-500/60 uppercase">(AI Script)</span>
          </div>
          <p v-if="scriptLines.length === 0" class="text-sm italic text-white/20">Listening for AI dialogue...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();

const sessionTitle = computed(() => studioStore.contextData?.talkshow?.sessionTitle || 'AI & Future Tech');
const viewers = computed(() => {
  const v = studioStore.viewerCount || 0;
  return v > 1000 ? `${(v/1000).toFixed(1)}K` : `${v}`;
});

const activeGuests = computed(() => studioStore.liveGuests || []);
const hostName = computed(() => {
  const g = activeGuests.value[0] as any;
  return g?.persona?.identity?.name || g?.name || 'AI Host';
});
const hostRole = computed(() => {
  const g = activeGuests.value[0] as any;
  return g?.persona?.identity?.role || 'Host';
});
const guestName = computed(() => {
  const g = activeGuests.value[1] as any;
  return g?.persona?.identity?.name || g?.name || 'AI Guest';
});
const guestRole = computed(() => {
  const g = activeGuests.value[1] as any;
  return g?.persona?.identity?.role || 'Guest';
});

const audioBarLevel = computed(() => Math.floor(0.4 * 16));
const guestBarLevel = computed(() => Math.floor(Math.random() * 8 + 4));

const scriptLines = computed(() => {
  const history: any[] = [];
  return history.slice(-4).map((m: any) => ({
    speaker: m.role === 'assistant' ? (hostName.value.split(' ')[0]) : 'KENJI',
    text: m.content?.slice(0, 120) || '',
    isAI: true,
  }));
});

const currentTime = ref('');
const currentDate = ref('');
const liveTime = ref('00:00');
let clockInterval: any;

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  currentDate.value = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const s = 0;
  liveTime.value = `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
};

onMounted(() => { updateClock(); clockInterval = setInterval(updateClock, 1000); });
onUnmounted(() => clearInterval(clockInterval));
</script>

<style scoped>
.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 4rem;
  border-radius: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;
  padding: 0.625rem 0;
  border: 1px solid transparent;
}
.ctrl-btn span { 
  font-size: 8px; 
  font-weight: 900; 
  text-transform: uppercase; 
  letter-spacing: 0.1em; 
}
.ctrl-rec { 
  background: rgba(239, 68, 68, 0.1); 
  color: #f87171; 
  border-color: rgba(239, 68, 68, 0.2); 
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.2); 
}
.ctrl-live { 
  background: rgba(34, 197, 94, 0.1); 
  color: #4ade80; 
  border-color: rgba(34, 197, 94, 0.2); 
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.2); 
}
.ctrl-ai { 
  background: rgba(59, 130, 246, 0.1); 
  color: #60a5fa; 
  border-color: rgba(59, 130, 246, 0.2); 
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.2); 
}
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
