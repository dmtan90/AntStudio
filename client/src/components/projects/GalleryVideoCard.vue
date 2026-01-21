<template>
  <GCard class="video-card group cursor-pointer" @click="$emit('click', video)" bodyStyle="padding: 0">
    <div class="video-thumbnail overflow-hidden">
      <GMedia
        v-if="video.reviewKey || video.reviewUrl"
        :src="video.reviewKey || video.reviewUrl"
        type="video"
        muted
        loop
        @mouseenter="$event.target.play()"
        @mouseleave="$event.target.pause(); $event.target.currentTime = 0;"
        class="thumbnail-video transition-transform duration-500 group-hover:scale-110"
      />
      <div v-else class="play-overlay">
        <play-one theme="filled" size="48" fill="#fff" />
      </div>
      <div class="duration-badge">{{ formatDuration(video.duration) }}</div>
    </div>
    <div class="video-info">
      <h3 class="line-clamp-1 group-hover:text-blue-400 transition-colors">{{ video.projectTitle }}</h3>
      <div class="video-meta">
        <span class="flex items-center gap-1">
          <time-one theme="outline" size="14" />
          {{ formatDate(video.generatedAt || video.createdAt) }}
        </span>
        <span>{{ formatSize(video.fileSize) }}</span>
      </div>
    </div>
    <div class="video-actions flex gap-2">
      <GButton size="sm" class="flex-1" @click.stop="$emit('download', video)">
        <download theme="outline" size="16" class="mr-1" />
        {{ t('gallery.download') }}
      </GButton>
    </div>
  </GCard>
</template>

<script setup lang="ts">
import { PlayOne, Time as TimeOne, Download } from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'
import { ref, watch, onMounted } from 'vue'
import GCard from '@/components/ui/GCard.vue'
import GButton from '@/components/ui/GButton.vue'
import GMedia from '@/components/ui/GMedia.vue'

const props = defineProps<{
  video: any
}>()

defineEmits(['click', 'download'])

const { t } = useTranslations()

const formatDuration = (seconds: number) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (date: string | Date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}
</script>

<style lang="scss" scoped>
.video-card {
  position: relative;
  :deep(.g-card__body) {
    padding: 0;
  }
}

.video-thumbnail {
  height: 180px;
  background: #000;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .thumbnail-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.8;
    transition: opacity 0.3s;
  }

  .duration-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    color: #fff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-family: monospace;
    z-index: 10;
  }
}

.video-card:hover .thumbnail-video {
  opacity: 1;
}

.play-overlay {
  opacity: 0.7;
  transition: all 0.3s;
  z-index: 5;
}

.video-info {
  padding: 24px;

  h3 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #fff;
  }

  .video-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
  }
}

.video-actions {
  padding: 0 24px 24px;
}
</style>
