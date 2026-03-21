<template>
  <button
    class="context-card group relative aspect-square w-full overflow-hidden rounded-[2rem] border transition-all duration-500 hover:scale-[1.02]"
    :style="cardStyle"
    @click="$emit('select')"
  >
    <!-- Glow Backdrop -->
    <div class="glow-backdrop absolute rounded-[2rem]inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-40" :style="glowStyle"></div>
    
    <!-- Content Overlay -->
    <div class="content-overlay absolute rounded-[2rem] inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-3xl">
      <div 
        class="icon-wrapper mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 shadow-2xl transition-transform duration-500 group-hover:scale-110"
        :style="iconWrapperStyle"
      >
        <component :is="icon" theme="outline" size="32" :style="{ color: color }" />
      </div>
      
      <h4 class="mb-2 text-md whitespace-nowrap font-black uppercase tracking-tighter text-white">{{ label }}</h4>
      <el-text line-clamp="2" class="text-sm font-medium leading-tight text-white/50">
        {{ description }}
      </el-text>
      <!-- <p class="text-sm font-medium leading-tight text-white/50">{{ description }}</p> -->
    </div>

    <!-- Active Indicator -->
    <div v-if="active" class="absolute inset-0 rounded-[2rem] border-2 border-primary shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]"></div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  description: string;
  icon: any;
  color: string;
  active?: boolean;
}>();

defineEmits(['select']);

const cardStyle = computed(() => ({
  border: `1px solid ${props.color}20`,
  backgroundColor: `${props.color}05`,
}));

const glowStyle = computed(() => ({
  background: `radial-gradient(circle at center, ${props.color} 0%, transparent 70%)`,
}));

const iconWrapperStyle = computed(() => ({
  border: `1px solid ${props.color}40`,
  boxShadow: `0 0 30px ${props.color}20`,
}));
</script>

<style scoped>
.context-card {
  background: rgba(13, 13, 18, 0.4);
}

.context-card:hover {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 50px v-bind('color + "20"');
}

.icon-wrapper {
  backdrop-filter: blur(10px);
}
</style>
