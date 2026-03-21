<template>
  <div class="commentary-overlay absolute inset-0 pointer-events-none">
    <!-- Content Focal Box (Main Area) -->
    <div class="absolute inset-x-20 top-20 bottom-40 border-2 border-dashed border-white/10 rounded-[3rem] p-8 flex items-end justify-center">
        <div class="px-8 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
           <span class="text-xs font-black uppercase tracking-widest text-white/40">Shared Content Pipeline Active</span>
        </div>
    </div>

    <!-- Host Reaction Dock (Bottom Right) -->
    <div class="absolute bottom-10 right-10 w-64 pointer-events-auto rounded-3xl border border-white/5 bg-[#0a0a0f]/80 p-4 shadow-2xl backdrop-blur-3xl overflow-hidden">
       <div class="aspect-video rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 overflow-hidden relative">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <p class="text-[10px] font-black text-white/40 uppercase">Host React Cam</p>
       </div>
       <div class="flex items-center justify-between px-2">
          <div class="flex flex-col">
             <span class="text-xs font-black text-white leading-none">Creator Momentum</span>
             <div class="h-1.5 w-32 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div class="h-full bg-purple-500 transition-all duration-500" :style="{ width: `${data.momentum}%` }"></div>
             </div>
          </div>
       </div>
    </div>

    <!-- Commentary Feed (Bottom Left) -->
    <div class="absolute bottom-10 left-10 w-[600px] h-32 pointer-events-auto rounded-[2rem] border border-white/5 bg-[#0a0a0f]/60 p-8 shadow-2xl backdrop-blur-3xl flex items-center">
       <div class="flex items-center gap-12 w-full">
          <div class="flex flex-col gap-2 min-w-[200px]">
             <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Commentary Focus</span>
             <h3 class="text-xl font-black text-white uppercase tracking-tighter">Analyzing Key Frame</h3>
             <div class="mt-2 flex gap-4">
                <div class="flex items-center gap-2">
                   <div class="h-2 w-2 rounded-full" :class="data.momentum > 50 ? 'bg-green-400' : 'bg-cyan-400'"></div>
                   <span class="text-[10px] font-black text-white">Sentiment: {{ data.momentum > 50 ? 'Excited' : 'Positive' }}</span>
                </div>
             </div>
          </div>
          <div class="flex-1 border-l border-white/10 pl-12">
             <p v-if="data.reactions.length > 0" class="text-sm font-medium leading-relaxed text-white/80 italic">
                "{{ data.reactions[data.reactions.length - 1] }}"
             </p>
             <p v-else class="text-sm font-medium leading-relaxed text-white/30 italic">
                Listening for momentous highlights...
             </p>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const data = computed(() => studioStore.contextData.commentary);
</script>
