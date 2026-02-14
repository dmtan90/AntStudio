<template>
  <div class="vibe-card relative overflow-hidden group" 
       :class="{'active': active, 'compact': compact}"
       @click="$emit('select')">
    <div class="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
         :style="{ background: `linear-gradient(to bottom right, ${color}, transparent)` }"></div>
    
    <div class="relative z-10 flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
           :class="active ? 'bg-' + color + '-500 text-white' : 'bg-white/5 text-white/40 group-hover:text-white'">
        <component :is="icon" theme="outline" size="18" />
      </div>
      
      <div class="flex flex-col text-left">
        <span class="text-[10px] font-black uppercase tracking-widest"
              :class="active ? 'text-white' : 'text-white/60 group-hover:text-white'">{{ name }}</span>
        <span v-if="!compact" class="text-[8px] opacity-40 uppercase font-bold">{{ description }}</span>
      </div>
    </div>

    <!-- Active Indicator -->
    <div v-if="active" class="absolute top-1 right-1 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  description?: string;
  icon: any;
  color: string;
  active: boolean;
  compact?: boolean;
}>();

defineEmits(['select']);
</script>

<style scoped>
.vibe-card {
  @apply p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/20 transition-all;
}
.vibe-card.active {
  @apply border-white/20 bg-white/10;
}
.vibe-card.compact {
  @apply p-3;
}
</style>
