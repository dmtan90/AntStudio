<template>
  <div v-if="isVisible" class="slide-onboarding flex flex-col h-full bg-[#0a0a0f]/80 backdrop-blur-xl border-l border-white/5 p-6 overflow-y-auto">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-xs font-black uppercase tracking-[0.2em] text-white/40">Neural Education</h2>
        <h1 class="text-xl font-black text-white mt-1">Lesson Setup</h1>
      </div>
      <div class="h-10 w-10 flex items-center justify-center rounded-full bg-blue-600/10 text-blue-500">
        <svg viewBox="0 0 24 24" class="h-6 w-6"><path fill="currentColor" d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
      </div>
    </div>

    <!-- Presentation Mode Toggle -->
    <div class="space-y-6">
      <div class="p-6 rounded-3xl bg-white/5 border border-white/10 group hover:border-blue-500/30 transition-all cursor-pointer" @click="mode = 'generate'">
        <div class="flex items-center gap-4 mb-4">
          <div class="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <svg viewBox="0 0 24 24" class="h-6 w-6 text-white"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          </div>
          <div>
            <h3 class="font-bold text-white">AI Generation</h3>
            <p class="text-[10px] text-white/40 uppercase font-black">Powered by Gemini</p>
          </div>
          <div class="ml-auto">
            <input type="radio" :checked="mode === 'generate'" class="w-4 h-4 accent-blue-600">
          </div>
        </div>
        <input 
          v-model="topic" 
          placeholder="Enter a topic (e.g. History of AI)..." 
          class="w-full bg-black/40 border border-white/10 rounded-xl p-3 px-4 text-xs text-white focus:border-blue-500 outline-none mb-4"
          @keyup.enter="handleGenerate"
        />
        <button 
          @click="handleGenerate" 
          :disabled="!topic || isGenerating"
          class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-black text-white uppercase tracking-widest transition-all active:scale-95"
        >
          {{ isGenerating && mode === 'generate' ? 'Synthesizing...' : 'Engage Neural Brain' }}
        </button>
      </div>

      <div class="relative py-4 flex items-center gap-4">
        <div class="flex-1 h-px bg-white/5"></div>
        <span class="text-[10px] font-black text-white/20 uppercase">OR</span>
        <div class="flex-1 h-px bg-white/5"></div>
      </div>

      <div class="p-6 rounded-3xl bg-white/5 border border-white/10 group hover:border-purple-500/30 transition-all cursor-pointer" @click="mode = 'upload'">
        <div class="flex items-center gap-4 mb-4">
          <div class="h-12 w-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.5)]">
            <svg viewBox="0 0 24 24" class="h-6 w-6 text-white"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          </div>
          <div>
            <h3 class="font-bold text-white">Upload Documents</h3>
            <p class="text-[10px] text-white/40 uppercase font-black">PPTX / PDF / DOCX / TXT Support</p>
          </div>
          <div class="ml-auto">
            <input type="radio" :checked="mode === 'upload'" class="w-4 h-4 accent-purple-600">
          </div>
        </div>
        <div 
          @click="triggerUpload"
          class="w-full border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all"
        >
          <svg viewBox="0 0 24 24" class="h-8 w-8 text-white/20"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          <span class="text-[10px] font-black text-white/40 uppercase">{{ isGenerating && mode === 'upload' ? 'Parsing Content...' : 'Click to Upload' }}</span>
        </div>
        <input ref="fileInput" type="file" class="hidden" accept=".pdf,.pptx,.docx,.txt" @change="handleUpload" />
      </div>
    </div>

    <!-- Active Slides List -->
    <div v-if="slides.length > 0" class="mt-12">
      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Generated Courseware</h3>
      <div class="space-y-3">
        <div 
          v-for="(slide, i) in slides" 
          :key="i"
          class="p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4"
          :class="Number(activeSlide) === Number(i) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'"
          @click="jumpToSlide(Number(i))"
        >
          <div class="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-black/40">
            <img v-if="slide.imageUrl" :src="slide.imageUrl" class="h-full w-full object-cover">
            <div v-else class="h-full w-full flex items-center justify-center text-xs font-black text-white/20">{{ Number(i) + 1 }}</div>
          </div>
          <div class="flex-1 min-w-0">
             <p class="text-xs font-bold text-white truncate">{{ slide.title }}</p>
             <p class="text-[10px] text-white/40 truncate">{{ slide.bullets.length }} key points</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { slideGeneratorService } from '@/utils/ai/SlideGeneratorService';

const studioStore = useStudioStore();
const isVisible = computed(() => studioStore.streamingContext === 'education');
const isGenerating = computed(() => studioStore.contextData.education.isGenerating);
const slides = computed(() => studioStore.contextData.education.slides);
const activeSlide = computed(() => Number(studioStore.contextData.education.activeSlide));

const mode = ref<'generate' | 'upload'>('generate');
const topic = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const handleGenerate = async () => {
  if (!topic.value || isGenerating.value) return;
  await slideGeneratorService.generateSlides(topic.value);
};

const triggerUpload = () => {
    fileInput.value?.click();
};

const handleUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        mode.value = 'upload';
        await slideGeneratorService.processUploadedDocument(target.files[0]);
    }
};

const jumpToSlide = (index: number) => {
    studioStore.contextData.education.activeSlide = index;
    // Notify showrunner if needed
};
</script>

<style scoped>
.slide-onboarding::-webkit-scrollbar {
  width: 4px;
}
.slide-onboarding::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>
