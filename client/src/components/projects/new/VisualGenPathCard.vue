<template>
  <div class="storyboard-collapsible animate-up">
    <div class="storyboard-summary-bar" @click.prevent="expanded = !expanded">
      <div class="bar-content">
        <list-checkbox theme="outline" size="18"/>
        <span>{{ t('projects.new.results.visualPath.summaryBar') }} <span class="status-ready">{{ t('projects.new.results.analysis.isReady') }}</span></span>
      </div>
      <arrow-right theme="outline" size="14" :class="expanded ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div :class="expanded ? 'document-content expanded' : 'document-content'">
      <div class="steps-timeline">
        <div v-for="(step, idx) in content.steps" :key="idx" class="step-item" :class="step.status">
          <div class="step-indicator">
            <div class="step-dot">
                <check-one v-if="step.status === 'done'" theme="filled" size="14"/>
                <loading-one v-else-if="step.status === 'loading'" theme="outline" size="14" class="spin"/>
                <div v-else class="pending-dot"></div>
            </div>
            <div v-if="idx < content.steps.length - 1" class="step-line"></div>
          </div>
          <div class="step-details">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-desc">{{ step.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ListCheckbox, ArrowRight, CheckOne, LoadingOne } from '@icon-park/vue-next'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

interface Step {
  title: string
  description: string
  status: 'pending' | 'loading' | 'done' | 'error'
}

defineProps<{
  content: { steps: Step[] }
}>()

const expanded = ref(true)

</script>

<style lang="scss" scoped>
.storyboard-collapsible {
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 16px;

  &:hover { background: rgba(40, 40, 40, 0.6); }
}

.storyboard-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(30, 30, 30, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  .bar-content {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #eee;
    font-size: 14px;
    font-weight: 600;

    .status-ready { color: #888; font-weight: 400; margin-left: 4px; }
  }

  .collapsible-icon {
    color: #555; 
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    &.expanded { transform: rotate(90deg); color: #fff; }
  }
}

.document-content {
  padding: 0;
  color: #ccc;
  font-size: 14px;
  height: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.expanded { height: auto; padding: 24px 30px; }
}

.steps-timeline {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  gap: 16px;
  min-height: 60px;
  position: relative;

  &:last-child { min-height: auto; }

  &.done {
    .step-dot { background: #4caf50; border-color: #4caf50; color: #000; }
    .step-line { background: #4caf50; }
    .step-title { color: #fff; }
  }
  
  &.loading {
    .step-dot { border-color: #2196f3; color: #2196f3; }
    .step-title { color: #2196f3; }
  }

  &.pending {
    .step-dot { border-color: #444; }
    .step-line { background: #333; }
    .step-title { color: #888; }
    .step-desc { color: #555; }
  }
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
}

.step-dot {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 2px solid #555;
  display: flex; align-items: center; justify-content: center;
  background: #1a1a1a;
  z-index: 1;
  transition: all 0.2s;

  .pending-dot { width: 6px; height: 6px; background: #555; border-radius: 50%; }
}

.step-line {
  flex: 1;
  width: 2px;
  background: #333;
  margin: 4px 0;
  min-height: 20px;
}

.step-details {
  padding-bottom: 20px;
  flex: 1;
}

.step-title {
  font-size: 14px; font-weight: 600; margin-bottom: 4px; transition: color 0.2s;
}

.step-desc {
  font-size: 13px; color: #777; line-height: 1.4;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
