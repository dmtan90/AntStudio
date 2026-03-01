<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { cn } from '@/utils/ui';
import { EditorAnimation } from 'video-editor/constants/animations';

const { t } = useI18n();
const props = defineProps<{ animation: EditorAnimation; selected?: boolean; onClick: () => void }>();
</script>

<template>
  <div class="flex flex-col gap-1.5 group cursor-pointer" @click="onClick">
    <button :class="cn(
      'w-full aspect-square rounded-xl overflow-hidden border transition-all duration-300 relative',
      selected 
        ? 'border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/20' 
        : 'border-white/5 bg-white/5 group-hover:bg-white/10 group-hover:border-white/20 group-hover:scale-[1.05]'
    )">
      <img :src="animation.preview" class="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
      
      <!-- Selection Indicator -->
      <div v-if="selected" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-white/20"></div>
    </button>
    <p :class="cn(
      'text-[9px] font-bold text-center uppercase tracking-widest transition-colors',
      selected ? 'text-brand-primary' : 'text-white/40 group-hover:text-white'
    )">
      {{ t(`videoEditor.animation.names.${animation.value}`) }}
    </p>
  </div>
</template>