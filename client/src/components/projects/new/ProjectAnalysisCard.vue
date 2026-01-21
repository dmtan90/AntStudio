<template>
  <div class="storyboard-collapsible animate-up" style="animation-delay: 0.2s">
    <div class="storyboard-summary-bar" @click.prevent="msg.expandAnalysis = !msg.expandAnalysis">
      <div class="bar-content">
        <magic-wand theme="outline" size="18"/>
        <span>{{ t('projects.new.results.analysis.summaryBar') }} <span class="status-ready">{{ t('projects.new.results.analysis.isReady') }}</span></span>
      </div>
      <arrow-right theme="outline" size="14" :class="msg.expandAnalysis ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div :class="msg.expandAnalysis ? 'document-content expanded' : 'document-content'" @mouseup="$emit('text-selection', $event, 'Resource Analysis')">
      <div class="analysis-type"><strong>{{ t('projects.new.results.analysis.type') }}:</strong> {{ t('projects.new.results.analysis.document') }}</div>
      <div class="analysis-title">
        {{ t('projects.new.results.analysis.scriptAnalysisTitle') }}: {{ msg.result.creativeBrief?.title || 'Untitled' }}
        <div class="inline-comment-icon" @click.stop="$emit('comment', 'Script Title')"><comment theme="outline" size="12"/></div>
      </div>
      
      <div class="doc-section">
        <div class="section-title-row">
          <h4>1. {{ t('projects.new.results.analysis.generalOverview') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Overview')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.genre') }}:</strong> {{ msg.result.analysis.overview.genre }}</li>
          <li><strong>{{ t('projects.new.results.analysis.duration') }}:</strong> {{ msg.result.analysis.overview.duration }}</li>
          <li><strong>{{ t('projects.new.results.analysis.setting') }}:</strong> {{ msg.result.analysis.overview.setting }}</li>
          <li><strong>{{ t('projects.new.results.analysis.themes') }}:</strong> {{ msg.result.analysis.overview.themes }}</li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>2. {{ t('projects.new.results.analysis.characterSystem') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Characters')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li v-for="char in msg.result.analysis.characters" :key="char.name">
            <strong>{{ char.name }}:</strong> {{ char.description }}
          </li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>3. {{ t('projects.new.results.analysis.narrativeStructure') }} ({{ msg.result.storyboard?.length || 0 }} {{ t('projects.new.results.analysis.segmentsCount') }})</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Structure')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.act1') }}:</strong> {{ msg.result.analysis.structure.act1 }}</li>
          <li><strong>{{ t('projects.new.results.analysis.act2') }}:</strong> {{ msg.result.analysis.structure.act2 }}</li>
          <li><strong>{{ t('projects.new.results.analysis.act3') }}:</strong> {{ msg.result.analysis.structure.act3 }}</li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>4. {{ t('projects.new.results.analysis.visualElements') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Visuals')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.palette') }}:</strong> {{ msg.result.analysis.visuals.palette }}</li>
          <li><strong>{{ t('projects.new.results.analysis.visualKeywords') }}:</strong> {{ msg.result.analysis.visuals.characteristics }}</li>
          <li><strong>{{ t('projects.new.results.analysis.cameraAngles') }}:</strong> {{ msg.result.analysis.visuals.camera }}</li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>5. {{ t('projects.new.results.analysis.audioElements') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Audio')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.sfx') }}:</strong> {{ msg.result.analysis.audio.sfx }}</li>
          <li><strong>{{ t('projects.new.results.analysis.music') }}:</strong> {{ msg.result.analysis.audio.music }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagicWand, ArrowRight, Comment } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()

defineProps<{
  msg: any
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

  .analysis-type { font-size: 13px; color: #666; margin-bottom: 8px; }

  .analysis-title {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .doc-section {
    margin-bottom: 24px;
    .section-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      h4 { color: #eee; font-size: 15px; font-weight: 700; margin: 0; }
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        margin-bottom: 6px;
        padding-left: 16px;
        position: relative;
        font-size: 13px;
        &::before { content: '•'; position: absolute; left: 0; color: #D4A017; }
        strong { color: #fff; margin-right: 4px; }
      }
    }
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

  &:hover .inline-comment-icon, .analysis-title:hover .inline-comment-icon, .section-title-row:hover .inline-comment-icon {
    opacity: 1;
  }
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
