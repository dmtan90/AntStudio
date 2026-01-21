<template>
  <div class="closing-container">
    <div 
      v-if="msg.result.closingMessage" 
      class="ai-bubble closing-text animate-up" 
      v-html="msg.result.closingMessage" 
      style="animation-delay: 0.3s"
    ></div>

    <div v-if="!msg.result.isComplete" class="follow-up-section animate-up">
      <p class="question-intro">{{ t('projects.new.results.closing.intro') }}</p>
      <div class="question-list">
        <button 
          v-for="q in msg.result.followUpQuestions" 
          :key="q" 
          @click="$emit('apply-suggestion', q)" 
          class="question-chip"
        >
          {{ q }}
        </button>
      </div>
    </div>

    <div v-if="msg.result.isComplete" class="confirm-actions-inline animate-zoom">
      <p>{{ t('projects.new.results.closing.happy') }}</p>
      <div class="btn-group">
        <GButton 
          type="primary" 
          :loading="creating" 
          @click="$emit('finalize', msg.result)"
        >
          {{ t('projects.new.flow.confirmCreate') }}
        </GButton>
        <GButton
          @click="$emit('re-generate', index)" 
        >
          {{ t('projects.new.flow.reGenerate') }}
        </GButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslations } from '@/composables/useTranslations'
const { t } = useTranslations()
import GButton from '@/components/ui/GButton.vue'

defineProps<{
  msg: any
  index?: number
  creating?: boolean
}>()

defineEmits(['apply-suggestion', 'finalize', 're-generate'])
</script>

<style lang="scss" scoped>
.closing-container {
  width: 100%;
}

.ai-bubble.closing-text {
  margin-top: 32px;
  font-size: 14px;
  line-height: 1.8;
  color: #bbb;
  background: transparent;
  border: none;
  padding: 0;
  max-width: 100%;
  
  :deep(p) { margin-bottom: 16px; }
  :deep(b) { color: #fff; font-weight: 700; }
  :deep(ol) { 
    margin: 20px 0; 
    padding-left: 24px; 
    li { 
      margin-bottom: 12px;
      color: #aaa;
      &::marker { color: #D4A017; font-weight: 800; font-size: 13px; }
      b { color: #eee; font-size: 14.5px; margin-right: 4px; }
    }
  }
}

.follow-up-section {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  margin-top: 24px;
}

.question-intro { font-size: 14px; color: #ccc; margin-bottom: 12px; }
.question-list { display: flex; flex-wrap: wrap; gap: 8px; }
.question-chip {
  padding: 8px 16px;
  background: rgba(var(--primary-rgb), 0.1);
  border-radius: 100px;
  color: var(--primary-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  &:hover { background: var(--primary-color); color: #fff; }
}

.confirm-actions-inline {
  @include glass-card;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.05), transparent);
  p { margin: 0; font-weight: 500; color: rgba(255, 255, 255, 0.7); }
  .btn-group { display: flex; gap: 12px; }
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.animate-zoom { animation: zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
