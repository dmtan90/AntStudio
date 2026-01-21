<template>
  <div 
    v-if="show" 
    class="floating-comment-btn" 
    :style="{ top: top + 'px', left: left + 'px' }" 
    @click="$emit('comment', context, text)"
  >
    <comment theme="outline" size="16" />
    <span>Comment</span>
  </div>
</template>

<script setup lang="ts">
import { Comment } from '@icon-park/vue-next'

defineProps<{
  show: boolean
  top: number
  left: number
  text: string
  context: string
}>()

defineEmits(['comment'])
</script>

<style lang="scss" scoped>
.floating-comment-btn {
  position: fixed;
  z-index: 9999;
  background: #fff;
  color: #000;
  padding: 6px 14px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  white-space: nowrap;
  
  &:hover { transform: translateX(-50%) scale(1.05); background: #eee; }
}

@keyframes popIn {
  from { transform: scale(0.8) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
</style>
