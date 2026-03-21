<template>
  <div class="music-overlay absolute inset-0 pointer-events-none overflow-hidden">

    <!-- ─── ANIMATED WAVEFORM TOP ─── -->
    <div class="absolute top-0 inset-x-0 h-16 z-20 overflow-hidden pointer-events-none">
      <div class="waveform-top flex items-end justify-center gap-0.5 h-full px-8 pb-0">
        <div v-for="i in 80" :key="i"
          class="waveform-bar rounded-t-full"
          :style="`height:${20 + Math.sin(i * 0.4 + waveOffset) * 15 + Math.random() * 20}%; width:3px; background:linear-gradient(to top,#ec4899,#a855f7); opacity:0.6; animation-delay:${i * 0.05}s`">
        </div>
      </div>
    </div>

    <!-- ─── TOP CENTER: NEXT TRACK ANNOUNCEMENT ─── -->
    <div class="absolute top-16 inset-x-0 z-20 flex flex-col items-center gap-1 pointer-events-none">
      <p class="text-lg font-black uppercase tracking-widest text-center"
        style="background: linear-gradient(90deg, #ec4899, #a855f7, #06b6d4); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">
        NEXT UP: "{{ nextTrack.title }}" - {{ nextTrack.duration }}
      </p>
      <p class="text-sm font-bold uppercase tracking-widest text-pink-400/70">{{ nextTrackMsg }}</p>
    </div>

    <!-- ─── RIGHT PANEL: AUDIO SETTINGS ─── -->
    <div class="absolute top-6 right-6 bottom-24 w-64 z-20 pointer-events-auto">
      <div class="rounded-[1.5rem] border border-pink-500/20 bg-[#0a0410]/90 backdrop-blur-xl shadow-2xl h-full flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-white/5">
          <span class="text-[9px] font-black uppercase tracking-[0.25em] text-pink-400">HIGH-FIDELITY AUDIO SETTINGS</span>
        </div>
        <div class="px-5 py-4 flex flex-col gap-5 overflow-y-auto scrollbar-hide flex-1">
          <!-- Master Volume -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[9px] font-black uppercase tracking-widest text-white/50">MASTER VOLUME</span>
              <span class="text-[9px] font-black text-pink-400">{{ masterVolume }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500" :style="`width:${masterVolume}%`"></div>
            </div>
          </div>
          <!-- EQ Knobs -->
          <div>
            <span class="text-[9px] font-black uppercase tracking-widest text-white/50 mb-3 block">EQ</span>
            <div class="flex items-end justify-around gap-2">
              <div v-for="(label, knob) in eqKnobs" :key="knob" class="flex flex-col items-center gap-2">
                <div class="h-10 w-10 rounded-full border-2 border-pink-500/40 bg-[#1a0a28] shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center cursor-pointer hover:border-pink-400 transition-colors">
                  <div class="h-3 w-0.5 rounded-full bg-pink-400" :style="`transform: rotate(${Number(knob)*40-60}deg); transform-origin: bottom center`"></div>
                </div>
                <span class="text-[8px] font-black uppercase tracking-widest text-white/30">{{ label }}</span>
              </div>
            </div>
          </div>
          <!-- Sliders -->
          <div class="space-y-3">
            <div v-for="(setting, label) in audioSliders" :key="label">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/50">{{ label }}</span>
                <div class="h-4 w-7 rounded-full flex items-center justify-end pr-0.5 transition-all cursor-pointer"
                  :class="setting ? 'bg-pink-500' : 'bg-white/10'"
                  @click.stop="audioSliders[label] = !audioSliders[label]">
                  <div class="h-3 w-3 rounded-full bg-white shadow-sm transition-transform"
                    :class="setting ? '' : '-translate-x-3'"></div>
                </div>
              </div>
            </div>
          </div>
          <!-- Audio Quality -->
          <div>
            <span class="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 block">AUDIO QUALITY</span>
            <p class="text-[10px] font-bold text-pink-400">96kHz / 24-bit WAV · High-Res</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── BOTTOM LEFT: LIVE INFO BAR ─── -->
    <div class="absolute bottom-6 left-6 z-20 pointer-events-none flex items-center gap-4">
      <div class="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 shadow-lg shadow-red-500/30">
        <div class="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
        <span class="text-[10px] font-black uppercase tracking-wider text-white">LIVE</span>
      </div>
      <div class="text-white/50 text-xs font-bold flex items-center gap-3">
        <span>{{ viewers }}</span>
        <span>●</span>
        <span>{{ duration }}</span>
      </div>
    </div>

    <!-- ─── BOTTOM CENTER: TRACK INFO ─── -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
      <p class="text-base font-black uppercase tracking-tight text-white">{{ currentTrack.title }}</p>
      <p class="text-[10px] font-medium text-white/40">by {{ currentTrack.artist }} · {{ currentTrack.bpm }} BPM · {{ currentTrack.length }}</p>
    </div>

    <!-- ─── AI DJ BADGE (Bottom) ─── -->
    <div class="absolute bottom-6 right-72 z-20 pointer-events-none">
      <div class="flex items-center gap-3 rounded-2xl border border-pink-500/30 bg-[#0a0410]/80 px-5 py-3 backdrop-blur-xl shadow-2xl">
        <div class="h-10 w-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" class="h-5 w-5 text-pink-400"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        </div>
        <div>
          <p class="text-[9px] font-black uppercase tracking-widest text-white">AI DJ</p>
          <p class="text-[8px] text-pink-400 font-black">AI BEAT-MATCHING: <span class="text-green-400">ACTIVE</span></p>
          <p class="text-[8px] text-pink-400 font-black">AUTO LIGHTING: <span class="text-cyan-400">SYNCED</span></p>
        </div>
      </div>
    </div>

    <!-- ─── BOTTOM RIGHT: CHAT ─── -->
    <div class="absolute bottom-6 right-6 w-56 z-20 pointer-events-none">
      <div class="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-xl overflow-hidden">
        <div class="p-3 space-y-2.5 max-h-32 overflow-y-auto scrollbar-hide">
          <div v-for="msg in chatMessages" :key="msg.id" class="flex items-start gap-2">
            <div class="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[8px] font-black"
              :style="`background: ${msg.color}30; color: ${msg.color}`">
              {{ msg.name?.[0] }}
            </div>
            <div>
              <span class="text-[9px] font-black text-white/50">{{ msg.name }}: </span>
              <span class="text-[9px] text-white/80">{{ msg.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── ANIMATED WAVEFORM BOTTOM ─── -->
    <div class="absolute bottom-0 inset-x-0 h-12 z-10 overflow-hidden pointer-events-none opacity-40">
      <div class="waveform-bottom flex items-start justify-center gap-0.5 h-full px-8 pt-0">
        <div v-for="i in 80" :key="i"
          class="rounded-b-full"
          :style="`height:${20 + Math.sin(i * 0.4 + waveOffset + Math.PI) * 15}%; width:3px; background:linear-gradient(to bottom,#ec4899,#a855f7)`">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const waveOffset = ref(0);
let animFrame: number;

const currentTrack = computed(() => studioStore.contextData?.music?.currentTrack || {
  title: 'ELECTRIC DREAMS', artist: 'NOVA', bpm: '128', length: '3:45'
});
const nextTrack = computed(() => studioStore.contextData?.music?.nextTrack || {
  title: 'CYBER-GROOVE', duration: '2:30'
});
const nextTrackMsg = computed(() => studioStore.contextData?.music?.nextTrackMsg || 'DROP IN 15s! • LIGHTING: PNEUMATIC BEAT SYNC');

const masterVolume = ref(72);
const eqKnobs = { 0: 'LO', 40: 'MID', 80: 'HI' };
const audioSliders = reactive({ GAIN: true, COMPRESSOR: true, REVERB: false });

const viewers = computed(() => {
  const v = studioStore.viewerCount || 34781;
  return `● ${v > 1000 ? (v/1000).toFixed(1) + 'K' : v}`;
});
const duration = computed(() => {
  const s = 0;
  return `⊙ ${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
});

const chatMessages = computed(() => {
  const sample = [
    { id:1, name:'user1', text:'THIS BEAT IS INSANE!', color:'#f97316' },
    { id:2, name:'user2', text:'VIBES 🔥', color:'#a855f7' },
    { id:3, name:'user3', text:'What track is this?', color:'#06b6d4' },
  ];
  return sample;
});

const animate = () => {
  waveOffset.value += 0.1;
  animFrame = requestAnimationFrame(animate);
};

onMounted(() => animate());
onUnmounted(() => cancelAnimationFrame(animFrame));
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
