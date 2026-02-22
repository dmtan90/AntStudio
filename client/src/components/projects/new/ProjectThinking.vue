<template>
  <div class="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 text-white/60 shadow-2xl animate-up">
    <div class="flex gap-1.5">
      <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-dotPulse"></div>
      <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-dotPulse delay-200"></div>
      <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-dotPulse delay-400"></div>
    </div>
    <p class="m-0 text-sm font-bold tracking-tight uppercase opacity-80">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<style scoped>
.animate-up { animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.animate-dotPulse { animation: dotPulse 1.5s infinite ease-in-out; }
@keyframes dotPulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.3); opacity: 1; filter: blur(1px); } }

.delay-200 { animation-delay: 0.2s; }
.delay-400 { animation-delay: 0.4s; }
</style>
