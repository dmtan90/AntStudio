<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
      <div class="text-center space-y-6 max-w-md p-8 rounded-[2rem] border border-white/10 glass-dark shadow-2xl">
        <div class="relative w-32 h-32 mx-auto">
          <div class="absolute inset-0 rounded-full border-4 border-white/5"></div>
          <div class="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-purple-500 animate-spin" :style="{ 'animation-duration': '1.5s' }"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl font-black text-white">{{ Math.round(progress) }}%</span>
          </div>
        </div>
        <div class="space-y-2">
          <h2 class="text-xl font-black uppercase tracking-widest text-blue-400">AI Production In Progress</h2>
          <p class="text-sm text-white/60">Gemini is stitching your viral moments into a professional recap reel.</p>
        </div>
        <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transition-all duration-300" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] animate-pulse">Running Client-Side Render Engine</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  progress: number;
}>();
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
