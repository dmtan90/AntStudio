<template>
  <div class="storyboard-collapsible animate-up" style="animation-delay: 0.1s">
    <div class="storyboard-summary-bar" @click.prevent="msg.expandScript = !msg.expandScript">
      <div class="bar-content">
        <file-text theme="outline" size="18"/>
        <span>{{ t('projects.new.results.script.summaryBar') || 'Screenplay' }} <span class="status-ready">{{ t('projects.new.results.analysis.isReady') }}</span></span>
      </div>
      <arrow-right theme="outline" size="14" :class="msg.expandScript ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div :class="msg.expandScript ? 'document-content expanded' : 'document-content'" @mouseup="$emit('text-selection', $event, 'Screenplay')">
      <div class="script-header">
        <h2 class="script-title">{{ t('projects.new.results.script.title') || 'Generated Screenplay' }}</h2>
        <div class="script-actions">
          <el-button v-if="!approved" type="primary" size="small" @click.stop="$emit('approve')">
            {{ t('common.approve') || 'Approve Script' }}
          </el-button>
          <span v-else class="status-tag approved">
            <check theme="outline" size="12"/> {{ t('common.approved') || 'Approved' }}
          </span>
        </div>
      </div>
      
      <div class="script-content-wrapper">
        <pre class="script-text">{{ msg.result.cumulative?.script }}</pre>
      </div>

      <div v-if="!approved" class="stage-navigation">
        <p class="stage-hint">{{ t('projects.new.results.script.hint') || 'Review the script above. You can approve it to proceed to cinematic analysis.' }}</p>
        <!-- <el-button type="primary" class="approve-btn" @click="$emit('approve')">
          {{ t('projects.new.results.script.approveBtn') || 'Approve & Analyze' }}
        </el-button> -->
        <button
          class="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-primary text-black font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 group"
          @click.stop="$emit('approve')">
          <magic-wand theme="outline" size="20" class="group-hover:rotate-12 transition-transform" />
          {{ t('projects.new.results.script.approveBtn') || 'Approve & Analyze' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText, ArrowRight, Check, MagicWand } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()

defineProps<{
  msg: any
  approved?: boolean
}>()

defineEmits(['text-selection', 'approve'])
</script>

<style lang="scss" scoped>
.storyboard-collapsible {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-bottom: 8px;

  &:hover { 
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.storyboard-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;

  .bar-content {
    display: flex;
    align-items: center;
    gap: 16px;
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;

    i { color: #3b82f6; }
    .status-ready { color: rgba(255, 255, 255, 0.4); font-weight: 600; font-size: 13px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  }

  .collapsible-icon {
    color: rgba(255, 255, 255, 0.2); 
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    &.expanded { transform: rotate(90deg); color: #fff; }
  }
}

.document-content {
  padding: 0 32px 32px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  line-height: 1.7;
  height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  
  &.expanded { height: auto; opacity: 1; padding-top: 12px; }

  .script-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .script-title {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    margin-bottom: 0;
    letter-spacing: -0.03em;
  }

  .script-content-wrapper {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    padding: 32px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-height: 600px;
    overflow-y: auto;
    margin-bottom: 32px;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
  }

  .script-text {
    font-family: 'Courier New', Courier, monospace;
    font-size: 15px;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    line-height: 1.8;
  }

  .stage-navigation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding-top: 32px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .stage-hint {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.4);
      margin: 0;
      text-align: center;
      max-width: 400px;
      line-height: 1.6;
    }
  }

  .status-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 100px;
    
    &.approved {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
  }
}

@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
