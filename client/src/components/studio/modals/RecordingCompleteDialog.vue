<template>
  <el-dialog
    v-model="visible"
    :title="$t('studio.modals.recordingComplete.title')"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    class="recording-dialog"
  >
    <div class="dialog-content">
      <!-- Video Preview -->
      <div class="video-preview">
        <video 
          v-if="recordedUrl" 
          :src="recordedUrl" 
          controls 
          class="preview-player"
        ></video>
      </div>

      <!-- Actions -->
      <div class="actions-bar">
        <!-- Step 1: Local Actions -->
        <div class="primary-actions">
          <GButton 
            @click="handleDownload" 
            variant="secondary" 
            class="action-btn"
          >
            <download theme="outline" size="18" class="mr-2" />
            {{ $t('studio.common.download') }}
          </GButton>

          <GButton 
            @click="handleSaveToGallery" 
            variant="primary" 
            class="action-btn"
            :loading="isSaving"
            :disabled="isSaved"
          >
            <save theme="outline" size="18" class="mr-2" />
            {{ isSaved ? $t('studio.modals.recordingComplete.saved') : $t('studio.modals.recordingComplete.save') }}
          </GButton>
        </div>

        <!-- Step 2: Publish Actions (Visible after save) -->
        <div v-if="isSaved" class="publish-section">
          <div class="divider">
            <span>{{ $t('studio.modals.recordingComplete.publish') }}</span>
          </div>

          <div v-if="loadingAccounts" class="loading-state">
            {{ $t('studio.modals.recordingComplete.loadingAccounts') }}
          </div>
          
          <div v-else-if="accounts.length === 0" class="empty-accounts">
            <p>{{ $t('studio.modals.recordingComplete.noAccounts') }}</p>
            <GButton size="sm" @click="openIntegrations">{{ $t('studio.modals.recordingComplete.connectAccounts') }}</GButton>
          </div>

          <div v-else class="publish-form">
            <!-- Platform Selection -->
            <div class="platform-list">
              <div 
                v-for="acc in accounts" 
                :key="acc._id"
                class="platform-item"
                :class="{ selected: selectedAccountIds.includes(acc._id) }"
                @click="toggleAccount(acc._id)"
              >
                <div class="platform-icon" :class="acc.platform">
                  <youtube v-if="acc.platform === 'youtube'" theme="filled" />
                  <facebook v-else-if="acc.platform === 'facebook'" theme="filled" />
                  <tiktok v-else-if="acc.platform === 'tiktok'" theme="filled" />
                  <play-one v-else theme="filled" />
                </div>
                <span class="account-name">{{ acc.accountName || acc.platform }}</span>
                <check-one v-if="selectedAccountIds.includes(acc._id)" theme="filled" class="check-icon" />
              </div>
            </div>

            <!-- Metadata -->
            <div class="metadata-form">
              <GInput v-model="publishMetadata.title" :placeholder="$t('studio.modals.recordingComplete.videoTitle')" :label="$t('studio.common.title')" />
              <GInput v-model="publishMetadata.description" :placeholder="$t('studio.common.description')" type="textarea" :label="$t('studio.common.description')" />
            </div>

            <GButton 
              @click="handlePublish" 
              variant="accent" 
              class="publish-btn"
              :loading="isPublishing"
              :disabled="selectedAccountIds.length === 0"
            >
              <send theme="outline" size="18" class="mr-2" />
              {{ $t('studio.modals.recordingComplete.publishSelected') }}
            </GButton>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Download, Save, Send, Youtube, Facebook, Tiktok, PlayOne, CheckOne } from '@icon-park/vue-next'
import GButton from '@/components/ui/GButton.vue'
import GInput from '@/components/ui/GInput.vue'
import api from '@/utils/api'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
import { usePlatformStore } from '@/stores/platform'

const props = defineProps<{
  modelValue: boolean
  recordedUrl: string | null
  projectId?: string
  isSaving?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'download', 'save', 'close'])

const router = useRouter()
const isSaved = ref(false)
const savedProjectId = ref<string>('')
const savedS3Key = ref<string>('')

const accounts = ref<any[]>([])
const loadingAccounts = ref(false)
const selectedAccountIds = ref<string[]>([])
const publishMetadata = ref({
  title: '',
  description: ''
})
const isPublishing = ref(false)
const platformStore = usePlatformStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.projectId) {
      savedProjectId.value = props.projectId
      // If projectId exists and we are just finishing recording, it's not strictly "saved" as an asset yet unless we treat generic project existence as saved.
      // But the "Save to Gallery" action uploads the specific recording file.
      // So we reset isSaved to false until user uploads THIS recording.
    }
    isSaved.value = false 
    savedS3Key.value = ''
    selectedAccountIds.value = []
    publishMetadata.value = { title: '', description: '' }
    fetchAccounts()
  }
})

const fetchAccounts = async () => {
  loadingAccounts.value = true
  try {
    const data = await platformStore.fetchAccounts()
    // accounts is updated in store, but we are using local ref?
    // platformStore.fetchAccounts updates platformStore.accounts
    // We should probably rely on store state or update local ref from store.
    // Let's use store state if possible or copy it.
    // Looking at platformStore, fetchAccounts updates this.accounts.
    // But fetchAccounts in platformStore is void (promise<void>).
    // So we should read from store.
    // However, existing code writes to local accounts ref.
    // platformStore.fetchAccounts logic:
    /*
        async fetchAccounts() {
            // ...
            if (res.data.success) {
                this.accounts = res.data.data;
            }
            // ...
        }
    */
   // So we can use platformStore.accounts
  } catch (error) {
    console.error('Failed to fetch accounts', error)
  } finally {
    loadingAccounts.value = false
  }
}

// Watch store accounts
watch(() => platformStore.accounts, (val) => {
    accounts.value = val
}, { immediate: true })

const handleDownload = () => {
  if (!props.recordedUrl) return
  const a = document.createElement('a')
  a.href = props.recordedUrl
  a.download = `recording_${new Date().toISOString()}.webm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  emit('download')
}

const handleSaveToGallery = () => {
  // We emit save, parent handles logic and should return result or we need a way to get the result back.
  // Since emit is void, we probably need the parent to pass a callback or we handle saving here if we passed the save function.
  // But props are read-only.
  // Best pattern: Emit 'save' and wait? No, standard emit doesn't await.
  // Alternative: The parent passes the `save` function as a prop, or we structure this component to handle the API call using a composable.
  // But `useStudioRecorder` is in parent.
  // Let's modify LiveStudio to pass a `onSave` prop which returns promise.
  emit('save', (result: any) => {
    if (result && result.s3Key) {
      savedProjectId.value = result.projectId
      savedS3Key.value = result.s3Key
      isSaved.value = true
      toast.success('Ready to publish!')
    }
  })
}

const toggleAccount = (id: string) => {
  const index = selectedAccountIds.value.indexOf(id)
  if (index === -1) {
    selectedAccountIds.value.push(id)
  } else {
    selectedAccountIds.value.splice(index, 1)
  }
}

const handlePublish = async () => {
  if (!savedS3Key.value || !savedProjectId.value) {
    toast.error('Asset not saved correctly')
    return
  }
  
  isPublishing.value = true
  try {
    await platformStore.publishSyndication({
      projectId: savedProjectId.value,
      s3Key: savedS3Key.value,
      platformAccountIds: selectedAccountIds.value,
      metadata: publishMetadata.value
    })
    toast.success('Publishing started!')
    visible.value = false // Close after publish start
  } catch (error: any) {
    console.error(error)
    toast.error('Failed to publish')
  } finally {
    isPublishing.value = false
  }
}

const openIntegrations = () => {
  window.open('/admin/settings?tab=integrations', '_blank')
}
</script>

<style lang="scss" scoped>
.recording-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.dialog-content {
  padding: 24px;
}

.video-preview {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  margin-bottom: 24px;
  aspect-ratio: 16/9;

  .preview-player {
    width: 100%;
    height: 100%;
    /* object-fit: cover; */ /* Remove cover to see full video context */
  }
}

.actions-bar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.primary-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.publish-section {
  animation: slideDown 0.3s ease-out;
}

.divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.1);
  }
  
  span {
    padding: 0 12px;
  }
}

.platform-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.1);
  }

  &.selected {
    background: rgba(var(--primary-rgb), 0.1);
    border-color: var(--primary-color);
  }

  .platform-icon {
    &.youtube { color: #ff0000; }
    &.facebook { color: #1877f2; }
    &.tiktok { color: #00f2ea; }
    font-size: 20px;
  }

  .account-name {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .check-icon {
    position: absolute;
    top: 6px;
    right: 6px;
    color: var(--primary-color);
    font-size: 14px;
  }
}

.metadata-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.publish-btn {
  width: 100%;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-accounts {
  text-align: center;
  padding: 24px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
  color: #999;
}
</style>
