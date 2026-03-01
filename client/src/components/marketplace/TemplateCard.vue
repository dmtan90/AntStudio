<template>
  <div
    class="template-card group bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 min-h-[256px]">
    <div class="relative overflow-hidden h-full" @mouseover="template.playPreview = true"
      @mouseout="template.playPreview = false">
      <el-image :src="getFileUrl(template.thumbnail || template.pages?.[0]?.thumbnail || '')" :alt="template.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        <template #error>
          <div class="flex items-center justify-center w-full h-full bg-gray-800">
            <Pic class="text-gray-500 text-2xl" />
          </div>
        </template>
      </el-image>
      <video v-if="template.pages?.[0]?.preview && template.playPreview"
        :src="getFileUrl(template.pages?.[0]?.preview || '')" autoplay loop
        class="w-full h-full absolute top-0 left-0"></video>
      <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-500 text-white"
            v-if="template.pricing?.type === 'free' || template.is_published">{{ $t('marketplace.templateCard.free') }}</span>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-500 text-white"
            v-else>{{ $t('marketplace.templateCard.credits', { price: template.pricing?.price || 0 }) }}</span>
          <span class="text-xs text-white/60">⭐ {{ template.rating?.toFixed(1) || 0 }}</span>
        </div>
        <h3 class="text-sm font-bold text-white line-clamp-1">{{ template.name }}</h3>
      </div>
      <!-- Overlay controls -->
      <div
        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 cursor-pointer"
        @click.self="$emit('view', template)">
        <!-- <button @click.stop="$emit('use', template)"
          class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
          Use Template
        </button> -->
        <button @click.stop="$emit('view', template)"
          class="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors">
          {{ $t('marketplace.templateCard.viewDetail') }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getFileUrl } from '@/utils/api';
import { Pic } from '@icon-park/vue-next';

defineProps<{
  template: any
}>()

defineEmits(['use', 'view'])
</script>
