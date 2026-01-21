<template>
  <el-dialog
    v-model="visible"
    title="Video Production Complete"
    width="850px"
    class="cinematic-dialog publish-dialog"
    destroy-on-close
  >
    <div class="publish-container px-6 pb-6">
      <!-- Top Section: Preview & Sync Status -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2">
          <div class="video-preview-wrapper aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-white/5">
            <GMedia 
              :src="project?.finalVideo?.s3Key || project?.finalVideo?.s3Url" 
              type="video"
              controls 
              class="w-full h-full object-contain"
            />
            
            <div v-if="syncing" class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-md">
                <el-icon class="is-loading text-4xl text-blue-500"><Loading /></el-icon>
                <span class="mt-6 text-white font-medium tracking-wide">{{ syncStatus }}</span>
            </div>
          </div>

          <div class="mt-4 flex gap-4">
             <div class="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-3">
                   <div class="w-2 h-2 rounded-full" :class="project?.finalVideo?.s3Url ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-yellow-500 animate-pulse'"></div>
                   <span class="text-sm font-medium text-white/70">Cloud Sync</span>
                </div>
                <span class="text-xs text-white/40 uppercase font-bold">{{ project?.finalVideo?.s3Url ? 'Archived' : 'Syncing...' }}</span>
             </div>
             <el-button @click="downloadVideo" class="flex-none p-3 px-6 h-auto bg-blue-600 hover:bg-blue-500 border-none text-white font-bold rounded-lg shadow-lg shadow-blue-500/20">
                <div class="flex items-center gap-2 text-sm">
                   <Download class="w-4 h-4" />
                   Save File
                </div>
             </el-button>
          </div>
        </div>

        <!-- Right: Meta & Direct Links -->
        <div class="space-y-6">
           <div class="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10">
              <h4 class="text-xs font-bold text-white/30 uppercase mb-3 tracking-widest">Specifications</h4>
              <div class="space-y-2">
                 <div class="flex justify-between text-sm">
                    <span class="text-white/40">Duration</span>
                    <span class="text-white/80 font-mono">{{ formatDuration(duration) }}</span>
                 </div>
                 <div class="flex justify-between text-sm">
                    <span class="text-white/40">Size</span>
                    <span class="text-white/80 font-mono">{{ formatSize(blobSize) }}</span>
                 </div>
                 <div class="flex justify-between text-sm">
                    <span class="text-white/40">Format</span>
                    <span class="text-white/80 font-mono uppercase">{{ format || 'MP4' }}</span>
                 </div>
              </div>
           </div>

           <div class="social-share-mini">
              <h4 class="text-xs font-bold text-white/30 uppercase mb-4 tracking-widest">Instant Share</h4>
              <div class="grid grid-cols-2 gap-3">
                 <el-button class="mini-social youtube"><i class="el-icon-video-play"></i></el-button>
                 <el-button class="mini-social facebook"><i class="el-icon-share"></i></el-button>
              </div>
           </div>
        </div>
      </div>

      <!-- Bottom: Ant Media Integration -->
      <div class="mt-8 pt-8 border-t border-white/10">
          <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-bold text-white flex items-center gap-3">
                 <img src="https://antmedia.io/wp-content/uploads/2021/05/cropped-antmedia-logo-192x192.png" class="w-6 h-6 grayscale opacity-80" />
                 Stream to Ant Media Server
              </h3>
              <div class="flex items-center gap-2">
                 <div class="status-indicator active"></div>
                 <span class="text-xs font-bold text-green-400/80 uppercase tracking-tighter">Connected</span>
              </div>
          </div>

          <div class="stream-control-panel grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <el-form :model="{ streamId }" label-position="top" class="ams-auth-form">
                  <el-input v-model="streamId" placeholder="Stream ID" class="cinematic-input mb-2" />
                  <p class="text-[11px] text-white/30 mt-[-10px] italic">This ID will be used as the URL slug for your stream.</p>
              </el-form>

              <div class="flex flex-col gap-3 justify-center h-full pt-4">
                  <el-button type="danger" :disabled="isStreaming" class="h-12 text-sm font-bold shadow-xl shadow-red-500/10" @click="startStreaming">
                      <div class="flex items-center gap-2">
                         <span class="pulse-dot red"></span>
                         Push RTMP Stream
                      </div>
                  </el-button>
                  
                  <div class="grid grid-cols-2 gap-3">
                      <el-button type="primary" plain :disabled="isStreaming" class="h-12 text-sm font-bold border-white/10 hover:border-blue-500" @click="startWebRTC">
                           Publish WebRTC
                      </el-button>
                      <el-button type="success" plain :disabled="isStreaming || isSavingVoD" class="h-12 text-sm font-bold border-white/10 hover:border-green-500" @click="saveToVoD">
                           <div class="flex items-center gap-2">
                               <Loading v-if="isSavingVoD" class="animate-spin" style="width: 14px; height: 14px;" />
                               Save to AMS Cloud
                           </div>
                      </el-button>
                  </div>
              </div>
          </div>
      </div>
    </div>

    <template #footer>
      <div class="px-6 pb-4">
        <el-button @click="visible = false" class="w-full h-11 text-sm font-bold border-white/10 bg-white/5 text-white hover:bg-white/10">Finished</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { AntMediaService } from '@/utils/antMedia'
import { useAdminStore } from '@/stores/admin'
import { Download, VideoPlay, Share, Loading } from '@element-plus/icons-vue'
import api, { getFileUrl } from '@/utils/api'
import GMedia from '@/components/ui/GMedia.vue'
import { ElMessage as toast } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  project: any
}>()

const emit = defineEmits(['update:modelValue'])

const adminStore = useAdminStore()
const visible = ref(props.modelValue)

const streamId = ref('antflow-' + Math.random().toString(36).substr(2, 6))
const isStreaming = ref(false)
const isSavingVoD = ref(false)

const syncing = computed(() => props.project?.status === 'processing')
const syncStatus = ref('Optimizing and Finalizing...')
const blobSize = computed(() => props.project?.finalVideo?.fileSize || 0)
const duration = computed(() => props.project?.finalVideo?.duration || 0)
const format = computed(() => props.project?.finalVideo?.s3Key?.split('.').pop() || 'mp4')

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const downloadVideo = async () => {
  const url = await getFileUrl(props.project?.finalVideo?.s3Key || props.project?.finalVideo?.s3Url, { cached: true })
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `antflow-render-${Date.now()}.${format.value}`
  a.click()
}

const startStreaming = async () => {
    if (!streamId.value) return
    
    isStreaming.value = true
    try {
        const result = await api.post(`/projects/${props.project._id}/stream`, {
            streamId: streamId.value
        })

        if (result.data.success) {
            const settings = adminStore.settings?.apiConfigs?.antMedia
            toast.success(`Broadcasting started!`)
            if (settings?.baseUrl && settings?.appName) {
                window.open(`${settings.baseUrl}/${settings.appName}/play.html?name=${result.data.data.streamId}`, '_blank')
            }
        }
    } catch (e: any) {
        toast.error(`Streaming failed: ${e.response?.data?.error || e.message}`)
    } finally {
        isStreaming.value = false
    }
}

const startWebRTC = async () => {
    await startStreaming()
}

const saveToVoD = async () => {
    isSavingVoD.value = true
    try {
        const result = await api.post(`/projects/${props.project._id}/vod`)
        if (result.data.success) {
            toast.success(`Video saved to Ant Media VoD!`)
        }
    } catch (e: any) {
        toast.error(`VoD Upload failed: ${e.response?.data?.error || e.message}`)
    } finally {
        isSavingVoD.value = false
    }
}

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

onUnmounted(() => {
    // Blob URLs are managed by blobCache via getFileUrl
})
</script>

<style lang="scss" scoped>
.publish-dialog {
    :deep(.el-dialog) {
        border-radius: 20px;
        overflow: hidden;
    }
}

.mini-social {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    height: 48px;
    width: 100%;
    color: white;
    font-size: 20px;
    
    &:hover {
        background: rgba(255,255,255,0.1);
        transform: translateY(-2px);
    }
    
    &.youtube:hover { color: #f00; border-color: rgba(255,0,0,0.3); }
    &.facebook:hover { color: #1877f2; border-color: rgba(24,119,242,0.3); }
}

.pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    
    &.red {
        background: #ef4444;
        animation: pulse-red 2s infinite;
    }
}

.status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    &.active { background: #4ade80; box-shadow: 0 0 10px #4ade80; }
}

@keyframes pulse-red {
	0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
	70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
	100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.high-contrast-input {
    :deep(.el-input__wrapper) {
        background: rgba(255,255,255,0.05) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        box-shadow: none !important;
        height: 44px;
        
        input { color: #fff; font-weight: 500; }
    }
}
</style>
