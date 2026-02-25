<template>
  <div class="resources-view min-h-screen bg-[#0a0a0c] text-white">
    <!-- Header Section -->
    <header class="relative py-20 px-8 overflow-hidden border-b border-white/5">
      <div class="absolute inset-0 bg-gradient-to-br from-blue-600/15 via-purple-600/5 to-transparent pointer-events-none"></div>
      <!-- Animated background glow -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

      <div class="max-w-7xl mx-auto relative z-10">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <div class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">Resource Manager</span>
        </div>
        <h1 class="text-6xl font-black mb-6 tracking-tighter leading-[0.9]">
          Creative <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">Assets</span><br />
          & Archives
        </h1>
        <p class="text-xl text-gray-400 max-w-2xl leading-relaxed mb-10 font-medium">
          Centralize your media, studio recordings, and production exports in one place. Search, filter, and manage your assets with ease.
        </p>

        <div class="flex flex-wrap gap-4 items-center">
          <button @click="showUploadDialog = true" class="group px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-white/5 flex items-center gap-3 relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <UploadOne theme="filled" class="text-xl" />
            Upload Assets
          </button>

          <div class="flex -space-x-4">
            <div v-for="i in 3" :key="i" class="w-12 h-12 rounded-2xl border-2 border-[#0a0a0c] overflow-hidden bg-white/5 backdrop-blur-md">
              <img :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${i + 100}`" class="w-full h-full object-cover" />
            </div>
            <div class="w-12 h-12 rounded-2xl border-2 border-[#0a0a0c] bg-white/10 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white">
              +50
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="max-w-7xl mx-auto py-16 px-8">
      <!-- Secondary Nav & Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <el-segmented v-model="activeTab" :options="tabs" class="premium-segmented h-14 rounded-2xl bg-white/5 p-1.5 border border-white/5">
          <template #default="scope">
            <div class="flex items-center gap-2.5 px-5 h-full transition-all">
              <FolderOne v-if="scope.item.value === 'assets'" class="text-blue-400" />
              <VideoOne v-if="scope.item.value === 'archives'" class="text-purple-400" />
              <CollectionFiles v-if="scope.item.value === 'gallery'" class="text-pink-400" />
              <span class="font-black text-sm tracking-tight">{{ scope.item.name }}</span>
            </div>
          </template>
        </el-segmented>

        <div class="relative group min-w-[320px]">
          <Search class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-lg group-focus-within:text-blue-400 transition-colors" />
          <input v-model="filters.search" placeholder="Search resources..." class="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:bg-white/[0.08] transition-all outline-none text-base" />
        </div>
      </div>

      <!-- Assets Content -->
      <div v-if="activeTab === 'assets'">
        <!-- Sub Filters for Assets -->
        <div class="mb-12 flex flex-wrap items-center gap-3">
          <button v-for="cat in assetCategories" :key="cat.id" @click="filters.category = cat.id" 
            :class="['px-6 py-3 rounded-2xl text-sm font-black transition-all border outline-none',
            filters.category === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20 scale-105' : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white']">
            {{ cat.name }}
          </button>
        </div>

        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="i in 8" :key="i" class="aspect-square bg-white/5 animate-pulse rounded-2xl"></div>
        </div>

        <div v-else-if="resources.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="item in resources" :key="item._id" class="cinematic-asset-card group">
            <div class="preview-area" @click="previewResource(item)">
              <img v-if="isImage(item.contentType)" :src="getFileUrl(item.key)" class="preview-img" />
              <div v-else class="preview-icon">
                <component :is="getIconComponent(item.contentType)" />
              </div>
              <div class="overlay opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                <button @click.stop="downloadResource(item)" class="action-circle-btn"><Download /></button>
                <button @click.stop="deleteResource(item)" class="action-circle-btn danger"><Delete /></button>
              </div>
            </div>
            <div class="info-area">
              <h4 class="title line-clamp-1">{{ item.fileName }}</h4>
              <div class="meta">
                <span>{{ formatFileSize(item.size) }}</span>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-placeholder">
           <Ghost class="text-6xl text-gray-600 mb-4 block mx-auto" />
           <h3 class="text-xl font-black mb-2">No assets found</h3>
           <p class="text-gray-500">Try uploading some media files to get started.</p>
        </div>
      </div>

      <!-- Archives & Gallery Content -->
      <div v-else>
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="i in 8" :key="i" class="aspect-[16/10] bg-white/5 animate-pulse rounded-2xl"></div>
        </div>

        <div v-else-if="activeTab === 'archives' && resources.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           <GalleryVideoCard 
            v-for="video in resources" 
            :key="video._id" 
            :video="{
              reviewKey: video.key,
              projectTitle: video.fileName,
              duration: video.metadata?.duration || 0,
              createdAt: video.createdAt,
              fileSize: video.size
            }"
            @download="downloadResource(video)"
            @click="previewResource(video)"
           />
        </div>

        <div v-else-if="activeTab === 'gallery' && exportedVideos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           <GalleryVideoCard 
            v-for="video in exportedVideos" 
            :key="video._id" 
            :video="video"
            @download="downloadResource(video)"
            @click="previewResource(video)"
           />
        </div>

        <div v-else class="empty-placeholder">
           <Ghost class="text-6xl text-gray-600 mb-4 block mx-auto" />
           <h3 class="text-xl font-black mb-2">Nothing here yet</h3>
           <p class="text-gray-500">{{ activeTab === 'archives' ? 'Your live stream recordings will appear here.' : 'Exported project videos will be collected here.' }}</p>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > filters.limit" class="mt-16 flex justify-center glass-pagination">
        <el-pagination 
          v-model:current-page="filters.page" 
          v-model:page-size="filters.limit" 
          :total="pagination.total" 
          layout="total, prev, pager, next"
          @update:current-page="handlePageChange"
        />
      </div>
    </main>

    <!-- Dialogs -->
    <el-dialog v-model="showUploadDialog" title="Upload Resources" width="500px" class="glass-dialog custom-dialog" :show-close="false">
      <div class="upload-zone" :class="{ 'uploading': isUploading }" @click="triggerUpload">
        <UploadOne theme="outline" size="48" class="text-blue-400 mb-4" />
        <p class="font-bold text-gray-300">{{ isUploading ? 'Processing upload...' : 'Click or drop files to upload' }}</p>
        <span class="text-xs text-gray-500 mt-2">Images, Videos, and Audio supported</span>
        <input ref="fileInput" type="file" multiple hidden @change="handleFileSelect" />
      </div>
      <template #footer>
        <div class="flex gap-4">
          <button class="flex-1 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all" @click="showUploadDialog = false">Cancel</button>
        </div>
      </template>
    </el-dialog>

    <resource-preview-dialog 
      v-if="showPreviewDialog" 
      :show="showPreviewDialog" 
      :resource="previewFile" 
      @close="showPreviewDialog = false" 
      @delete="deleteResource"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { 
  UploadOne, Search, FolderOne, VideoOne, 
CollectionFiles, Download, Delete, Ghost, FileWord, FilePdf, FileExcel, FilePpt, PlayTwo
} from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'
import { useMediaStore } from '@/stores/media'
import { storeToRefs } from 'pinia'
import { getFileUrl } from '@/utils/api'
import { toast } from 'vue-sonner'

// Components
import GalleryVideoCard from '@/components/projects/GalleryVideoCard.vue'
import ResourcePreviewDialog from '@/components/studio/shared/ResourcePreviewDialog.vue'

const { t } = useTranslations()
const mediaStore = useMediaStore()
const { resources, exportedVideos, loading, pagination } = storeToRefs(mediaStore)

const activeTab = ref('assets')
const tabs = [
  { value: 'assets', name: 'Media Assets' },
  { value: 'archives', name: 'Studio Archive' },
  { value: 'gallery', name: 'Production Gallery' }
]

const assetCategories = [
  { id: 'all', name: 'All Files' },
  { id: 'image/', name: 'Images' },
  { id: 'video/', name: 'Videos' },
  { id: 'audio/', name: 'Audio' },
  { id: 'application/', name: 'Documents' }
]

const filters = reactive({
  search: '',
  category: 'all',
  page: 1,
  limit: 12
})

const showUploadDialog = ref(false)
const showPreviewDialog = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const previewFile = ref<any>(null)

const fetchData = async () => {
  const params: any = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search
  }

  if (activeTab.value === 'assets') {
    if (filters.category !== 'all') params.contentType = filters.category
    await mediaStore.fetchMedia(params)
  } else if (activeTab.value === 'archives') {
    params.purpose = 'recording'
    await mediaStore.fetchMedia(params)
  } else if (activeTab.value === 'gallery') {
    await mediaStore.fetchExportedVideos(params)
  }
}

const handlePageChange = (val: number) => {
  filters.page = val
  fetchData()
}

const triggerUpload = () => fileInput.value?.click()

const handleFileSelect = async (event: any) => {
  const files = event.target.files
  if (!files.length) return

  isUploading.value = true
  const toastId = toast.loading('Uploading assets...')
  
  try {
    for (const file of Array.from(files) as File[]) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('purpose', activeTab.value === 'archives' ? 'recording' : 'project_asset')
      await mediaStore.uploadMedia(formData)
    }
    toast.success('Assets uploaded successfully', { id: toastId })
    showUploadDialog.value = false
    fetchData()
  } catch (e) {
    toast.error('Failed to upload assets', { id: toastId })
  } finally {
    isUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const previewResource = (item: any) => {
  previewFile.value = item
  showPreviewDialog.value = true
}

const downloadResource = (item: any) => {
  window.open(getFileUrl(item.key), '_blank')
}

const deleteResource = async (item: any) => {
  if (confirm('Are you sure you want to delete this resource?')) {
    await mediaStore.deleteMedia(item._id)
    fetchData()
  }
}

const isImage = (type: string) => type?.startsWith('image/')
const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`
}
const formatDate = (d: any) => new Date(d).toLocaleDateString()

watch([activeTab, () => filters.category], () => {
  filters.page = 1
  fetchData()
})

watch(() => filters.search, () => {
  filters.page = 1
  fetchData()
})

onMounted(fetchData)

// Subcomponents
const getIconComponent = (contentType: string) => {
  if (contentType?.startsWith('video/')) return PlayTwo;
  if (contentType?.includes('pdf')) return FilePdf;
  if (contentType?.includes('word') || contentType?.includes('text')) return FileWord;
  if (contentType?.includes('excel') || contentType?.includes('spreadsheet')) return FileExcel;
  if (contentType?.includes('powerpoint') || contentType?.includes('presentation')) return FilePpt;
  return FolderOne;
};
</script>

<style lang="scss" scoped>
.resources-view {
  font-family: 'Outfit', sans-serif;
  background-image: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0, transparent 50%),
    radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.08) 0, transparent 50%);
}

:deep(.premium-segmented) {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.03);
  --el-segmented-item-selected-bg-color: rgba(255, 255, 255, 0.1);
  --el-segmented-item-selected-color: #fff;
  --el-segmented-item-hover-bg-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.cinematic-asset-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);

  &:hover {
    transform: translateY(-8px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .preview-area {
    aspect-ratio: 1;
    background: #000;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-icon {
      font-size: 48px;
      color: rgba(255, 255, 255, 0.2);
    }

    .overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
    }
  }

  .info-area {
    padding: 20px;
    .title {
      font-size: 14px;
      font-weight: 700;
      color: white;
      margin-bottom: 6px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      font-weight: 600;
    }
  }
}

.action-circle-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: white;
    color: black;
    transform: scale(1.1);
  }

  &.danger:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: white;
  }
}

.empty-placeholder {
  text-align: center;
  padding: 100px 0;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 32px;
}

.glass-pagination {
  :deep(.el-pagination) {
    --el-pagination-bg-color: transparent;
    --el-pagination-button-bg-color: rgba(255, 255, 255, 0.05);
    --el-pagination-hover-color: #3b82f6;
    
    .el-pager li {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      &.is-active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
    }
  }
}

.upload-zone {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.02);

  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  &.uploading {
    opacity: 0.5;
    pointer-events: none;
  }
}

:deep(.custom-dialog) {
  background: rgba(15, 15, 20, 0.85) !important;
  backdrop-filter: blur(32px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 32px !important;
  
  .el-dialog__header {
    padding: 32px 32px 0;
    .el-dialog__title { color: white; font-weight: 900; }
  }
  .el-dialog__footer { padding: 0 32px 32px; border: none; }
}

.animate-pulse {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.2; transform: scale(1.05); }
}
</style>
