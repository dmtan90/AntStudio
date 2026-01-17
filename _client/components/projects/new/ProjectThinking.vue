<template>
  <div class="px-6 py-4 bg-white/[0.03] border border-white/[0.08] backdrop-blur-[20px] rounded-xl flex items-center gap-4 text-white/40 animate-up">
    <div class="flex gap-1">
      <span class="w-1.5 h-1.5 bg-[#D4A017] rounded-full animate-dotPulse"></span>
      <span class="w-1.5 h-1.5 bg-[#D4A017] rounded-full animate-dotPulse delay-200"></span>
      <span class="w-1.5 h-1.5 bg-[#D4A017] rounded-full animate-dotPulse delay-400"></span>
    </div>
    <p class="m-0">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<style scoped>
.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.animate-dotPulse { animation: dotPulse 1.5s infinite ease-in-out; }
@keyframes dotPulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }

.delay-200 { animation-delay: 0.2s; }
.delay-400 { animation-delay: 0.4s; }
</style>
