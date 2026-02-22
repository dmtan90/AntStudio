<template>
  <div class="storyboard-collapsible animate-up" style="animation-delay: 0.2s">
    <div class="storyboard-summary-bar" @click.prevent="msg.expandStoryboard = !msg.expandStoryboard">
      <div class="bar-content">
        <movie-board theme="outline" size="18"/>
        <span>{{ t('projects.new.results.storyboard.summaryBar') }} <span class="status-updated">{{ t('projects.new.results.storyboard.isUpdated') }}</span></span>
      </div>
      <arrow-right theme="outline" size="14" :class="msg.expandStoryboard ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div v-if="msg.expandStoryboard" class="storyboard-content-wrapper">
      <div class="storyboard-details-expanded">
        <div v-for="seg in (msg.result.cumulative?.storyboard || msg.result.storyboard)" :key="seg.order" class="segment-card" @mouseup="$emit('text-selection', $event, `Segment #${seg.order}`)">
          <div class="seg-order">#{{ seg.order }}</div>
          <div class="seg-info">
            <h4>{{ seg.title }}</h4>
            <p>{{ seg.description }}</p>
            <div class="seg-meta">
              <GTag size="sm" class="max-w-[90px] overflow-hidden justify-start">
                <el-text truncate line-clamp="2" class="text-inherit">{{ seg.cameraAngle }}</el-text>
              </GTag>
              <span>{{ seg.duration }}s</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!approved" class="stage-navigation">
        <p class="stage-hint">{{ t('projects.new.results.storyboard.hint') || 'Review the storyboard segments above. If you are satisfied, approve it to create your project.' }}</p>
        <!-- <el-button type="primary" class="approve-btn" @click="$emit('approve')">
          {{ t('projects.new.results.storyboard.approveBtn') || 'Approve & Create Project' }}
        </el-button> -->
        <button
          class="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-primary text-black font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 group"
          @click.stop="$emit('approve')">
          <magic-wand theme="outline" size="20" class="group-hover:rotate-12 transition-transform" />
          {{ t('projects.new.results.storyboard.approveBtn') || 'Approve & Create Project' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MovieBoard, ArrowRight, MagicWand } from '@icon-park/vue-next'
import GTag from '@/components/ui/GTag.vue'
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
    .status-updated { color: rgba(255, 255, 255, 0.4); font-weight: 600; font-size: 13px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  }

  .collapsible-icon {
    color: rgba(255, 255, 255, 0.2); 
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    &.expanded { transform: rotate(90deg); color: #fff; }
  }
}

.storyboard-details-expanded {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  
  .segment-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
    
    .seg-order { font-size: 11px; font-weight: 900; color: rgba(255, 255, 255, 0.2); text-transform: uppercase; letter-spacing: 0.1em; }
    .seg-info {
      h4 { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -0.01em; }
      p { font-size: 13px; color: rgba(255, 255, 255, 0.5); line-height: 1.6; }
      .seg-meta { 
        margin-top: 16px; 
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: flex; 
        gap: 12px; 
        align-items: center; 
        font-size: 12px;
        font-weight: 700;
        span { color: #fff; }
      }
    }
  }
}

.storyboard-content-wrapper {
  display: flex;
  flex-direction: column;
}

.stage-navigation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 32px 0;
  margin: 0 24px;
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

@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
