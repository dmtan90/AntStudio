<template>
  <div class="storyboard-collapsible animate-up" style="animation-delay: 0.2s">
    <div class="storyboard-summary-bar" @click.prevent="msg.expandBrief = !msg.expandBrief">
      <div class="bar-content">
        <magic-wand theme="outline" size="18"/>
        <span>{{ t('projects.new.results.brief.summaryBar') }} <span class="status-ready">{{ t('projects.new.results.analysis.isReady') }}</span></span>
      </div>
      <arrow-right theme="outline" size="14" :class="msg.expandBrief ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div :class="msg.expandBrief ? 'document-content expanded' : 'document-content'" @mouseup="$emit('text-selection', $event, 'Creative Brief')">
      <h2 class="brief-main-title">
        {{ msg.result.creativeBrief?.title }}
        <div class="inline-comment-icon" @click.stop="$emit('comment', 'Creative Brief Title')"><comment theme="outline" size="12"/></div>
      </h2>
      
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.videoType') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.videoType }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.narrativeDriver') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.narrativeDriver }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.tone') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.tone }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.visualStyle') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.visualStyle }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.pacing') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.pacing }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.soundDesign') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.soundDesign }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.analysis.duration') }}:</strong> {{ msg.result.cumulative?.analysis?.overview?.duration || '60s' }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.aspectRatio') }}:</strong> {{ aspectRatio }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.language') }}:</strong> {{ msg.result.cumulative?.language }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.audience') }}:</strong> {{ msg.result.cumulative?.creativeBrief?.targetAudience }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagicWand, ArrowRight, Comment } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()

defineProps<{
  msg: any
  aspectRatio: string
}>()

defineEmits(['text-selection', 'comment'])
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

  .brief-main-title {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    margin-bottom: 32px;
    letter-spacing: -0.03em;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .brief-field {
    margin-bottom: 16px;
    font-size: 15px;
    background: rgba(255, 255, 255, 0.03);
    padding: 12px 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;

    strong { color: rgba(255, 255, 255, 0.4); font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; min-width: 140px; }
    span { color: #fff; font-weight: 600; text-align: right; }
  }

  .inline-comment-icon {
    width: 28px;
    height: 28px;
    @include flex-center;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
    color: rgba(255, 255, 255, 0.4);
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }

  &:hover .inline-comment-icon, .brief-main-title:hover .inline-comment-icon {
    opacity: 1;
  }
}

@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
