<template>
    <div class="recorder-page">
        <!-- Main Header -->
        <RecorderHeader :mode="mode" :tabs="tabs" @switch-mode="switchMode" />

        <!-- Preview Area -->
        <RecorderPreview v-model:processing-canvas="processingCanvas" :mode="mode" :show-mini-preview="showMiniPreview"
            :mini-pos="miniPos" :is-dragging="isDragging" @start-drag="startDrag" @mousedown="handleCanvasMouseDown"
            @mousemove="handleCanvasMouseMove" @mouseup="handleCanvasMouseUp" :is-recording="isRecording"
            :recording-time="recordingTime" :max-duration="maxDuration" :mic-enabled="micEnabled"
            :enable-asl-assist="enableAslAssist" :is-streaming="isStreaming" :stream-stats="streamStats"
            :active-captions="activeCaptions" :current-caption="currentCaption" :translated-caption="translatedCaption"
            :audio-levels="audioLevels" :current-db="currentDb" 
            :selected-avatar="selectedAvatar" 
            :isVTuberActive="isVTuberActive" :is-whiteboard-launchpad-active="isWhiteboardLaunchpadActive"
            @vtuber-stream-ready="handleVTuberStreamReady" @whiteboard-screen-share="handleWhiteboardScreenShare"
            @whiteboard-file-import="handleWhiteboardFileImport" />

        <!-- Teleprompter Overlay -->
        <Transition name="fade">
            <div v-if="isTeleprompterActive"
                class="teleprompter-overlay fixed top-32 left-1/2 -translate-x-1/2 w-[600px] h-[240px] z-[180] rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none">
                <div class="teleprompter-content p-8 pt-20"
                    :style="{ transform: `translateY(-${teleprompterScrollPos}px)` }">
                    <p :style="{ fontSize: teleprompterFontSize + 'px', lineHeight: 1.5 }"
                        class="text-white font-bold text-center drop-shadow-lg">
                        {{ teleprompterScript }}
                    </p>
                </div>
                <!-- Reading Line Indicator -->
                <div
                    class="absolute top-[60px] left-0 right-0 h-px bg-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                </div>
                <div
                    class="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                </div>
                <div
                    class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                </div>
            </div>
        </Transition>

        <!-- Recording Countdown Overlay -->
        <Transition name="fade">
            <div v-if="isCountdownActive"
                class="countdown-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                <div class="flex flex-col items-center">
                    <div class="countdown-circle relative flex items-center justify-center">
                        <svg class="absolute w-64 h-64 -rotate-90">
                            <circle cx="128" cy="128" r="120" stroke="rgba(249, 115, 22, 0.2)" stroke-width="8"
                                fill="transparent" />
                            <circle cx="128" cy="128" r="120" stroke="#f97316" stroke-width="8" fill="transparent"
                                :stroke-dasharray="753.98" :stroke-dashoffset="753.98 * (1 - countdownValue / 3)"
                                class="transition-all duration-1000 ease-linear" />
                        </svg>
                        <Transition name="scale" mode="out-in">
                            <span :key="countdownValue"
                                class="text-[120px] font-black text-white italic drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                                {{ countdownValue }}
                            </span>
                        </Transition>
                    </div>
                    <span class="text-orange-400 font-bold uppercase tracking-[0.3em] mt-8 animate-pulse text-xl">
                        {{ $t('projects.recorder.getReady') }}
                    </span>
                </div>
            </div>
        </Transition>

        <!-- Draggable Mini Preview (Webcam) -->
        <div v-if="mode === 'screen' && !isScreenShareEnded && !showFinishDialog"
            class="mini-preview-container fixed z-[150] w-[280px] aspect-video rounded-3xl overflow-hidden border-2 border-orange-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all"
            :style="{ left: miniPos.x + 'px', top: miniPos.y + 'px', transform: isDragging ? 'scale(1.02)' : 'scale(1)' }"
            @mousedown="startDrag">
            <div
                class="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-1.5 pointer-events-none">
                <div class="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                <span class="text-[8px] font-bold text-white uppercase tracking-wider">{{ $t('projects.recorder.liveCam') }}</span>
            </div>
            <video ref="miniCamVideo" :srcObject="webcamVideo" autoplay muted playsinline
                class="w-full h-full object-cover grayscale-[0.2] contrast-[1.1] pointer-events-none" />
        </div>

        <!-- Bottom Controls -->
        <RecorderControls
            :mode="mode"
            :is-recording="isRecording"
            :mic-enabled="micEnabled"
            :enable-beauty="enableBeauty"
            :is-streaming="isStreaming"
            :active-sidebar="activeSidebar"
            :is-screen-share-ended="isScreenShareEnded"
            :is-annotation-active="isAnnotationActive"
            :layout-preset="layoutPreset"
            :is-teleprompter-active="isTeleprompterActive"
            @toggle-sidebar="toggleSidebar"
            @toggle-mic="toggleMic"
            @toggle-ai="toggleAI"
            @toggle-recording="toggleRecording"
            @toggle-share="toggleScreenShare"
            @toggle-live="toggleLiveStream"
            @trigger-upload="triggerFileUpload"
            @initialize-stream="initializeStream"
            @update:is-annotation-active="v => isAnnotationActive = v"
        />

        <!-- Side Panel -->
        <RecorderSidePanel v-if="activeSidebar" :mode="mode" :active-sidebar="activeSidebar"
            :video-filters="videoFilters" :applied-filter="appliedFilter" :cam-settings="camSettings"
            :enable-asl-assist="enableAslAssist" :asl-mode="aslMode" :enable-beauty="enableBeauty"
            :beauty-settings="beautySettings" :active-captions="activeCaptions" :target-language="targetLanguage"
            :resource-pool="resourcePool" :active-overlays="activeOverlays" :stream-config="streamConfig"
            :selected-platforms="selectedPlatforms" :available-accounts="availableAccounts"
            :is-recording="isRecording" :current-slide-index="currentSlideIndex"
            :podcast-settings="podcastSettings" :selected-avatar="selectedAvatar"
            :selected-voice="selectedVoice" :video-devices="videoDevices" :audio-devices="audioDevices"
            :selected-camera-id="selectedCameraId" :selected-mic-id="selectedMicId" :mic-volume="micVolume"
            :isVTuberActive="isVTuberActive" :is-whiteboard-launchpad-active="isWhiteboardLaunchpadActive"
            :whiteboard-content-type="typeof whiteboardContent === 'object' && whiteboardContent !== null && 'getTracks' in (whiteboardContent as any) ? 'stream' : (whiteboardPages.length > 0 ? 'pdf' : null)"
            :current-whiteboard-page="currentWhiteboardPage" :whiteboard-pages-count="whiteboardPages.length"
            :whiteboard-scripts="whiteboardScripts"
            :is-a-i-presenting="isAIPresenting"
            :is-synthesizing="isSynthesizing"
            :bgm-volume="bgmVolume" :is-ducking-enabled="isDuckingEnabled" :bgm-url="bgmUrl" :bgm-library="bgmLibrary"
            @close="activeSidebar = null" @update:applied-filter="v => appliedFilter = v"
            @update:enable-asl-assist="v => enableAslAssist = v" @update:asl-mode="v => aslMode = v"
            @update:beauty-settings="v => beautySettings = v" @toggle-ai-filter="toggleAIFilter"
            @toggle-captions="toggleCaptions" @update:target-language="v => targetLanguage = v"
            @trigger-presentation-upload="triggerPresentationUpload" @trigger-resource-upload="triggerResourceUpload"
            @toggle-overlay="toggleOverlay" @update:current-slide-index="v => currentSlideIndex = v"
            @update:selected-avatar="v => selectedAvatar = v" @update:selected-voice="v => selectedVoice = v"
            @select-vtuber-entity="handleSelectVTuberEntity"
            @update:isVTuberActive="val => isVTuberActive = val"
            @reset-whiteboard="isWhiteboardLaunchpadActive = true; whiteboardContent = null"
            @next-whiteboard-page="nextPresentationPage"
            @prev-whiteboard-page="prevPresentationPage"
            @go-to-whiteboard-page="goToPresentationPage"
            @whiteboard-file-import="handleWhiteboardFileImport"
            @whiteboard-screen-share="handleWhiteboardScreenShare"
            @generate-whiteboard-scripts="generateWhiteboardAIScripts" @start-ai-presentation="startAIPresentation"
            @stop-ai-presentation="stopAIPresentation"
            @toggle-platform="togglePlatform"
            @update:bgm-volume="v => bgmVolume = v" @update:is-ducking-enabled="v => isDuckingEnabled = v"
            @update:bgm-url="v => bgmUrl = v" @toggle-bgm="toggleBGM"
            @update:selected-mic-id="v => { if (isRecording) { toast.error(t('projects.recorder.toasts.micChangeDisabled')); return; }; selectedMicId = v; initializeStream() }"
            @update:mic-volume="v => micVolume = v" 
            @update:podcast-settings="v => podcastSettings = { ...podcastSettings, ...v }"
            @update:audio-advanced="v => podcastSettings = { ...podcastSettings, ...v }"
            @update:cam-settings="v => camSettings = { ...camSettings, ...v }" :layout-preset="layoutPreset"
            :is-teleprompter-active="isTeleprompterActive" :is-teleprompter-scrolling="isTeleprompterScrolling"
            :teleprompter-script="teleprompterScript" :teleprompter-speed="teleprompterSpeed"
            :teleprompter-font-size="teleprompterFontSize" @update:layout-preset="v => layoutPreset = v"
            @update:is-teleprompter-active="v => isTeleprompterActive = v"
            @update:is-teleprompter-scrolling="v => isTeleprompterScrolling = v"
            @update:teleprompter-script="v => teleprompterScript = v"
            @update:teleprompter-speed="v => teleprompterSpeed = v"
            @update:teleprompter-font-size="v => teleprompterFontSize = v"
            @update:teleprompter-scroll-pos="v => teleprompterScrollPos = v" :is-annotation-active="isAnnotationActive"
            :annotation-tool="annotationTool" :annotation-color="annotationColor" :annotation-size="annotationSize"
            @update:is-annotation-active="v => isAnnotationActive = v" @update:annotation-tool="v => annotationTool = v"
            @update:annotation-color="v => annotationColor = v" @update:annotation-size="v => annotationSize = v"
            @clear-annotations="clearAnnotations" 
            :recording-quality="recordingQuality"
            @update:recording-quality="v => recordingQuality = { ...recordingQuality, ...v }"
            :processing-canvas="processingCanvas"
            :show-platform-selector="showPlatformSelector"
            @update:show-platform-selector="v => showPlatformSelector = v" />

        <!-- Hidden Inputs -->
        <input ref="fileInput" type="file" class="hidden" accept="image/*,video/*" @change="handleFileUpload" />
        <input ref="presentationInput" type="file" class="hidden" accept=".pdf,.ppt,.pptx"
            @change="handlePresentationUpload" />

        <!-- Finish Dialog -->
        <el-dialog v-model="showFinishDialog" :title="$t('projects.recorder.finishDialog.title')" width="600px" center
            class="finish-dialog glass-dialog">
            <div class="flex flex-col gap-6 py-4">
                <!-- Video Preview Player -->
                <div v-if="recordedVideoUrl"
                    class="aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl">
                    <video :src="recordedVideoUrl" controls class="w-full h-full object-contain" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button class="action-btn primary" @click="saveToProject">
                        <handle-round theme="outline" size="18" />
                        <span>{{ $t('projects.recorder.finishDialog.save') }}</span>
                    </button>
                    <button class="action-btn secondary" @click="downloadRecording">
                        <file-addition theme="outline" size="18" />
                        <span>{{ $t('projects.recorder.finishDialog.download') }}</span>
                    </button>
                </div>
                <button class="action-btn ghost" @click="showFinishDialog = false">
                    <span>{{ $t('projects.recorder.finishDialog.discard') }}</span>
                </button>
            </div>
        </el-dialog>
        
        <!-- User Guide -->
        <UserGuide :steps="recorderGuide" storage-key="recorder-guide-completed" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElDialog } from 'element-plus'
import { toast } from 'vue-sonner'
import { HandleRound, FileAddition } from '@icon-park/vue-next'
import { useRecorder, videoFilters, type RecordingMode } from '@/composables/useRecorder'

// Components
import RecorderHeader from '@/components/recorder/RecorderHeader.vue'
import RecorderPreview from '@/components/recorder/RecorderPreview.vue'
import RecorderControls from '@/components/recorder/RecorderControls.vue'
import RecorderSidePanel from '@/components/recorder/RecorderSidePanel.vue'
import UserGuide from '@/components/common/UserGuide.vue'
import { recorderGuide } from '@/config/userGuides'
import { useRouter, useRoute } from 'vue-router'

const { t } = useI18n();
const route = useRoute();

const {
    mode, isRecording, recordingTime, maxDuration, micEnabled, activeSidebar,
    appliedFilter, showFinishDialog, enableAslAssist, aslMode, enableBeauty, beautySettings, currentDb,
    isAiActive, processingCanvas, displayCanvas, activeCaptions, currentCaption,
    translatedCaption, targetLanguage, isStreaming, streamConfig, streamStats, publisher,
    selectedPlatforms, availableAccounts, togglePlatform, showPlatformSelector,
    fileInput, presentationInput, resourcePool, activeOverlays, currentSlideIndex,
    audioLevels, isScreenShareEnded, tabs, camSettings, podcastSettings,
    avatarPresets: _unused, selectedAvatar, selectedVoice,
    videoDevices, audioDevices, selectedCameraId, selectedMicId, micVolume, recordedVideoUrl,
    isCountdownActive, countdownValue, showMiniPreview, webcamVideo,
    triggerResourceUpload, toggleOverlay, enumerateDevices,
    layoutPreset, isTeleprompterActive, isTeleprompterScrolling, teleprompterScript, teleprompterSpeed, teleprompterFontSize, teleprompterScrollPos,
    isAnnotationActive, annotationTool, annotationColor, annotationSize, recordingQuality,
    isVTuberActive, isWhiteboardLaunchpadActive, whiteboardContent, currentWhiteboardPage, whiteboardPages, whiteboardScripts,
    isAIPresenting, isSynthesizing,
    bgmVolume, isDuckingEnabled, bgmUrl, bgmLibrary, toggleBGM,
    handleVTuberStreamReady, handleWhiteboardScreenShare, handleWhiteboardFileImport, generateWhiteboardAIScripts, startAIPresentation,
    stopAIPresentation, nextPresentationPage, prevPresentationPage, goToPresentationPage,
    toggleAI, switchMode, initializeStream, toggleRecording, stopRecording, startRecording, startCountdown,
    startDrawing, draw, stopDrawing, clearAnnotations,
    handleFileUpload, handlePresentationUpload, downloadRecording, saveToProject, toggleAIFilter, toggleCaptions, toggleLiveStream, toggleMic, triggerFileUpload, triggerPresentationUpload
} = useRecorder()

const handleSelectVTuberEntity = (vt: any) => {
    selectedAvatar.value = vt.entityId ?? vt._id
}

const toggleSidebar = (name: string) => {
    activeSidebar.value = activeSidebar.value === name ? null : (name as any)
}

const toggleScreenShare = () => {
    const screenModes = ['screen', 'camera-screen'];
    if (screenModes.includes(mode.value)) {
        switchMode('camera')
    } else {
        switchMode('camera-screen')
    }
}

// Draggability Logic
const miniPos = ref({ x: window.innerWidth - 304, y: window.innerHeight - 280 })
const isDragging = ref(false)
let dragOffset = { x: 0, y: 0 }

const startDrag = (e: MouseEvent) => {
    isDragging.value = true
    dragOffset.x = e.clientX - miniPos.value.x
    dragOffset.y = e.clientY - miniPos.value.y
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
    if (!isDragging.value) return
    miniPos.value.x = e.clientX - dragOffset.x
    miniPos.value.y = e.clientY - dragOffset.y
}

const stopDrag = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
}

const handleCanvasMouseDown = (e: MouseEvent) => {
    if (!isAnnotationActive.value) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const scaleX = (e.target as HTMLCanvasElement).width / rect.width
    const scaleY = (e.target as HTMLCanvasElement).height / rect.height
    startDrawing((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY)
}

const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!isAnnotationActive.value) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const scaleX = (e.target as HTMLCanvasElement).width / rect.width
    const scaleY = (e.target as HTMLCanvasElement).height / rect.height
    draw((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY)
}

const handleCanvasMouseUp = () => {
    stopDrawing()
}

onMounted(async () => {
    await enumerateDevices()
    const targetMode = route.query.mode as RecordingMode
    if (targetMode && targetMode !== mode.value) {
        await switchMode(targetMode)
    } else {
        await initializeStream()
    }
})
</script>

<style lang="scss" scoped>
.recorder-page {
    width: 100vw;
    height: 100vh;
    background-color: #0a0a0c;
    background-image: 
        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.08) 0, transparent 50%);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    color: #fff;
    font-family: 'Outfit', 'Inter', sans-serif;

    &::before {
        content: '';
        position: absolute;
        top: -20%;
        left: -10%;
        width: 800px;
        height: 800px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%);
        filter: blur(100px);
        animation: pulse-glow 12s infinite alternate;
        pointer-events: none;
        z-index: 1;
    }

    &::after {
        content: '';
        position: absolute;
        bottom: -10%;
        right: -5%;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
        filter: blur(100px);
        animation: pulse-glow 15s infinite alternate-reverse;
        pointer-events: none;
        z-index: 1;
    }
}

@keyframes pulse-glow {
    0% { transform: scale(1) translate(0, 0); opacity: 0.3; }
    100% { transform: scale(1.1) translate(20px, 20px); opacity: 0.6; }
}

:deep(.glass-dialog) {
    background: rgba(10, 10, 12, 0.8) !important;
    backdrop-filter: blur(40px) saturate(200%) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 32px !important;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
    overflow: hidden;
    
    .el-dialog__header {
        margin-right: 0;
        padding: 32px 32px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        .el-dialog__title { 
            color: #fff; 
            font-weight: 900; 
            font-size: 22px;
            letter-spacing: -0.03em;
        }
    }
    .el-dialog__body { 
        padding: 32px;
        color: rgba(255,255,255,0.7); 
    }
    .el-dialog__headerbtn .el-dialog__close {
        color: rgba(255,255,255,0.4);
        font-size: 20px;
        transition: all 0.3s;
        &:hover { color: #fff; transform: rotate(90deg); }
    }
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 18px;
    border-radius: 20px;
    font-weight: 900;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;

    &.primary {
        background: #fff;
        color: #000;
        border: none;
        box-shadow: 0 20px 40px rgba(255, 255, 255, 0.1);

        &:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 30px 60px rgba(255, 255, 255, 0.15);
        }
    }

    &.secondary {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        backdrop-filter: blur(20px);

        &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
    }

    &.ghost {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        margin-top: 8px;

        &:hover {
            color: #ff4d4d;
            text-decoration: underline;
        }
    }
}

// Transitions
.fade-enter-active,
.fade-leave-active {
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    filter: blur(10px);
}

.scale-enter-active,
.scale-leave-active {
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-enter-from {
    transform: scale(0.6);
    opacity: 0;
}

.scale-leave-to {
    transform: scale(1.4);
    opacity: 0;
}

.countdown-circle circle {
    stroke-linecap: round;
}

.mini-preview-container {
    cursor: grab;
    &:active { cursor: grabbing; }
}
</style>
