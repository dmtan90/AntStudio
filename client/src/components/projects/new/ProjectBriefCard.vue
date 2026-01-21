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
      
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.videoType') }}:</strong> {{ msg.result.creativeBrief.videoType }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.narrativeDriver') }}:</strong> {{ msg.result.creativeBrief.narrativeDriver }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.tone') }}:</strong> {{ msg.result.creativeBrief.tone }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.visualStyle') }}:</strong> {{ msg.result.creativeBrief.visualStyle }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.pacing') }}:</strong> {{ msg.result.creativeBrief.pacing }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.soundDesign') }}:</strong> {{ msg.result.creativeBrief.soundDesign }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.analysis.duration') }}:</strong> {{ msg.result.analysis.overview.duration }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.aspectRatio') }}:</strong> {{ aspectRatio }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.language') }}:</strong> {{ msg.result.language }}</div>
      <div class="brief-field"><strong>{{ t('projects.new.results.brief.audience') }}:</strong> {{ msg.result.creativeBrief.targetAudience }}</div>
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
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

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
  padding: 24px 30px;
  color: #ccc;
  font-size: 14px;
  line-height: 1.6;
  height: 100px;
  position: relative;
  overflow-y: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.expanded { height: auto; overflow-y: auto; }

  .brief-main-title {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brief-field {
    margin-bottom: 12px;
    font-size: 14px;
    strong { color: #fff; display: inline-block; min-width: 160px; }
  }

  .inline-comment-icon {
    width: 20px;
    height: 20px;
    @include flex-center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
    color: #888;
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }

  &:hover .inline-comment-icon, .brief-main-title:hover .inline-comment-icon {
    opacity: 1;
  }
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
