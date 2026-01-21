<template>
  <div class="resources-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('resources.title') }}</h1>
          <p class="subtitle">{{ t('resources.description') }}</p>
        </div>
        <GButton type="primary" size="lg" @click="showUploadDialog = true">
          {{ t('resources.upload') }}
        </GButton>
      </div>

      <div class="filters-bar">
        <GInput
          v-model="searchQuery"
          :placeholder="t('resources.search')"
          class="search-input"
        >
          <template #prefix>
            <search theme="outline" size="18" />
          </template>
        </GInput>

        <div class="filter-tabs">
          <GSegmented
            v-model="currentFileType"
            :options="fileTypeFilters"
            class="type-segmented"
          />
        </div>
      </div>

      <div v-if="loading" class="resources-grid">
        <GCard v-for="i in 8" :key="i" class="resource-card skeleton"></GCard>
      </div>

      <div v-else-if="filteredResources.length > 0" class="resources-grid">
        <GCard
          v-for="resource in filteredResources"
          :key="resource._id"
          class="resource-card"
          :bodyStyle="{ padding: '0px !important' }"
        >
          <div class="resource-preview" @click="previewResource(resource)">
            <img 
              v-if="isImage(resource.contentType)" 
              :src="getFileUrl(resource.key)"
              :alt="resource.fileName"
              class="preview-image"
              loading="lazy"
            />
            <div v-else-if="isVideo(resource.contentType)" class="file-icon video-icon">
              <play-one theme="filled" size="32" fill="#fff" />
            </div>
            <div v-else class="file-icon">
              {{ getFileIcon(resource.contentType) }}
            </div>
          </div>
          <div class="resource-info">
            <h4>{{ resource.fileName }}</h4>
            <div class="resource-meta">
              <span>{{ formatFileSize(resource.size) }}</span>
              <span>{{ formatDate(resource.createdAt) }}</span>
            </div>
          </div>
          <div class="resource-actions">
            <button class="action-btn" @click="downloadResource(resource)">
              <download theme="outline" size="16" />
              {{ t('resources.download') }}
            </button>
            <button class="action-btn danger" @click="deleteResource(resource)">
              <delete theme="outline" size="16" />
              {{ t('resources.delete') }}
            </button>
          </div>
        </GCard>
      </div>

      <div v-else class="empty-state">
        <GCard class="empty-card">
          <div class="empty-icon">📁</div>
          <h3>{{ t('resources.noResources') }}</h3>
          <p>{{ t('resources.noResourcesDesc') }}</p>
          <GButton type="primary" size="lg" @click="showUploadDialog = true">
            {{ t('resources.upload') }}
          </GButton>
        </GCard>
      </div>
    </div>

    <!-- Upload Dialog -->
    <GDialog
      v-model="showUploadDialog"
      :title="t('resources.upload')"
      width="500px"
    >
      <div class="upload-area">
        <input
          ref="fileInput"
          type="file"
          multiple
          hidden
          @change="handleFileSelect"
        />
        <div class="upload-placeholder" @click="fileInput?.click()">
          <upload-one theme="outline" size="48" />
          <p>Click to upload or drag files here</p>
        </div>
      </div>
    </GDialog>

    <!-- Preview Dialog -->
    <GDialog
      v-model="showPreviewDialog"
      :title="previewFile?.fileName"
      width="80%"
      custom-class="preview-dialog"
    >
      <div class="preview-content">
        <img 
          v-if="previewFile && isImage(previewFile.contentType)" 
          :src="getFileUrl(previewFile.key)" 
          :alt="previewFile.fileName"
        />
        <video 
          v-else-if="previewFile && isVideo(previewFile.contentType)"
          :src="getFileUrl(previewFile.key)"
          controls
          class="preview-video"
        />
      </div>
    </GDialog>
  </div>
</template>

<script setup lang="ts">
import { Search, UploadOne, Download, Delete, PlayOne } from '@icon-park/vue-next'
import { useTranslations } from '~/composables/useTranslations'
import { toast } from 'vue-sonner'

const { t } = useTranslations()

definePageMeta({
  layout: 'app'
})

const loading = ref(true)
const resources = ref<any[]>([])
const searchQuery = ref('')
const currentFileType = ref('all')
const showUploadDialog = ref(false)
const showPreviewDialog = ref(false)
const previewFile = ref<any>(null)
const fileInput = ref<HTMLInputElement>()

const fileTypeFilters = computed(() => [
  { value: 'all', label: t('resources.filterAll') },
  { value: 'images', label: t('resources.filterImages') },
  { value: 'videos', label: t('resources.filterVideos') },
  { value: 'documents', label: t('resources.filterDocuments') }
])

const filteredResources = computed(() => {
  let filtered = resources.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(r => r.fileName.toLowerCase().includes(query))
  }

  return filtered
})

// Helper to get S3 file URL
const getFileUrl = (key: string) => {
  if (!key) return ''
  if (key.startsWith('http')) return key
  return `/api/s3/${key}`
}

const isImage = (contentType: string) => {
  return contentType?.startsWith('image/')
}

const isVideo = (contentType: string) => {
  return contentType?.startsWith('video/')
}

const fetchResources = async () => {
  try {
    loading.value = true
    const { data } = await $fetch('/api/media/list', {
      query: { fileType: currentFileType.value !== 'all' ? currentFileType.value : undefined },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      }
    })
    resources.value = (data as any).media
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load resources')
  } finally {
    loading.value = false
  }
}

const handleFileSelect = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return

  toast.info('Upload feature coming soon')
  showUploadDialog.value = false
}

const previewResource = (resource: any) => {
  if (isImage(resource.contentType) || isVideo(resource.contentType)) {
    previewFile.value = resource
    showPreviewDialog.value = true
  }
}

const downloadResource = (resource: any) => {
  window.open(getFileUrl(resource.key), '_blank')
}

const deleteResource = async (resource: any) => {
  if (!confirm(t('resources.confirmDelete'))) return

  try {
    await $fetch('/api/media/delete', {
      method: 'DELETE',
      body: { mediaId: resource._id },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      }
    })
    toast.success('File deleted successfully')
    fetchResources()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete file')
  }
}

const getFileIcon = (contentType: string) => {
  if (contentType?.includes('pdf')) return '📄'
  if (contentType?.includes('word')) return '📝'
  if (contentType?.includes('presentation')) return '📊'
  if (contentType?.includes('spreadsheet') || contentType?.includes('excel')) return '📈'
  return '📁'
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
  return `${mb.toFixed(1)} MB`
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}

watch(currentFileType, () => {
  fetchResources()
})

onMounted(() => {
  fetchResources()
})
</script>

<style lang="scss" scoped>
.resources-page {
  min-height: 100vh;
  padding-bottom: 80px;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: $spacing-xl;
}

.filters-bar {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;
  align-items: center;

  .search-input {
    max-width: 300px;
  }
}

.type-segmented {
  max-width: 500px;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;
}

.resource-card {
  position: relative;
  :deep(.g-card__body) {
    padding: 0;
  }

  &.skeleton {
    height: 280px;
    animation: pulse 1.5s infinite;
  }
}

.resource-preview {
  height: 160px;
  background: rgba(0, 0, 0, 0.3);
  @include flex-center;
  cursor: pointer;
  overflow: hidden;
  position: relative;

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover .preview-image {
    transform: scale(1.05);
  }

  .file-icon {
    font-size: 48px;
  }

  .video-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    @include flex-center;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
}

.resource-info {
  padding: $spacing-md $spacing-lg;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 $spacing-xs 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fff;
  }

  .resource-meta {
    display: flex;
    gap: $spacing-md;
    font-size: 11px;
    color: $text-muted;
  }
}

.resource-actions {
  display: flex;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: transparent;
  border: none;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:first-child {
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  &.danger {
    color: #ff5252;
    &:hover { background: rgba(255, 82, 82, 0.1); }
  }
}

.empty-state {
  text-align: center;
  max-width: 600px;
  margin: 100px auto;

  .empty-icon { font-size: 64px; margin-bottom: 24px; }
  h3 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
  p { color: $text-secondary; margin-bottom: 32px; }
}

.upload-area {
  padding: 10px;
}

.upload-placeholder {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: $radius-lg;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.02);

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
  }

  p {
    margin-top: 16px;
    color: $text-secondary;
  }
}

.preview-content {
  @include flex-center;
  background: #000;
  width: 100%;
  height: 60vh;

  img, video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
