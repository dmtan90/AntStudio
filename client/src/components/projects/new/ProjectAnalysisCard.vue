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
        {{ t('projects.new.results.analysis.scriptAnalysisTitle') }}: {{ msg.result.cumulative?.creativeBrief?.title || 'Untitled' }}
        <div class="inline-comment-icon" @click.stop="$emit('comment', 'Script Title')"><comment theme="outline" size="12"/></div>
        
        <div class="analysis-actions" style="margin-left: auto;">
          <el-button v-if="!approved" type="primary" size="small" @click.stop="$emit('approve')">
            {{ t('common.approve') || 'Approve Analysis' }}
          </el-button>
          <span v-else class="status-tag approved">
            <check theme="outline" size="12"/> {{ t('common.approved') || 'Approved' }}
          </span>
        </div>
      </div>
      
      <div class="doc-section">
        <div class="section-title-row">
          <h4>1. {{ t('projects.new.results.analysis.generalOverview') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Overview')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.genre') }}:</strong> {{ msg.result.cumulative?.analysis?.overview?.genre }}</li>
          <li><strong>{{ t('projects.new.results.analysis.mood') || 'Mood' }}:</strong> {{ msg.result.cumulative?.analysis?.overview?.mood }}</li>
          <li><strong>{{ t('projects.new.results.analysis.duration') }}:</strong> {{ msg.result.cumulative?.analysis?.overview?.duration }}</li>
          <li><strong>{{ t('projects.new.results.analysis.setting') }}:</strong> {{ msg.result.cumulative?.analysis?.overview?.setting }}</li>
          <li><strong>{{ t('projects.new.results.analysis.themes') }}:</strong> {{ msg.result.cumulative?.analysis?.overview?.themes }}</li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>2. {{ t('projects.new.results.analysis.characterSystem') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Characters')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li v-for="char in msg.result.cumulative?.analysis?.characters" :key="char.name">
            <strong>{{ char.name }}:</strong> {{ char.description }}
            <div class="char-sub-details" v-if="char.physical_traits">
              <span class="sub-label">{{ t('projects.new.results.analysis.physical') }}:</span> {{ Object.values(char.physical_traits).filter(Boolean).join(', ') }} | <span class="sub-label">{{ t('projects.new.results.analysis.voice') }}:</span> {{ char.voice_profile }}
            </div>
          </li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>3. {{ t('projects.new.results.analysis.narrativeStructure') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Structure')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.act1') }}:</strong> {{ msg.result.cumulative?.analysis?.structure?.act1 }}</li>
          <li><strong>{{ t('projects.new.results.analysis.act2') }}:</strong> {{ msg.result.cumulative?.analysis?.structure?.act2 }}</li>
          <li><strong>{{ t('projects.new.results.analysis.act3') }}:</strong> {{ msg.result.cumulative?.analysis?.structure?.act3 }}</li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>4. {{ t('projects.new.results.analysis.scenes') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Scenes')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li v-for="scene in msg.result.cumulative?.analysis?.scenes" :key="scene.id">
            <strong>Scene {{ scene.id }}: {{ scene.title }}</strong> 
            <span v-if="scene.timestamp" class="text-xs text-white/40 ml-2">({{ scene.timestamp }})</span>
            <p class="mt-1 text-white/60 text-xs">{{ scene.description }}</p>
          </li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>5. {{ t('projects.new.results.analysis.visualElements') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Visuals')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.palette') }}:</strong> {{ msg.result.cumulative?.analysis?.visuals?.palette }}</li>
          <li v-if="msg.result.cumulative?.analysis?.visuals?.visualWorldRules">
            <strong>{{ t('projects.new.results.analysis.worldRules') }}:</strong> {{ msg.result.cumulative?.analysis?.visuals?.visualWorldRules?.physics }} | {{ t('projects.new.results.analysis.lighting') }}: {{ msg.result.cumulative?.analysis?.visuals?.visualWorldRules?.lighting }}
          </li>
          <li v-if="msg.result.cumulative?.analysis?.visuals?.visualWorldRules?.colorHarmony">
            <strong>{{ t('projects.new.results.analysis.colorHarmony') }}:</strong>
            <span v-for="color in msg.result.cumulative?.analysis?.visuals?.visualWorldRules?.colorHarmony" :key="color.hex" class="hex-tag" :style="{ borderLeft: `4px solid ${color.hex}` }">
               {{ color.name }} ({{ color.hex }})
            </span>
          </li>
          <li><strong>{{ t('projects.new.results.analysis.visualKeywords') }}:</strong> {{ msg.result.cumulative?.analysis?.visuals?.characteristics }}</li>
          <li><strong>{{ t('projects.new.results.analysis.cameraAngles') }}:</strong> {{ msg.result.cumulative?.analysis?.visuals?.camera }}</li>
        </ul>
      </div>

      <div class="doc-section">
        <div class="section-title-row">
          <h4>6. {{ t('projects.new.results.analysis.audioElements') }}</h4>
          <div class="inline-comment-icon" @click.stop="$emit('comment', 'Audio')"><comment theme="outline" size="12"/></div>
        </div>
        <ul>
          <li><strong>{{ t('projects.new.results.analysis.sfx') }}:</strong> {{ msg.result.cumulative?.analysis?.audio?.sfx }}</li>
          <li><strong>{{ t('projects.new.results.analysis.music') }}:</strong> {{ msg.result.cumulative?.analysis?.audio?.music }}</li>
          <li v-if="msg.result.cumulative?.analysis?.audio?.ambience"><strong>{{ t('projects.new.results.analysis.ambience') }}:</strong> {{ msg.result.cumulative?.analysis?.audio?.ambience }}</li>
        </ul>
      </div>

      <div class="approval-footer mt-8 pt-8 border-t border-white/5 flex justify-center pb-4" v-if="!approved">
        <button
          class="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-primary text-black font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 group"
          @click.stop="$emit('approve')">
          <magic-wand theme="outline" size="20" class="group-hover:rotate-12 transition-transform" />
          {{ t('projects.new.results.analysis.approveAndCreateStoryboard') || 'Approve & Create Storyboard' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagicWand, ArrowRight, Comment, Check } from '@icon-park/vue-next'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

defineProps<{
  msg: any
  approved?: boolean
}>()

defineEmits(['text-selection', 'comment', 'approve'])
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

  .analysis-type { font-size: 12px; font-weight: 800; color: rgba(255, 255, 255, 0.3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }

  .analysis-title {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    margin-bottom: 32px;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .doc-section {
    margin-bottom: 32px;
    background: rgba(255, 255, 255, 0.03);
    padding: 24px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .section-title-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      h4 { color: #fff; font-size: 18px; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        margin-bottom: 12px;
        padding-left: 20px;
        position: relative;
        font-size: 14px;
        &::before { content: ''; position: absolute; left: 0; top: 10px; width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; }
        strong { color: #fff; font-weight: 800; margin-right: 8px; }
      }
    }
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

  &:hover .inline-comment-icon, .analysis-title:hover .inline-comment-icon, .section-title-row:hover .inline-comment-icon {
    opacity: 1;
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

  .char-sub-details {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 6px;
    
    .sub-label {
      color: rgba(255, 255, 255, 0.6);
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }
  }

  .hex-tag {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    margin-right: 12px;
    margin-top: 8px;
    color: #fff;
  }
}

.approval-footer {
  .btn-premium {
    background: #fff;
    color: #000;
    padding: 18px 40px;
    font-size: 16px;
    &:hover { transform: scale(1.05); box-shadow: 0 20px 40px rgba(255, 255, 255, 0.1); }
  }
}

@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
