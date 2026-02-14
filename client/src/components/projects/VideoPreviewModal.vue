<template>
  <el-dialog
    v-model="visible"
    title="Live Stream Recording"
    width="800px"
    class="preview-dialog"
    destroy-on-close
  >
    <div class="dialog-content" v-if="project">
      <div class="video-container">
        <video 
          v-if="videoUrl" 
          :src="videoUrl" 
          controls 
          class="preview-player"
        ></video>
        <div v-else class="no-video">
          <p>No video asset found for this project.</p>
        </div>
      </div>

      <div class="meta-info">
        <h3>{{ project.title }}</h3>
        <p class="date">{{ new Date(project.createdAt).toLocaleString() }}</p>
        <p class="desc">{{ project.description }}</p>
      </div>

      <div class="actions-bar">
        <!-- Publish Section -->
        <div class="publish-section">
          <div class="divider">
            <span>Syndicate Recording</span>
          </div>

          <div v-if="loadingAccounts" class="loading-state">
            Loading platforms...
          </div>
          
          <div v-else-if="accounts.length === 0" class="empty-accounts">
            <p>No connected social accounts found.</p>
            <GButton size="sm" @click="openIntegrations">Connect Accounts</GButton>
          </div>

          <div v-else class="publish-form">
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

            <div class="metadata-form">
               <div class="flex items-center justify-between mb-2">
                 <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Metadata</span>
                 <button 
                  class="text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-all"
                  @click="generateAiHooks"
                  :disabled="loadingHooks"
                 >
                  <magic theme="outline" size="12" />
                  {{ loadingHooks ? 'Generating...' : 'AI Hook Lab' }}
                 </button>
               </div>
               
               <!-- AI Hook Suggestions -->
               <div v-if="aiHooks.length > 0" class="ai-hook-lab mb-4 animate-in fade-in slide-in-from-top-2">
                 <div class="grid grid-cols-3 gap-2">
                   <div 
                    v-for="(hook, idx) in aiHooks" 
                    :key="idx"
                    class="hook-variant p-2 rounded-lg border border-white/5 cursor-pointer bg-white/[0.02] hover:bg-white/5 transition-all text-left"
                    :class="{ 'border-blue-500/50 bg-blue-500/5': selectedHookIdx === idx }"
                    @click="applyHook(idx)"
                   >
                     <div class="text-[8px] font-black uppercase tracking-widest mb-1 text-blue-400 opacity-70">{{ hook.type }}</div>
                     <div class="text-[10px] font-bold truncate leading-tight">{{ hook.title }}</div>
                   </div>
                 </div>
               </div>

               <GInput v-model="publishMetadata.title" label="Title" />
               <GInput v-model="publishMetadata.description" type="textarea" label="Description" />
            </div>

            <div class="schedule-section mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <timer theme="outline" size="16" class="text-blue-400" />
                  <span class="text-[11px] font-black uppercase tracking-widest text-white">Schedule Distribution</span>
                </div>
                <el-switch v-model="isScheduled" />
              </div>

              <div v-if="isScheduled" class="animate-in slide-in-from-top-2">
                <div class="flex items-center gap-4 mb-3">
                  <el-date-picker
                    v-model="scheduledDate"
                    type="datetime"
                    placeholder="Select Date & Time"
                    class="flex-1 !bg-black/40"
                    size="small"
                  />
                  <button 
                    class="h-8 px-4 bg-purple-600/20 text-purple-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-purple-500/30 hover:bg-purple-600/30 transition-all flex items-center gap-2"
                    @click="getAiPeakTime"
                    :disabled="loadingPeakTime"
                  >
                    <magic theme="outline" size="12" />
                    {{ loadingPeakTime ? 'Analyzing...' : 'AI Peak Time' }}
                  </button>
                </div>
                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  AI suggestions are based on platform-specific audience peaks.
                </p>
              </div>
            </div>

            <div class="btn-row">
               <GButton @click="handleDownload" variant="secondary">
                  <download theme="outline" size="18" class="mr-2" />
                  Download
               </GButton>
               <GButton 
                  @click="handlePublish" 
                  variant="accent" 
                  :loading="isPublishing"
                  :disabled="selectedAccountIds.length === 0"
               >
                  <send theme="outline" size="18" class="mr-2" />
                  Syndicate to Selected
               </GButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Download, Send, Youtube, Facebook, Tiktok, PlayOne, CheckOne, Timer, Magic } from '@icon-park/vue-next'
import GButton from '@/components/ui/GButton.vue'
import GInput from '@/components/ui/GInput.vue'
import { toast } from 'vue-sonner'
import { usePlatformStore } from '@/stores/platform'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  modelValue: boolean
  project: any
}>()

const emit = defineEmits(['update:modelValue'])

const platformStore = usePlatformStore()
const { accounts, loading: loadingAccounts } = storeToRefs(platformStore)

// Local state
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const selectedAccountIds = ref<string[]>([])
const publishMetadata = ref({ title: '', description: '' })
const isPublishing = ref(false)
const videoUrl = ref<string>('')
const s3Key = ref<string>('')

const isScheduled = ref(false)
const scheduledDate = ref<Date | null>(null)
const loadingPeakTime = ref(false)

const aiHooks = ref<any[]>([])
const loadingHooks = ref(false)
const selectedHookIdx = ref<number | null>(null)
const hookId = ref<string | undefined>(undefined)

watch(() => props.project, (val) => {
  if (val) {
    // Find the video asset
    // Priority: finalVideo > visualAssets (first video)
    if (val.finalVideo?.s3Url) {
       videoUrl.value = val.finalVideo.s3Url;
       s3Key.value = val.finalVideo.s3Key;
    } else if (val.visualAssets?.length > 0) {
       const asset = val.visualAssets.find((a: any) => a.type === 'video');
       if (asset) {
           // If we have a direct URL (from S3 signed url generation middleware or similar), use it.
           // Else if we only have s3Key, we might need to SIGN it.
           // Assuming 'url' property is pre-signed or proxied.
           videoUrl.value = asset.url || '';
           s3Key.value = asset.s3Key;
       }
    }
    
    // If url is actually an s3 key (backend sometimes returns key as url if not signed), we need to sign it?
    // Let's assume frontend gets a playable URL (pre-signed).
    // If not, we might need a helper `getSignedUrl`.
    // But for now, assume `asset.url` works if `status` is ready.

    publishMetadata.value = {
       title: val.title,
       description: val.description
    }
    selectedAccountIds.value = []
    isScheduled.value = false
    scheduledDate.value = null
    aiHooks.value = []
    selectedHookIdx.value = null
    hookId.value = undefined
    fetchAccounts()
  }
}, { immediate: true })

const fetchAccounts = async () => {
    await platformStore.fetchAccounts()
}

const toggleAccount = (id: string) => {
  const index = selectedAccountIds.value.indexOf(id)
  if (index === -1) selectedAccountIds.value.push(id)
  else selectedAccountIds.value.splice(index, 1)
}

const handleDownload = () => {
    if (!videoUrl.value) return;
    const a = document.createElement('a')
    a.href = videoUrl.value
    a.download = `${props.project.title || 'video'}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

const handlePublish = async () => {
  if (!s3Key.value) {
    toast.error('No video asset found to publish')
    return
  }

  if (isScheduled.value && !scheduledDate.value) {
    toast.error('Please select a schedule date')
    return
  }
  isPublishing.value = true
  try {
    const payload = {
      projectId: props.project._id,
      s3Key: s3Key.value,
      platformAccountIds: selectedAccountIds.value,
      metadata: publishMetadata.value,
      ...(isScheduled.value && { scheduledAt: scheduledDate.value }),
      hookInfo: selectedHookIdx.value !== null ? {
        id: hookId.value,
        type: aiHooks.value[selectedHookIdx.value].type
      } : undefined
    };

    if (isScheduled.value) {
        await platformStore.scheduleSyndication(payload);
    } else {
        await platformStore.publishSyndication(payload);
    }
    
    visible.value = false
  } catch (error: any) {
    console.error(error)
    toast.error(error.message || 'Failed to syndicate')
  } finally {
    isPublishing.value = false
  }
}

const getAiPeakTime = async () => {
  if (selectedAccountIds.value.length === 0) {
    toast.error('Select a platform first');
    return;
  }
  
  loadingPeakTime.value = true;
  try {
    const acc = accounts.value.find(a => a._id === selectedAccountIds.value[0]);
    const timeStr = await platformStore.getBestPostingTime(acc?.platform || 'youtube');
    if (timeStr) {
      // Suggest for today or tomorrow at that time
      const [hours, minutes] = timeStr.split(':').map(Number);
      const suggested = new Date();
      suggested.setUTCHours(hours, minutes, 0, 0);
      
      if (suggested < new Date()) {
        suggested.setUTCDate(suggested.getUTCDate() + 1);
      }
      
      scheduledDate.value = suggested;
      toast.success(`AI suggested peak time: ${timeStr} (UTC)`);
    }
  } catch (err) {
    toast.error('Failed to get AI peak time');
  } finally {
    loadingPeakTime.value = false;
  }
}

const generateAiHooks = async () => {
  loadingHooks.value = true;
  try {
    const context = `${props.project.title} - ${props.project.description}`;
    const hooks = await platformStore.generateHooks(props.project._id, context);
    if (hooks && hooks.length > 0) {
      aiHooks.value = hooks;
      toast.success('Generated 3 viral hook variations');
    }
  } catch (err) {
    toast.error('Failed to generate hooks');
  } finally {
    loadingHooks.value = false;
  }
};

const applyHook = (idx: number) => {
  const hook = aiHooks.value[idx];
  publishMetadata.value.title = hook.title;
  publishMetadata.value.description = hook.description;
  selectedHookIdx.value = idx;
  if (!hookId.value) {
    hookId.value = crypto.randomUUID();
  }
  toast.info(`Applied "${hook.type}" hook variant`);
};

const openIntegrations = () => {
  window.open('/admin/settings?tab=integrations', '_blank')
}
</script>

<style lang="scss" scoped>
.preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.dialog-content {
  padding: 24px;
}

.video-container {
  width: 100%;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  max-height: 450px;
  display: flex;
  justify-content: center;
  align-items: center;

  .preview-player {
    width: 100%;
    max-height: 450px;
  }
}

.meta-info {
  margin-bottom: 24px;
  h3 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
  .date { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
  .desc { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5; }
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &:hover { background: rgba(255,255,255,0.1); }
  &.selected { background: rgba(var(--primary-rgb), 0.1); border-color: var(--primary-color); }

  .platform-icon { font-size: 20px;
    &.youtube { color: #ff0000; }
    &.facebook { color: #1877f2; }
  }
  
  .check-icon { position: absolute; top: 6px; right: 6px; color: var(--primary-color); }
}

.metadata-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
