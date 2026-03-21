<template>
  <div class="education-overlay absolute inset-0 pointer-events-none">
    <!-- Lesson Info (Top Left) -->
    <div class="absolute top-8 left-8 flex items-center gap-6 pointer-events-auto rounded-2xl bg-white/5 border border-white/10 p-4 pr-10 shadow-2xl backdrop-blur-3xl">
       <div class="h-14 w-14 flex items-center justify-center rounded-xl bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <svg viewBox="0 0 24 24" class="h-8 w-8 text-white"><path fill="currentColor" d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
       </div>
       <div>
          <h1 class="text-sm font-black uppercase tracking-widest text-white">{{ data.currentLesson }}</h1>
          <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Slide {{ data.activeSlide + 1 }} | Neural Education</p>
       </div>
    </div>

    <!-- Participants & Q&A (Right Sidebar) -->
    <div class="absolute top-8 bottom-32 right-8 w-80 pointer-events-auto flex flex-col gap-6 z-10">
       <!-- Active Students -->
       <div class="rounded-[2rem] border border-white/5 bg-[#0a0a0f]/60 p-6 shadow-2xl backdrop-blur-3xl overflow-hidden p-6">
          <div class="flex justify-between items-center mb-6">
             <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Participants</h3>
             <span class="text-[10px] font-black text-blue-400">{{ data.studentCount }} ONLINE</span>
          </div>
          <div class="flex -space-x-3 mb-6">
             <div v-for="i in 6" :key="i" class="h-10 w-10 rounded-full border-2 border-[#0a0a0f] bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                JS
             </div>
             <div class="h-10 w-10 rounded-full border-2 border-[#0a0a0f] bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                +118
             </div>
          </div>
       </div>

       <!-- Q&A Queue -->
       <div class="flex-1 rounded-[2rem] border border-white/5 bg-[#0a0a0f]/60 p-8 shadow-2xl backdrop-blur-3xl overflow-hidden flex flex-col">
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Real-time Q&A</h3>
          <div class="flex-1 overflow-y-auto space-y-6">
             <div v-for="q in questions" :key="q.user" class="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div class="flex items-center gap-3 mb-2">
                   <div class="h-6 w-6 rounded-lg bg-blue-500/20"></div>
                   <span class="text-[10px] font-black text-white/80 uppercase">{{ q.user }}</span>
                   <span class="text-[8px] font-bold text-white/20 ml-auto">{{ q.time }}</span>
                </div>
                <p class="text-xs font-medium text-white/60 leading-tight">{{ q.text }}</p>
             </div>
          </div>
       </div>
    </div>

    <!-- Premium Slide Stage (Center View) -->
    <div v-if="data.slides && data.slides.length > 0" class="absolute inset-0 flex items-center justify-center p-32 py-40">
        <div class="relative w-full max-w-5xl aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] pointer-events-auto group">
            <!-- Background Stock Media -->
            <div class="absolute inset-0">
                <img v-if="currentSlide?.imageUrl" :src="currentSlide.imageUrl" class="h-full w-full object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-[10s]">
                <div v-else class="h-full w-full bg-gradient-to-br from-blue-900/40 to-black"></div>
                <!-- Glassmorphic Overlay -->
                <div class="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
            </div>

            <!-- Content -->
            <div class="relative h-full flex flex-col p-16 justify-center">
                 <div class="flex items-center gap-4 mb-8">
                     <div class="h-px flex-1 bg-gradient-to-r from-transparent to-blue-500/50"></div>
                     <span class="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Slide {{ data.activeSlide + 1 }} / {{ data.slides.length }}</span>
                     <div class="h-px flex-1 bg-gradient-to-l from-transparent to-blue-500/50"></div>
                 </div>

                 <h2 class="text-5xl font-black text-white leading-tight mb-8 drop-shadow-2xl">
                    {{ currentSlide?.title }}
                 </h2>

                 <div class="space-y-4">
                    <div 
                        v-for="(point, idx) in currentSlide?.bullets" 
                        :key="idx"
                        class="flex items-start gap-6 group/item"
                    >
                         <div class="mt-3 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                         <p class="text-xl font-medium text-white/80 group-hover/item:text-white transition-colors">
                            {{ point }}
                         </p>
                    </div>
                 </div>

                 <!-- Footer Decorations -->
                 <div class="absolute bottom-12 left-16 right-16 flex items-center justify-between">
                     <div class="flex items-center gap-4">
                         <div class="h-1.5 w-32 rounded-full bg-white/5 overflow-hidden">
                             <div class="h-full bg-blue-600 transition-all duration-1000" :style="{ width: `${((data.activeSlide + 1) / data.slides.length) * 100}%` }"></div>
                         </div>
                     </div>
                     <div class="flex items-center gap-2">
                         <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">AI Synthesis Verified</span>
                         <div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                     </div>
                 </div>
            </div>

            <!-- Learning Glow -->
            <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px]"></div>
        </div>
    </div>

    <!-- Generating State -->
    <div v-if="data.isGenerating" class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50">
        <div class="flex flex-col items-center gap-6">
            <div class="h-20 w-20 relative">
                <div class="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                <div class="absolute inset-4 bg-blue-600/20 rounded-full animate-pulse flex items-center justify-center">
                    <svg viewBox="0 0 24 24" class="h-6 w-6 text-blue-400 rotate-12"><path fill="currentColor" d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
                </div>
            </div>
            <div class="text-center">
                <h3 class="text-xl font-black text-white uppercase tracking-widest">Consulting Neural Brain</h3>
                <p class="text-[10px] text-white/40 font-bold uppercase mt-2 tracking-[0.2em]">Structuring topic intelligence...</p>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const data = computed(() => studioStore.contextData.education);
const currentSlide = computed(() => data.value.slides[data.value.activeSlide]);

const questions = [
  { user: 'Student_92', text: 'How does the latent space handle multi-modal inputs?', time: '2m ago' },
  { user: 'Neural_Dev', text: 'Is there a limit to the cross-attention layers?', time: '5m ago' },
];
</script>
