<template>
  <div class="supervisor-dock pointer-events-auto overflow-hidden rounded-3xl border border-white/5 bg-[#121214]/80 p-6 px-10 shadow-2xl backdrop-blur-3xl">
    <div class="flex items-center gap-6">
      <div class="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
         <!-- Pulsing waveform effect -->
         <div class="flex items-end gap-1 px-2 h-8">
            <div v-for="i in 8" :key="i" class="w-1 bg-pink-500 rounded-full animate-bar" :style="{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 100}%` }"></div>
         </div>
         <div class="absolute inset-x-0 bottom-0 h-1 bg-pink-600/50"></div>
      </div>

      <div class="flex flex-col">
          <div class="flex items-center gap-3">
             <h2 class="text-lg font-black uppercase tracking-widest text-white">Supervisor Mode</h2>
             <div class="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
          </div>
          <p class="text-xs font-bold text-white/30 uppercase tracking-widest leading-none mt-1">Autonomous AI Assistant</p>
          <div class="mt-2 flex items-center gap-2">
             <span class="text-[10px] font-black uppercase tracking-widest text-pink-500">Status:</span>
             <span class="text-[10px] font-black uppercase tracking-widest text-white">Active - Supervisor Mode</span>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-bar {
  animation: bar-height 1s ease-in-out infinite;
}
@keyframes bar-height {
  0%, 100% { height: 30%; }
  50% { height: 100%; }
}
</style>
