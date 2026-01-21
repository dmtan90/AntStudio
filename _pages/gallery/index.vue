<template>
  <div class="gallery-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('gallery.title') }}</h1>
          <p class="subtitle">{{ t('gallery.description') }}</p>
        </div>
      </div>

      <div class="filters-bar">
        <GInput
          v-model="searchQuery"
          :placeholder="t('gallery.search')"
          class="search-input"
        >
          <template #prefix>
            <search theme="outline" size="18" />
          </template>
        </GInput>
      </div>

      <div v-if="loading" class="videos-grid">
        <GCard v-for="i in 6" :key="i" class="video-card skeleton"></GCard>
      </div>

      <div v-else-if="filteredVideos.length > 0" class="videos-grid">
        <GCard
          v-for="video in filteredVideos"
          :key="video._id"
          class="video-card"
        >
          <div class="video-thumbnail">
            <div class="play-overlay">
              <play-one theme="filled" size="48" fill="#fff" />
            </div>
          </div>
          <div class="video-info">
            <h3>{{ video.projectTitle }}</h3>
            <div class="video-meta">
              <span>{{ formatDuration(video.duration) }}</span>
              <span>{{ formatFileSize(video.fileSize) }}</span>
            </div>
          </div>
          <div class="video-actions">
            <GButton size="sm" @click="downloadVideo(video)">
              {{ t('gallery.download') }}
            </GButton>
          </div>
        </GCard>
      </div>

      <div v-else class="empty-state">
        <GCard class="empty-card">
          <div class="empty-icon">🎞️</div>
          <h3>{{ t('gallery.noVideos') }}</h3>
          <p>{{ t('gallery.noVideosDesc') }}</p>
        </GCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, PlayOne } from '@icon-park/vue-next'
import { useTranslations } from '~/composables/useTranslations'
import { toast } from 'vue-sonner'

const { t } = useTranslations()

definePageMeta({
  layout: 'app'
})

const loading = ref(true)
const videos = ref<any[]>([])
const searchQuery = ref('')

const filteredVideos = computed(() => {
  if (!searchQuery.value) return videos.value
  const query = searchQuery.value.toLowerCase()
  return videos.value.filter(v => v.projectTitle.toLowerCase().includes(query))
})

const fetchVideos = async () => {
  try {
    loading.value = true
    const { data } = await $fetch('/api/videos/list', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      }
    })
    videos.value = (data as any).videos
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load videos')
  } finally {
    loading.value = false
  }
}

const downloadVideo = (video: any) => {
  window.open(video.s3Url, '_blank')
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

onMounted(() => {
  fetchVideos()
})
</script>

<style lang="scss" scoped>
.gallery-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: $spacing-xl;
}

.filters-bar {
  margin-bottom: $spacing-xl;

  .search-input {
    max-width: 300px;
  }
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: $spacing-lg;
}

.video-card {
  position: relative;
  :deep(.g-card__body) {
    padding: 0;
  }

  &.skeleton {
    height: 260px;
    animation: pulse 1.5s infinite;
  }
}

.video-thumbnail {
  height: 180px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  position: relative;
  @include flex-center;
}

.play-overlay {
  opacity: 0.5;
  transition: all 0.3s;
  &:hover { opacity: 1; transform: scale(1.1); }
}

.video-info {
  padding: $spacing-lg;

  h3 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 $spacing-sm 0;
    color: #fff;
  }

  .video-meta {
    display: flex;
    gap: $spacing-md;
    font-size: 12px;
    color: $text-muted;
  }
}

.video-actions {
  padding: 0 $spacing-lg $spacing-lg;
}

.empty-state {
  text-align: center;
  max-width: 600px;
  margin: 100px auto;

  .empty-icon { font-size: 64px; margin-bottom: 24px; }
  h3 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
  p { color: $text-secondary; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
