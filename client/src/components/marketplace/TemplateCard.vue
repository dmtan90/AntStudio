<template>
  <div class="template-card group bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1">
    <div class="relative aspect-[9/16] overflow-hidden">
      <img :src="template.thumbnail" :alt="template.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500 text-white" v-if="template.pricing.type === 'free'">Free</span>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-500 text-white" v-else>{{ template.pricing.price }} Credits</span>
          <span class="text-xs text-white/60">⭐ {{ template.rating.toFixed(1) }}</span>
        </div>
        <h3 class="text-sm font-bold text-white line-clamp-1">{{ template.name }}</h3>
      </div>
      <!-- Overlay controls -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
        <button @click="$emit('use', template)" class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
          Use Template
        </button>
        <button @click="$emit('view', template)" class="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors">
          View Detail
        </button>
      </div>
    </div>
    <div class="p-3 flex items-center justify-between border-t border-white/5 bg-black/60">
      <div class="flex items-center gap-2">
        <div class="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white uppercase">
          {{ template.authorName?.charAt(0) || 'A' }}
        </div>
        <span class="text-[10px] text-white/50">{{ template.authorName }}</span>
      </div>
      <div class="flex items-center gap-1 text-[10px] text-white/40">
        <i class="ri-download-line"></i>
        <span>{{ template.downloads }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  template: any
}>()

defineEmits(['use', 'view'])
</script>
