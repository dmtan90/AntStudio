<template>
  <div class="user-msg-bubble">
    <p class="m-0">{{ content }}</p>
    <div v-if="files && files.length" class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
      <div v-for="file in files" :key="file.name" class="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-white/70">
        <file-text theme="outline" size="14" />
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
.user-msg-bubble {
  max-width: 80%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 24px;
  border-radius: 24px 24px 4px 24px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideInUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
