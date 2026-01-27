<template>
    <div class="recorder-page">
        <!-- Close Button -->
        <button class="btn-close" @click="$router.push('/dashboard')">
            <close theme="outline" size="20" />
        </button>

        <!-- Tab Navigation -->
        <div class="recorder-tabs">
            <button v-for="tab in tabs" :key="tab.value" class="tab-btn" :class="{ active: mode === tab.value }"
                @click="switchMode(tab.value as RecordingMode)">
                <component :is="tab.icon" theme="filled" size="20" />
                <span>{{ tab.label }}</span>
            </button>
        </div>

        <!-- Preview Area -->
        <div class="preview-container">
            <!-- Video Preview -->
            <video v-show="mode !== 'audio'" ref="previewVideo" autoplay muted playsinline class="preview-video"
                :class="{ blurred: blurEffect !== 'none', 'asl-frame': enableASLAssist }"></video>

            <!-- ASL Assist Overlay -->
            <div v-if="enableASLAssist && mode !== 'audio'" class="asl-assist-overlay absolute inset-0 pointer-events-none flex items-center justify-center">
                <div class="asl-target-frame w-[80%] h-[80%] border-2 border-dashed border-blue-500/50 rounded-[3rem] flex items-center justify-center">
                    <p class="text-[10px] font-black text-blue-400 bg-black/60 px-4 py-2 rounded-full uppercase tracking-widest">{{ t('recorder.overlay.aslZone') }}</p>
                </div>
            </div>

            <!-- DB Meter (Visual Audio Cues) -->
            <div v-if="micEnabled" class="db-meter absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center">
                <div v-for="i in 15" :key="i" 
                    class="w-1.5 h-4 rounded-full transition-all duration-75"
                    :style="{ 
                        backgroundColor: i > 12 ? '#ef4444' : (i > 8 ? '#f59e0b' : '#3b82f6'),
                        opacity: (16 - i) <= (currentDB * 15) ? 1 : 0.1,
                        boxShadow: (16 - i) <= (currentDB * 15) ? '0 0 10px currentColor' : 'none'
                    }">
                </div>
                <span class="text-[8px] font-black text-white/40 mt-2 rotate-90">{{ t('recorder.overlay.audioLevel') }}</span>
            </div>

            <!-- Audio Visualizer -->
            <div v-if="mode === 'audio'" class="audio-visualizer">
                <div class="audio-bars">
                    <div v-for="i in 50" :key="i" class="bar" :style="{ height: audioLevels[i - 1] || '20%' }"></div>
                </div>
            </div>

            <!-- Timer -->
            <div v-if="isRecording" class="recording-timer">
                {{ formatTime(recordingTime) }} / {{ formatTime(maxDuration) }}
            </div>

            <!-- Controls -->
            <div class="controls-overlay">
                <div class="control-bar">
                    <button class="ctrl-btn" @click="showMoreOptions = !showMoreOptions">
                        <more theme="outline" size="20" />
                    </button>

                    <button class="ctrl-btn" :class="{ active: micEnabled }" @click="toggleMic">
                        <microphone v-if="micEnabled" theme="filled" size="20" />
                        <voice v-else theme="outline" size="20" />
                    </button>

                    <button class="record-btn" :class="{ recording: isRecording }" @click="toggleRecording">
                        <div class="inner-circle"></div>
                    </button>

                    <button class="ctrl-btn" @click="triggerFileUpload">
                        <file-addition theme="outline" size="20" />
                        <input type="file" ref="fileInput" style="display: none" accept="video/*,audio/*"
                            @change="handleFileUpload" />
                    </button>

                     <button class="ctrl-btn" :class="{ active: enableASLAssist }" @click="enableASLAssist = !enableASLAssist">
                        <hand-right theme="outline" size="20" />
                     </button>

                     <button class="ctrl-btn" :class="{ active: settingsOpen }" @click="settingsOpen = !settingsOpen">
                        <effects theme="outline" size="20" />
                     </button>

                     <button class="ctrl-btn">
                        <more-one theme="outline" size="20" />
                     </button>
                </div>
            </div>
        </div>

        <!-- Settings Panel -->
        <transition name="slide-up">
            <div v-if="settingsOpen" class="settings-panel">
                <button class="btn-close-panel" @click="settingsOpen = false">
                    <close theme="outline" size="16" />
                </button>
                <div class="settings-header">{{ t('recorder.settings.blur') }}</div>
                <div class="blur-options">
                    <button class="blur-btn" :class="{ active: blurEffect === 'background' }"
                        @click="toggleBlur('background')">
                        <user theme="outline" size="24" />
                    </button>
                    <button class="blur-btn" :class="{ active: blurEffect === 'full' }" @click="toggleBlur('full')">
                        <handle-round theme="outline" size="24" />
                    </button>
                </div>
            </div>
        </transition>

        <!-- Finish Dialog -->
        <el-dialog v-model="showFinishDialog" :title="t('recorder.dialog.title')" width="400px" align-center>
            <p>{{ t('recorder.dialog.desc') }}</p>
            <template #footer>
                <div class="dialog-footer">
                    <button class="btn-secondary" @click="downloadRecording">
                        {{ t('recorder.dialog.download') }}
                    </button>
                    <button class="btn-primary" @click="saveToProject">
                        {{ t('recorder.dialog.save') }}
                    </button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
    Camera, Monitor, Microphone, Voice,
    Close, More, MoreOne, FileAddition, Effects, User, HandleRound, HandRight
} from '@icon-park/vue-next'
import { useProjectStore } from '@/stores/project'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'

const router = useRouter()
const projectStore = useProjectStore()
const { t } = useTranslations()

type RecordingMode = 'camera' | 'camera-screen' | 'screen' | 'audio'

const tabs = computed(() => [
    { value: 'camera', label: t('recorder.tabs.camera'), icon: Camera },
    { value: 'camera-screen', label: t('recorder.tabs.cameraScreen'), icon: Monitor },
    { value: 'screen', label: t('recorder.tabs.screen'), icon: Monitor },
    { value: 'audio', label: t('recorder.tabs.audio'), icon: Voice }
])

const mode = ref<RecordingMode>('camera')
const isRecording = ref(false)
const recordingTime = ref(0)
const maxDuration = ref(600)
const micEnabled = ref(true)
const settingsOpen = ref(false)
const showMoreOptions = ref(false)
const blurEffect = ref<'none' | 'background' | 'full'>('none')
const showFinishDialog = ref(false)
const enableASLAssist = ref(false)
const currentDB = ref(0)

const previewVideo = ref<HTMLVideoElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const mediaRecorder = ref<any | null>(null)
const recordedChunks = ref<Blob[]>([])
const currentStream = ref<MediaStream | null>(null)
const audioLevels = ref<string[]>(Array(50).fill('20%'))

let timer: any = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null

const switchMode = async (newMode: RecordingMode) => {
    if (isRecording.value) {
        toast.error(t('recorder.status.stopFirst'))
        return
    }
    mode.value = newMode
    await initializeStream()
}

const initializeStream = async () => {
    try {
        if (currentStream.value) {
            currentStream.value.getTracks().forEach(track => track.stop())
        }

        let stream: MediaStream
        if (mode.value === 'camera') {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: micEnabled.value
            })
        } else if (mode.value === 'screen') {
            stream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: true,
                audio: micEnabled.value
            })
        } else if (mode.value === 'audio') {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            setupAudioVisualizer(stream)
        } else {
            // Camera-screen combo (Simplified)
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        }

        currentStream.value = stream
        if (previewVideo.value && mode.value !== 'audio') {
            previewVideo.value.srcObject = stream
        }
    } catch (error: any) {
        toast.error(t('recorder.status.accessError'))
    }
}

const setupAudioVisualizer = (stream: MediaStream) => {
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    analyser.fftSize = 128
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateVisualizer = () => {
        if (!analyser) return
        analyser.getByteFrequencyData(dataArray)
        audioLevels.value = Array.from(dataArray).slice(0, 50).map(v => `${(v / 255) * 100}%`)
        
        // Calculate average for DB meter
        const sum = dataArray.reduce((a, b) => a + b, 0)
        currentDB.value = (sum / dataArray.length) / 255
        
        requestAnimationFrame(updateVisualizer)
    }
    updateVisualizer()
}

const toggleMic = () => {
    micEnabled.value = !micEnabled.value
    if (currentStream.value) {
        currentStream.value.getAudioTracks().forEach(track => {
            track.enabled = micEnabled.value
        })
    }
}

const toggleBlur = (type: 'background' | 'full') => { blurEffect.value = blurEffect.value === type ? 'none' : type }

const toggleRecording = () => {
    if (isRecording.value) stopRecording()
    else startRecording()
}

const startRecording = () => {
    if (!currentStream.value) return
    recordedChunks.value = []
    mediaRecorder.value = new (window as any).MediaRecorder(currentStream.value)
    mediaRecorder.value.ondataavailable = (e: any) => { if (e.data.size > 0) recordedChunks.value.push(e.data) }
    mediaRecorder.value.onstop = () => { showFinishDialog.value = true }
    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0
    timer = setInterval(() => {
        recordingTime.value++
        if (recordingTime.value >= maxDuration.value) stopRecording()
    }, 1000)
}

const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop()
        isRecording.value = false
        clearInterval(timer)
    }
}

const downloadRecording = () => {
    const blob = new Blob(recordedChunks.value, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rec-${Date.now()}.webm`
    a.click()
    showFinishDialog.value = false
}

const saveToProject = async () => {
    const tid = toast.loading(t('recorder.status.syncing'))
    try {
        const res = await projectStore.createProject({
            title: `${t('recorder.projectDefault')} ${new Date().toLocaleDateString()}`,
            mode: 'recording'
        })
        toast.success(t('recorder.status.persistenceSuccess'), { id: tid })
        showFinishDialog.value = false
        router.push(`/projects/${res.project._id}/editor`)
    } catch (e) {
        toast.error(t('recorder.status.persistenceError'), { id: tid })
    }
}

const triggerFileUpload = () => fileInput.value?.click()
const handleFileUpload = (e: Event) => { toast.info(t('recorder.status.extractionSoon')) }
const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

onMounted(initializeStream)
onUnmounted(() => {
    if (currentStream.value) currentStream.value.getTracks().forEach(t => t.stop())
    if (audioContext) audioContext.close()
    clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.recorder-page {
    width: 100vw;
    height: 100vh;
    background: #000;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

.btn-close {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    cursor: pointer;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}

.recorder-tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    z-index: 10;

    .tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        &.active {
            background: #2563eb;
            border-color: #2563eb;
            color: #fff;
        }
    }
}

.preview-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111;
}

.preview-video {
    width: 100%;
    height: 100%;
    object-fit: contain;

    &.blurred {
        filter: blur(10px);
    }
}

.audio-visualizer {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .audio-bars {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        height: 200px;

        .bar {
            width: 8px;
            background: linear-gradient(to top, #3b82f6, #8b5cf6);
            border-radius: 4px 4px 0 0;
            transition: height 0.1s;
        }
    }
}

.recording-timer {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(239, 68, 68, 0.9);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-family: monospace;
    font-weight: 700;
    font-size: 16px;
    z-index: 10;
}

.controls-overlay {
    position: absolute;
    bottom: 40px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 10;
}

.control-bar {
    background: rgba(20, 20, 20, 0.9);
    backdrop-filter: blur(20px);
    padding: 12px 24px;
    border-radius: 100px;
    display: flex;
    align-items: center;
    gap: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);

    .ctrl-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        &.active {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }
    }

    .record-btn {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        border: 4px solid rgba(255, 255, 255, 0.8);
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;

        .inner-circle {
            width: 48px;
            height: 48px;
            background: #ef4444;
            border-radius: 50%;
            transition: all 0.3s;
        }

        &:hover {
            transform: scale(1.05);
        }

        &.recording {
            border-color: rgba(239, 68, 68, 0.5);

            .inner-circle {
                width: 24px;
                height: 24px;
                border-radius: 4px;
            }
        }
    }
}

.settings-panel {
    position: absolute;
    bottom: 140px;
    right: 50%;
    transform: translateX(50%);
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 20px;
    z-index: 20;

    .btn-close-panel {
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;

        &:hover {
            color: #fff;
        }
    }

    .settings-header {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 16px;
    }

    .blur-options {
        display: flex;
        gap: 12px;

        .blur-btn {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            &.active {
                background: rgba(59, 130, 246, 0.2);
                border-color: #3b82f6;
                color: #3b82f6;
            }
        }
    }
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s;
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
}

.dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;

    button {
        padding: 8px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
        }
    }

    .btn-primary {
        background: #3b82f6;
        border: none;
        color: #fff;

        &:hover {
            background: #2563eb;
        }
    }
}
</style>
