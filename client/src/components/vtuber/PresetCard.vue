<template>
  <div
    class="preset-card group bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
    @click="$emit('use', preset)">
    <div class="relative aspect-[1/1] overflow-hidden">
      <!-- Thumbnail Image -->
      <img 
        :src="preset.thumbnail" 
        :alt="preset.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        @error="handleImageError"
      />
      
      <!-- Category Badge -->
      <div class="absolute top-3 left-3 z-10">
        <span 
          class="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg text-white shadow-lg"
          :style="{ backgroundColor: getCategoryColor(preset.category) }">
          {{ preset.category }}
        </span>
      </div>
      
      <!-- Model Type Badge -->
      <div class="absolute top-3 right-3 z-10">
        <span class="px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded-md bg-black/60 text-white/80 backdrop-blur-sm border border-white/20">
          {{ preset.visualIdentity.modelType === 'live2d' ? $t('vtubers.preset.live2d') : $t('vtubers.preset.static') }}
        </span>
      </div>
      
      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      
      <!-- Hover Overlay Actions -->
      <div 
        class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
        <button 
          @click.stop="$emit('use', preset)"
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wide rounded-xl transition-colors shadow-lg">
          <Plus theme="outline" size="14" class="inline mr-1" />
          {{ $t('vtubers.preset.useTemplate') }}
        </button>
        <button 
          @click.stop="$emit('preview', preset)"
          class="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wide rounded-xl transition-colors border border-white/20">
          {{ $t('vtubers.preset.preview') }}
        </button>
      </div>
    </div>
    
    <!-- Content Section -->
    <div class="p-3.5 bg-gradient-to-b from-transparent to-black/20">
      <h3 class="text-sm font-black text-white line-clamp-1 mb-1">{{ preset.name }}</h3>
      <p class="text-xs text-white/50 line-clamp-2 leading-relaxed">{{ preset.description }}</p>
      
      <!-- Tags -->
      <div class="flex flex-wrap gap-1.5 mt-2.5" v-if="preset.tags && preset.tags.length > 0">
        <span 
          v-for="tag in preset.tags.slice(0, 3)" 
          :key="tag"
          class="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 rounded-md text-white/40">
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@icon-park/vue-next';

const props = defineProps<{
  preset: any
}>();

const emit = defineEmits(['use', 'preview']);

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    anime: '#FF0050',
    business: '#3B82F6',
    education: '#10B981',
    entertainment: '#F59E0B',
    gaming: '#8B5CF6'
  };
  return colors[category] || '#6B7280';
};

const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.src = 'https://via.placeholder.com/400x600/1a1a1a/666666?text=No+Preview';
};
</script>

<style scoped>
.preset-card {
  will-change: transform;
}
</style>
