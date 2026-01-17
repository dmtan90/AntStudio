<template>
  <div class="storyboard-collapsible animate-up" style="animation-delay: 0.2s">
    <div class="storyboard-summary-bar" @click.prevent="msg.expandStoryboard = !msg.expandStoryboard">
      <div class="bar-content">
        <movie-board theme="outline" size="18"/>
        <span>{{ t('projects.new.results.storyboard.summaryBar') }} <span class="status-updated">{{ t('projects.new.results.storyboard.isUpdated') }}</span></span>
      </div>
      <arrow-right theme="outline" size="14" :class="msg.expandStoryboard ? 'collapsible-icon expanded' : 'collapsible-icon'" />
    </div>
    <div v-if="msg.expandStoryboard" class="storyboard-details-expanded">
      <div v-for="seg in msg.result.storyboard" :key="seg.order" class="segment-card" @mouseup="$emit('text-selection', $event, `Segment #${seg.order}`)">
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
  </div>
</template>

<script setup lang="ts">
import { MovieBoard, ArrowRight } from '@icon-park/vue-next'
import GTag from '~/components/ui/GTag.vue'

const { t } = useTranslations()

defineProps<{
  msg: any
}>()

defineEmits(['text-selection'])
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

    .status-updated { color: #888; font-weight: 400; margin-left: 4px; }
  }

  .collapsible-icon {
    color: #555; 
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    &.expanded { transform: rotate(90deg); color: #fff; }
  }
}

.storyboard-details-expanded {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  animation: slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  .segment-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    gap: 12px;
    
    .seg-order { font-size: 12px; font-weight: 800; color: #555; }
    .seg-info {
      h4 { font-size: 13px; color: #fff; margin-bottom: 4px; }
      p { font-size: 12px; color: #888; line-height: 1.4; }
      .seg-meta { margin-top: 8px; display: flex; gap: 8px; align-items: center; font-size: 11px; }
    }
  }
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideInDown { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
