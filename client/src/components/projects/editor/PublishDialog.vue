<template>
    <el-dialog v-model="visible" width="900px" class="cinematic-dialog publish-dialog overflow-hidden" destroy-on-close>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="h-8 w-1.5 bg-green-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                <h3 class="text-sm font-black uppercase tracking-[0.2em] text-white/90">Production Complete</h3>
            </div>
        </template>

        <div class="publish-container px-4 pb-4">
            <!-- Top Section: Preview & Sync Status -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-2">
                    <div
                        class="video-preview-wrapper aspect-video bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative border border-white/5 ring-1 ring-white/5 p-1">
                        <div class="w-full h-full rounded-xl overflow-hidden relative">
                            <GMedia :src="project?.finalVideo?.s3Key || project?.finalVideo?.s3Url" type="video"
                                controls class="w-full h-full object-contain" />

                            <div v-if="syncing"
                                class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-xl">
                                <el-icon class="is-loading text-4xl text-brand-primary">
                                    <Loading />
                                </el-icon>
                                <span class="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/90">{{
                                    syncStatus }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="mt-6 flex gap-4">
                        <div
                            class="flex-1 p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-2.5 h-2.5 rounded-full"
                                    :class="project?.finalVideo?.s3Url ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.4)]'">
                                </div>
                                <span class="text-[11px] font-black uppercase tracking-widest text-white/70">Cloud
                                    Storage</span>
                            </div>
                            <span class="text-[10px] text-white/40 uppercase font-black tracking-tighter">{{
                                project?.finalVideo?.s3Url ? 'Archived' : 'Syncing...' }}</span>
                        </div>
                        <el-button @click="downloadVideo"
                            class="cinematic-button !h-auto !px-8 !bg-brand-primary !text-white !border-transparent !rounded-xl shadow-[0_8px_20px_rgba(59,130,246,0.3)] hover:!scale-[1.02] active:!scale-95 group">
                            <div class="flex items-center gap-2.5 py-1">
                                <Download :size="16" :stroke-width="5"
                                    class="group-hover:translate-y-0.5 transition-transform" />
                                <span class="text-[11px] font-black uppercase tracking-widest">Download</span>
                            </div>
                        </el-button>
                    </div>
                </div>

                <!-- Right: Meta & Direct Links -->
                <div class="space-y-6">
                    <div class="p-6 rounded-2xl bg-black/40 border border-white/5 ring-1 ring-white/5">
                        <h4 class="text-[10px] font-black text-white/30 uppercase mb-4 tracking-[0.2em]">Specifications
                        </h4>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span
                                    class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Duration</span>
                                <span class="text-white font-mono font-black text-xs tracking-tighter">{{
                                    formatDuration(duration) }}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">File
                                    Size</span>
                                <span class="text-white font-mono font-black text-xs tracking-tighter">{{
                                    formatSize(blobSize) }}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span
                                    class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Format</span>
                                <span class="text-white font-mono font-black text-xs uppercase tracking-tighter">{{
                                    format || 'MP4' }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="social-share-mini">
                        <h4 class="text-[10px] font-black text-white/30 uppercase mb-4 tracking-[0.2em]">Instant Share
                        </h4>
                        <div class="grid grid-cols-2 gap-3">
                            <el-button
                                class="mini-social youtube rounded-xl !bg-red-500/10 !border-red-500/20 hover:!bg-red-500/20">
                                <VideoPlay :size="24" />
                            </el-button>
                            <el-button
                                class="mini-social facebook rounded-xl !bg-brand-primary/10 !border-brand-primary/20 hover:!bg-brand-primary/20">
                                <Share :size="24" />
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom: Ant Media Integration -->
            <div class="mt-10 pt-8 border-t border-white/5">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/5">
                            <img src="https://antmedia.io/wp-content/uploads/2021/05/cropped-antmedia-logo-192x192.png"
                                class="w-6 h-6 grayscale opacity-80" />
                        </div>
                        <div class="flex flex-col">
                            <h3 class="text-xs font-black text-white/90 uppercase tracking-[0.2em]">Ant Media
                                Integration</h3>
                            <span class="text-[10px] font-bold text-white/30 uppercase tracking-tighter mt-0.5">Stream
                                live or save to cloud VoD</span>
                        </div>
                    </div>
                    <div
                        class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                        <div class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                        <span class="text-[9px] font-black text-green-400 uppercase tracking-widest">Connected</span>
                    </div>
                </div>

                <div class="stream-control-panel grid grid-cols-1 md:grid-cols-2 gap-10 items-start px-2">
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Stream
                                Identifier</label>
                            <el-input v-model="streamId" placeholder="Stream ID" class="cinematic-input-ghost" />
                            <p class="text-[10px] font-bold text-white/20 px-1 italic">This ID will be used as the URL
                                slug for your production stream.</p>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3.5">
                        <el-button type="danger" :disabled="isStreaming"
                            class="cinematic-button !h-12 !rounded-2xl !bg-red-500 !text-white !border-transparent shadow-[0_8px_25px_rgba(239,68,68,0.3)] hover:!scale-[1.02] active:!scale-95 !transition-all group"
                            @click="startStreaming">
                            <div class="flex items-center gap-3">
                                <span
                                    class="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#fff] animate-pulse"></span>
                                <span class="text-xs font-black uppercase tracking-[0.2em]">Push RTMP Stream</span>
                            </div>
                        </el-button>

                        <div class="grid grid-cols-2 gap-4">
                            <el-button :disabled="isStreaming"
                                class="cinematic-button !h-12 !rounded-xl !bg-white/5 !border-white/10 !text-white/80 hover:!bg-white/10 hover:!text-white"
                                @click="startWebRTC">
                                <span class="text-[10px] font-black uppercase tracking-widest">Live WebRTC</span>
                            </el-button>
                            <el-button :disabled="isStreaming || isSavingVoD"
                                class="cinematic-button !h-12 !rounded-xl !bg-green-500/20 !border-green-500/30 !text-green-500 hover:!bg-green-500/30 hover:!text-white hover:!border-green-500/50"
                                @click="saveToVoD">
                                <div class="flex items-center gap-2.5">
                                    <Loading v-if="isSavingVoD" class="animate-spin" :size="14" />
                                    <span class="text-[10px] font-black uppercase tracking-widest">Save to VoD</span>
                                </div>
                            </el-button>
                        </div>

                        <!-- Stream Metrics -->
                        <div v-if="isStreaming && streamStatus"
                            class="mt-4 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20 space-y-3 animate-in fade-in duration-500">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Live
                                    Metrics</span>
                                <div class="flex items-center gap-2">
                                    <div class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                    <span class="text-[9px] font-black text-red-400 uppercase tracking-widest">{{
                                        streamStatus.status }}</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div class="metric-item">
                                    <p class="text-[8px] font-black text-white/30 uppercase tracking-tighter mb-1">
                                        Viewers</p>
                                    <p class="text-sm font-black text-white font-mono">{{ streamStatus.renderersCount ||
                                        0 }}</p>
                                </div>
                                <div class="metric-item">
                                    <p class="text-[8px] font-black text-white/30 uppercase tracking-tighter mb-1">
                                        Bitrate</p>
                                    <p class="text-sm font-black text-white font-mono">{{ streamStatus.speed || '0' }}
                                        kbps</p>
                                </div>
                            </div>
                        </div>

                        <!-- Simulcast / Restream Section -->
                        <div class="mt-4 bg-black/30 rounded-xl p-4 border border-white/5">
                            <div class="flex items-center justify-between cursor-pointer group"
                                @click="showSimulcast = !showSimulcast">
                                <span
                                    class="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">Simulcast
                                    / Restream</span>
                                <el-icon :class="{ 'rotate-180': showSimulcast }"
                                    class="text-white/30 transition-transform group-hover:text-white/60">
                                    <ArrowDown />
                                </el-icon>
                            </div>

                            <div v-if="showSimulcast"
                                class="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div v-for="(endpoint, idx) in rtmpEndpoints" :key="idx" class="flex gap-2">
                                    <el-input v-model="endpoint.url" placeholder="rtmp://a.rtmp.youtube.com/live2/KEY"
                                        class="cinematic-input-ghost flex-1 !h-9" />
                                    <el-button @click="removeEndpoint(idx)"
                                        class="cinematic-button !h-9 !w-9 !p-0 !rounded-lg !border-red-500/20 !text-red-400 hover:!bg-red-500/20"><el-icon>
                                            <Delete />
                                        </el-icon></el-button>
                                </div>
                                <el-button type="primary" link @click="addEndpoint"
                                    class="!text-[10px] font-black uppercase tracking-widest !text-brand-primary/80 hover:!text-brand-primary">+
                                    Add Endpoint</el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="px-4 pb-4">
                <el-button @click="visible = false"
                    class="cinematic-button !w-full !h-12 !rounded-2xl !bg-white/5 !border-white/10 !text-white/80 hover:!bg-white/10 hover:!text-white shadow-xl">
                    <span class="text-[11px] font-black uppercase tracking-[0.2em]">Exit Production View</span>
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { AntMediaService } from '@/utils/antMedia'
import { useAdminStore } from '@/stores/admin'
import { useProjectStore } from '@/stores/project'
import { useUIStore } from '@/stores/ui'
import { Download, VideoPlay, Share, Loading, ArrowDown, Delete } from '@element-plus/icons-vue'
import { getFileUrl } from '@/utils/api'
import GMedia from '@/components/ui/GMedia.vue'
import { ElMessage as toast } from 'element-plus'

const props = defineProps<{
    modelValue: boolean
    project: any
}>()

const emit = defineEmits(['update:modelValue'])

const adminStore = useAdminStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const visible = ref(props.modelValue)

const streamId = ref(uiStore.appName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 9))
const isStreaming = ref(false)
const isSavingVoD = ref(false)
const showSimulcast = ref(false)
const rtmpEndpoints = ref<{ url: string }[]>([])
const streamStatus = ref<any>(null)
let pollInterval: any = null

const ams = computed(() => {
    const config = adminStore.settings?.apiConfigs?.antMedia
    if (!config?.baseUrl) return null
    return new AntMediaService(config)
})

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

const addEndpoint = () => {
    rtmpEndpoints.value.push({ url: '' })
}

const removeEndpoint = (index: number) => {
    rtmpEndpoints.value.splice(index, 1)
}

const downloadVideo = async () => {
    const url = await getFileUrl(props.project?.finalVideo?.s3Key || props.project?.finalVideo?.s3Url, { cached: true })
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    const appSlug = uiStore.appName.toLowerCase().replace(/\s+/g, '_')
    a.download = `${appSlug}_render_${Date.now()}.${format.value}`
    a.click()
}

const startStreaming = async () => {
    if (!streamId.value) return

    isStreaming.value = true
    try {
        const result = await projectStore.startStreaming(props.project._id, streamId.value)

        if (result.success) {
            const settings = adminStore.settings?.apiConfigs?.antMedia
            toast.success(`Broadcasting started!`)

            // Start Polling
            startPolling()

            // Handle Restream Endpoints
            if (rtmpEndpoints.value.length > 0) {
                let addedCount = 0;
                for (const endpoint of rtmpEndpoints.value) {
                    if (endpoint.url && endpoint.url.startsWith('rtmp')) {
                        try {
                            await projectStore.addStreamEndpoint(props.project._id, result.data.streamId, endpoint.url);
                            addedCount++;
                        } catch (err: any) {
                            console.error("Failed to add endpoint", err);
                            toast.warning(`Failed to add restream endpoint: ${endpoint.url}`);
                        }
                    }
                }
                if (addedCount > 0) {
                    toast.success(`Added ${addedCount} restream endpoints.`);
                }
            }

            if (settings?.baseUrl && settings?.appName) {
                window.open(`${settings.baseUrl}/${settings.appName}/play.html?name=${result.data.streamId}`, '_blank')
            }
        }
    } catch (e: any) {
        toast.error(`Streaming failed: ${e.response?.data?.error || e.message}`)
        isStreaming.value = false
    }
}

const startPolling = () => {
    if (pollInterval) clearInterval(pollInterval)
    pollInterval = setInterval(async () => {
        if (!ams.value || !streamId.value) return
        const status = await ams.value.getBroadcastStatus(streamId.value)
        if (status) {
            streamStatus.value = status
            if (status.status === 'finished' || status.status === 'error') {
                stopPolling()
                isStreaming.value = false
            }
        }
    }, 5000)
}

const stopPolling = () => {
    if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
    }
}

const startWebRTC = async () => {
    await startStreaming()
}

const saveToVoD = async () => {
    isSavingVoD.value = true
    try {
        const result = await projectStore.saveToVoD(props.project._id)
        if (result.success) {
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
    stopPolling()
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
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    height: 48px;
    width: 100%;
    color: white;
    font-size: 20px;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }

    &.youtube:hover {
        color: #f00;
        border-color: rgba(255, 0, 0, 0.3);
    }

    &.facebook:hover {
        color: #1877f2;
        border-color: rgba(24, 119, 242, 0.3);
    }
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

    &.active {
        background: #4ade80;
        box-shadow: 0 0 10px #4ade80;
    }
}

@keyframes pulse-red {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
}

.high-contrast-input {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: none !important;
        height: 44px;

        input {
            color: #fff;
            font-weight: 500;
        }
    }
}
</style>
