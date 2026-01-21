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
        <GalleryVideoCard
          v-for="video in filteredVideos"
          :key="video._id"
          :video="video"
          @click="openPlayer"
          @download="downloadVideo"
        />
      </div>

      <div v-else class="empty-state">
        <GCard class="empty-card">
          <div class="empty-icon">🎞️</div>
          <h3>{{ t('gallery.noVideos') }}</h3>
          <p>{{ t('gallery.noVideosDesc') }}</p>
        </GCard>
      </div>

      <GDialog
        v-model="showPlayer"
        :title="selectedVideo?.projectTitle || ''"
        width="1000px"
        class="player-dialog"
      >
        <div class="player-wrapper aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
          <video
            v-if="resolvedPlayerUrl"
            :src="resolvedPlayerUrl"
            controls
            autoplay
            class="w-full h-full object-contain"
          ></video>
          <div v-else class="w-full h-full flex items-center justify-center bg-black/50">
             <el-icon class="is-loading text-4xl text-blue-500"><loading-icon /></el-icon>
          </div>
        </div>
        <template #footer>
           <div class="flex justify-between items-center">
              <div class="text-white/40 text-xs uppercase font-bold tracking-widest">
                 Resolution: {{ selectedVideo?.resolution || '1080p' }}
              </div>
              <GButton @click="downloadVideo(selectedVideo)">
                <download theme="outline" size="18" class="mr-2" />
                Download Final Video
              </GButton>
           </div>
        </template>
      </GDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Download } from '@icon-park/vue-next'
import { Loading as LoadingIcon } from '@element-plus/icons-vue'
import { useTranslations } from '@/composables/useTranslations'
import { ref, computed, onMounted } from 'vue'
import GButton from '@/components/ui/GButton.vue'
import GInput from '@/components/ui/GInput.vue'
import GCard from '@/components/ui/GCard.vue'
import GDialog from '@/components/ui/GDialog.vue'
import GalleryVideoCard from '@/components/projects/GalleryVideoCard.vue'
import { useMediaStore } from '@/stores/media'
import { storeToRefs } from 'pinia'
import { getFileUrl } from '@/utils/api'

const { t } = useTranslations()
const mediaStore = useMediaStore()

const { videos, loading } = storeToRefs(mediaStore)
const searchQuery = ref('')
const showPlayer = ref(false)
const selectedVideo = ref<any>(null)
const resolvedPlayerUrl = ref('')

const filteredVideos = computed(() => {
  const videoList = videos.value || []
  if (!searchQuery.value) return videoList
  const query = searchQuery.value.toLowerCase()
  return videoList.filter(v => (v.projectTitle || '').toLowerCase().includes(query))
})

const fetchVideos = () => {
  mediaStore.fetchVideos()
}

const openPlayer = async (video: any) => {
  selectedVideo.value = video
  showPlayer.value = true
  resolvedPlayerUrl.value = ''
  
  // Resolve URL with caching/auth
  const url = await getFileUrl(video.s3Key || video.s3Url, { cached: true })
  resolvedPlayerUrl.value = url
}

const downloadVideo = async (video: any) => {
  if (!video) return
  const url = await getFileUrl(video.s3Key || video.s3Url, { cached: true })
  const a = document.createElement('a')
  a.href = url
  a.download = `${video.projectTitle || 'render'}.mp4`
  a.click()
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
  margin-bottom: 32px;
}

.filters-bar {
  margin-bottom: 32px;

  .search-input {
    max-width: 300px;
  }
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
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

.empty-state {
  text-align: center;
  max-width: 600px;
  margin: 100px auto;

  .empty-icon { font-size: 64px; margin-bottom: 24px; }
  h3 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
  p { color: rgba(255, 255, 255, 0.6); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
