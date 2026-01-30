<template>
  <div class="license-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="glow-title">{{ t('license.title') }}</h1>
          <p class="subtitle">{{ t('license.description') }}</p>
        </div>
        <GButton type="primary" size="lg" @click="showLicenseIssueDialog = true">
          {{ t('license.add') }}
        </GButton>
      </div>

      <div class="filters-bar">
        <GInput v-model="searchQuery" :placeholder="t('license.search')" class="search-input">
          <template #prefix>
            <search theme="outline" size="18" />
          </template>
        </GInput>

        <div class="filter-tabs">
          <GSegmented v-model="currentLicenseType" :options="licenseTypeFilters" class="type-segmented" />
        </div>
      </div>

      <div v-if="loading" class="license-grid">
        <GCard v-for="i in 8" :key="i" class="license-card skeleton"></GCard>
      </div>

      <div v-else-if="filteredLicenses.length > 0" class="flex flex-row">
        <GTable :data="filteredLicenses" stripe highlight-current-row>
          <el-table-column type="index" width="50px" />
          <el-table-column prop="owner" label="Owner" />
          <el-table-column prop="tier" label="Type">
            <template #default="{ row }">
              <el-tag>{{ row.tier }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="maxUsersPerInstance" label="Max Users" />
          <el-table-column prop="maxProjectsPerInstance" label="Max Projects" />
          <!-- <el-table-column prop="durationDays" label="Duration Days" /> -->
          <el-table-column prop="createdAt" label="Created At">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="Updated At">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Actions">
            <template #default="{ row }">
              <el-button type="primary" plain bg circle :icon="PlayOne" @click="handlePreviewLicense(row)" />
              <el-button type="danger" plain bg circle :icon="Delete" @click="deleteLicense(row)" />
            </template>
          </el-table-column>
        </GTable>
        <!-- <GCard
          v-for="license in filteredLicenses"
          :key="license._id"
          class="license-card"
          :bodyStyle="{ padding: '0px !important' }"
        >
          <div class="license-preview" @click="previewLicense(license)">
            <img 
              v-if="isImage(license.contentType)" 
              :src="getFileUrl(license.key)"
              :alt="license.fileName"
              class="preview-image"
              loading="lazy"
            />
            <div v-else-if="isVideo(license.contentType)" class="file-icon video-icon">
              <play-one theme="filled" size="32" fill="#fff" />
            </div>
            <div v-else class="file-icon">
              {{ getFileIcon(license.contentType) }}
            </div>
          </div>
          <div class="license-info">
            <h4>{{ license.fileName }}</h4>
            <div class="license-meta">
              <span>{{ formatFileSize(license.size) }}</span>
              <span>{{ formatDate(license.createdAt) }}</span>
            </div>
          </div>
          <div class="license-actions">
            <button class="action-btn" @click="downloadLicense(license)">
              <download theme="outline" size="16" />
              {{ t('license.download') }}
            </button>
            <button class="action-btn danger" @click="deleteLicense(license)">
              <delete theme="outline" size="16" />
              {{ t('license.delete') }}
            </button>
          </div>
        </GCard> -->
      </div>

      <div v-else class="empty-state">
        <GCard class="empty-card">
          <div class="empty-icon">📁</div>
          <h3>{{ t('license.noLicenses') }}</h3>
          <p>{{ t('license.noLicensesDesc') }}</p>
          <GButton type="primary" size="lg" @click="showLicenseIssueDialog = true">
            {{ t('license.issue') }}
          </GButton>
        </GCard>
      </div>
    </div>

    <!-- License Issue Dialog -->
    <GDialog v-model="showLicenseIssueDialog" :title="t('license.issue')" width="500px">
      <div class="license-form g-form flex flex-col gap-2" v-loading="isUploading">
        <label>{{ t('license.owner') }}</label>
        <GInput v-model="licenseForm.owner" :placeholder="t('license.owner')" />
        <label>{{ t('license.type') }}</label>
        <GSelect v-model="licenseForm.tier" :placeholder="t('license.type')">
          <el-option v-for="item in licenseTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </GSelect>
        <label>{{ t('license.maxUsers') }}</label>
        <GInputNumber v-model="licenseForm.maxUsersPerInstance" :min="1"
          :placeholder="t('license.maxUsersPerInstance')" />
        <label>{{ t('license.maxProjects') }}</label>
        <GInputNumber v-model="licenseForm.maxProjectsPerInstance" :min="1"
          :placeholder="t('license.maxProjectsPerInstance')" />
        <label>{{ t('license.durationDays') }}</label>
        <GInputNumber v-model="licenseForm.durationDays" :min="1" :placeholder="t('license.durationDays')" />
        <el-divider />
        <GButton type="primary" @click="handleAddLicense">{{ t('license.issue') }}</GButton>
      </div>
    </GDialog>

    <!-- License Preview Dialog -->
    <GDialog v-model="showPreviewDialog" :title="previewLicense?.key" width="500px" custom-class="preview-dialog">
      <div class="preview-content flex flex-col gap-2">
        <label>{{ t('license.owner') }}</label>
        <GInput v-model="previewLicense.owner" :placeholder="t('license.owner')" />
        <label>{{ t('license.type') }}</label>
        <GSelect v-model="previewLicense.tier" :placeholder="t('license.type')">
          <el-option v-for="item in licenseTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </GSelect>
        <label>{{ t('license.maxUsers') }}</label>
        <GInputNumber v-model="previewLicense.maxUsersPerInstance" :min="1"
          :placeholder="t('license.maxUsersPerInstance')" />
        <label>{{ t('license.maxProjects') }}</label>
        <GInputNumber v-model="previewLicense.maxProjectsPerInstance" :min="1"
          :placeholder="t('license.maxProjectsPerInstance')" />
        <label>{{ t('license.startDate') }}</label>
        <el-date-picker class="w-full" v-model="previewLicense.startDate" :placeholder="t('license.startDate')" />
        <label>{{ t('license.endDate') }}</label>
        <el-date-picker class="w-full" v-model="previewLicense.endDate" :placeholder="t('license.endDate')" />
        <el-divider />
        <GButton type="primary" @click="handleUpdateLicense">{{ t('license.update') }}</GButton>
      </div>
    </GDialog>
  </div>
</template>

<script setup lang="ts">
import {
  Search,
  Delete,
  PlayOne
} from '@icon-park/vue-next'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import { ref, computed, watch, onMounted } from 'vue'
import GButton from '@/components/ui/GButton.vue'
import GInput from '@/components/ui/GInput.vue'
import GCard from '@/components/ui/GCard.vue'
import GSegmented from '@/components/ui/GSegmented.vue'
import GDialog from '@/components/ui/GDialog.vue'
// import GLabel from '@/components/ui/GLabel.vue'
import { useLicenseStore } from '@/stores/license'
import { storeToRefs } from 'pinia'
import GInputNumber from '@/components/ui/GInputNumber.vue'
import GTable from '@/components/ui/GTable.vue'

const { t } = useTranslations()
const licenseStore = useLicenseStore()

const { licenses, loading } = storeToRefs(licenseStore)
const searchQuery = ref('')
const currentLicenseType = ref('all')
const showLicenseIssueDialog = ref(false)
const showPreviewDialog = ref(false)
const previewLicense = ref<any>({
  owner: '',
  tier: 'trial',
  maxUsersPerInstance: 5,
  maxProjectsPerInstance: 10,
  durationDays: 30,
  startDate: new Date(),
  endDate: new Date()
})
// const fileInput = ref<HTMLInputElement>()
const isUploading = ref(false)
const licenseForm = ref({
  owner: '',
  tier: 'trial',
  maxUsersPerInstance: 5,
  maxProjectsPerInstance: 10,
  durationDays: 30
})

const licenseTypeFilters = computed(() => [
  { value: 'all', label: t('license.filterAll') },
  { value: 'valid', label: t('license.filterValid') },
  { value: 'expired', label: t('license.filterExpired') },
  { value: 'blocked', label: t('license.filterBlocked') }
])

const licenseTypeOptions = computed(() => [
  { value: 'trial', label: t('license.typeTrial') },
  { value: 'basic', label: t('license.typeBasic') },
  { value: 'pro', label: t('license.typePro') },
  { value: 'enterprise', label: t('license.typeEnterprise') }
])

const filteredLicenses = computed(() => {
  let filtered = licenses.value || []

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(r => r.fileName.toLowerCase().includes(query))
  }

  return filtered
})

// Helper to get S3 file URL
// const getFileUrl = (key: string) => {
//   if (!key) return ''
//   if (key.startsWith('http')) return key
//   return `/api/s3/${key}`
// }

// const isImage = (contentType: string) => {
//   return contentType?.startsWith('image/')
// }

// const isVideo = (contentType: string) => {
//   return contentType?.startsWith('video/')
// }

const fetchLicenses = () => {
  licenseStore.fetchLicenses(currentLicenseType.value !== 'all' ? currentLicenseType.value : undefined)
}

const handleAddLicense = async () => {
  if (!licenseForm.value?.owner) {
    toast.error(t('license.ownerRequired'))
    return
  }
  if (!licenseForm.value?.tier) {
    toast.error(t('license.typeRequired'))
    return
  }
  if (!licenseForm.value?.maxUsersPerInstance) {
    toast.error(t('license.maxUsersRequired'))
    return
  }
  if (!licenseForm.value?.maxProjectsPerInstance) {
    toast.error(t('license.maxProjectsRequired'))
    return
  }
  if (!licenseForm.value?.durationDays) {
    toast.error(t('license.durationDaysRequired'))
    return
  }
  try {
    isUploading.value = true
    await licenseStore.addLicense(licenseForm.value)
    //reset form
    licenseForm.value = {
      owner: '',
      tier: 'trial',
      maxUsersPerInstance: 5,
      maxProjectsPerInstance: 10,
      durationDays: 30
    }
    showLicenseIssueDialog.value = false
  } catch (error) {
    console.error(error)
    toast.error(t('common.failed'))
  } finally {
    isUploading.value = false
  }
}

const handleUpdateLicense = async () => {
  if (!previewLicense.value?.owner) {
    toast.error(t('license.ownerRequired'))
    return
  }
  if (!previewLicense.value?.tier) {
    toast.error(t('license.typeRequired'))
    return
  }
  if (!previewLicense.value?.maxUsersPerInstance) {
    toast.error(t('license.maxUsersRequired'))
    return
  }
  if (!previewLicense.value?.maxProjectsPerInstance) {
    toast.error(t('license.maxProjectsRequired'))
    return
  }
  if (!previewLicense.value?.durationDays) {
    toast.error(t('license.durationDaysRequired'))
    return
  }
  try {
    isUploading.value = true
    await licenseStore.updateLicense(previewLicense.value._id, previewLicense.value)
    //reset form
    previewLicense.value = {
      owner: '',
      tier: 'trial',
      maxUsersPerInstance: 5,
      maxProjectsPerInstance: 10,
      durationDays: 30,
      startDate: new Date(),
      endDate: new Date()
    }
    showPreviewDialog.value = false
  } catch (error) {
    console.error(error)
    toast.error(t('common.failed'))
  } finally {
    isUploading.value = false
  }
}

// const handleFileSelect = async (event: Event) => {
//   const files = (event.target as HTMLInputElement).files
//   if (!files?.length) return

//   isUploading.value = true
//   try {
//     for (const file of Array.from(files)) {
//       const formData = new FormData()
//       formData.append('file', file)
//       formData.append('purpose', 'media')
//       await licenseStore.uploadLicense(formData)
//     }
//     toast.success('Upload complete')
//     showLicenseIssueDialog.value = false
//   } catch (error: any) {
//     console.error('Upload failed:', error)
//   } finally {
//     isUploading.value = false
//     if (fileInput.value) fileInput.value.value = ''
//   }
// }

const handlePreviewLicense = (license: any) => {
  previewLicense.value = license
  showPreviewDialog.value = true
}

// const downloadLicense = (license: any) => {
//   window.open(getFileUrl(license.key), '_blank')
// }

const deleteLicense = async (license: any) => {
  if (!confirm(t('license.confirmDelete'))) return

  try {
    await licenseStore.deleteLicense(license._id)
    toast.success('File deleted successfully')
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to delete file')
  }
}

// const getFileIcon = (contentType: string) => {
//   if (contentType?.includes('pdf')) return '📄'
//   if (contentType?.includes('word')) return '📝'
//   if (contentType?.includes('presentation')) return '📊'
//   if (contentType?.includes('spreadsheet') || contentType?.includes('excel')) return '📈'
//   return '📁'
// }

// const formatFileSize = (bytes: number) => {
//   if (!bytes) return '0 B'
//   const mb = bytes / (1024 * 1024)
//   if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
//   return `${mb.toFixed(1)} MB`
// }

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}

watch(currentLicenseType, () => {
  fetchLicenses()
})

onMounted(() => {
  fetchLicenses()
})
</script>

<style lang="scss" scoped>
.license-page {
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
  margin-bottom: 32px;
}

.filters-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
  align-items: center;

  .search-input {
    max-width: 300px;
  }
}

.type-segmented {
  max-width: 500px;
}

.license-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.license-card {
  position: relative;

  :deep(.g-card__body) {
    padding: 0;
  }

  &.skeleton {
    height: 280px;
    animation: pulse 1.5s infinite;
  }
}

.license-preview {
  height: 160px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
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
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
}

.license-info {
  padding: 16px 24px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fff;
  }

  .license-meta {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
}

.license-actions {
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
  color: rgba(255, 255, 255, 0.6);
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

    &:hover {
      background: rgba(255, 82, 82, 0.1);
    }
  }
}

.empty-state {
  text-align: center;
  max-width: 600px;
  margin: 100px auto;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 24px;
  }

  h3 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  p {
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 32px;
  }
}

.license-form {
  padding: 10px;
}

.upload-placeholder {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px;
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
    color: rgba(255, 255, 255, 0.6);
  }
}

.preview-content {
  display: flex;
  //   align-items: center;
  justify-content: center;
  //   background: #000;
  width: 100%;
  //   height: 60vh;

  img,
  video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>
