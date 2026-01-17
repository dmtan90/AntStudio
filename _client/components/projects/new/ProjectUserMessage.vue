<template>
  <div class="max-w-[70%] bg-white/[0.08] border border-white/[0.1] px-6 py-4 rounded-[20px_20px_4px_20px] text-white text-[15px] leading-relaxed shadow-xl animate-up">
    <p class="m-0">{{ content }}</p>
    <div v-if="files && files.length" class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
      <div v-for="file in files" :key="file.name" class="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-md text-[11px] text-white">
        <file-text theme="outline" size="12" />
        <span>{{ file.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText } from '@icon-park/vue-next'

defineProps<{
  content?: string
  files?: Array<{ name: string }>
}>()
</script>

<style scoped>
.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
