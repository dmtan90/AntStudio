<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useRecorder, type RecordingMode } from '@/composables/useRecorder';
import { toast } from 'vue-sonner';
import { 
  Camera, Monitor, Voice, Cpu, 
  Record as RecordIcon, Square, Play, Pause,
  Download, Plus, SettingConfig, Magic, 
  MicrophoneOne, VolumeNotice as VolumeOne,
  History, MagicWand, Loading, Close as X,
  FaceRecognition, VideoOne, Devices, TextMessage
} from '@icon-park/vue-next';
import RecorderControls from '@/components/recorder/RecorderControls.vue';
import RecorderSidePanel from '@/components/recorder/RecorderSidePanel.vue';

const editor = useEditorStore();
const {
    mode, isRecording, recordingTime, maxDuration, micEnabled, activeSidebar,
    appliedFilter, showFinishDialog, enableAslAssist, aslMode, enableBeauty, beautySettings, currentDb,
    isAiActive, processingCanvas, activeCaptions, currentCaption,
    translatedCaption, targetLanguage, isStreaming, streamConfig, streamStats,
    selectedPlatforms, availableAccounts, togglePlatform,
    fileInput, presentationInput, resourcePool, activeOverlays, currentSlideIndex,
    audioLevels, isScreenShareEnded, tabs, camSettings, podcastSettings,
    selectedAvatar, selectedVoice,
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
    handleFileUpload, handlePresentationUpload, downloadRecording, saveToProject, toggleCaptions, toggleLiveStream, toggleMic, triggerFileUpload, triggerPresentationUpload
} = useRecorder();

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const onFinishAndAdd = async () => {
    try {
        const media = await saveToProject();
        if (media) {
            await editor.addVideo({ src: media.url, name: media.name });
            toast.success("Recording added to timeline!");
        }
    } catch (e) {
        toast.error("Failed to save recording");
    } finally {
        showFinishDialog.value = false;
    }
};

const toggleSidebar = (name: string) => {
    activeSidebar.value = activeSidebar.value === name ? null : (name as any);
};

const toggleAIFilter = (id: string, val: boolean) => {
    if (id === 'beauty_smooth') enableBeauty.value = val;
};

onMounted(async () => {
    await enumerateDevices();
    await initializeStream();
});
</script>

<template>
    <div class="h-full flex flex-col cinematic-panel">
        <!-- Header -->
        <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 shrink-0">
            <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Recorder</h2>
            <button
                class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                @click="editor.setActiveSidebarLeft(null)">
                <X :size="16" />
            </button>
        </div>

        <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container px-5 py-6 flex flex-col gap-6">
            <!-- Preview Section -->
            <div class="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 group shadow-2xl">
                <canvas ref="processingCanvas" class="w-full h-full min-h-[150px] object-contain"></canvas>
                
                <!-- Recording Indicators -->
                <div v-if="isRecording" class="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse z-10">
                    <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                    <span>Rec {{ formatTime(recordingTime) }}</span>
                </div>

                <!-- Mode Badges -->
                <div class="absolute top-4 right-4 flex gap-2 z-10">
                    <div class="px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/5 text-[8px] font-black text-white/60 uppercase tracking-widest">
                        {{ mode }}
                    </div>
                </div>

                <!-- Countdown Overlay -->
                <div v-if="isCountdownActive" class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <span class="text-6xl font-black text-white italic animate-bounce">{{ countdownValue }}</span>
                </div>
            </div>

            <!-- Mode Selector -->
            <div class="flex flex-col gap-3">
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Studio Mode</span>
                <div class="grid grid-cols-2 gap-2">
                    <button v-for="tab in tabs" :key="tab.value" 
                            @click="switchMode(tab.value as any)"
                            class="p-3 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 group"
                            :class="mode === tab.value ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'"
                    >
                        <component :is="tab.icon" :size="18" :stroke-width="mode === tab.value ? 2 : 1.5" />
                        <span class="text-[9px] font-bold uppercase tracking-wider">{{ tab.label }}</span>
                    </button>
                </div>
            </div>

            <!-- Parameters & Controls -->
            <div class="flex flex-col gap-4">
                <!-- Recording Controls -->
                <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex flex-col gap-4">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-[11px] font-black text-white uppercase tracking-tight">Master Control</span>
                            <span class="text-[9px] text-white/30 uppercase tracking-widest">{{ isRecording ? 'Recording Live' : 'Idle' }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button @click="toggleMic" 
                                    class="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/5 hover:bg-white/10"
                                    :class="micEnabled ? 'text-brand-primary border-brand-primary/20 bg-brand-primary/5' : 'text-white/20'"
                            >
                                <MicrophoneOne :size="16" />
                            </button>
                        </div>
                    </div>

                    <el-button 
                        class="cinematic-button !h-14 !rounded-2xl !border-none w-full shadow-2xl transition-all duration-500 overflow-hidden group"
                        :class="isRecording ? 'is-recording bg-red-500 !text-white' : 'is-primary bg-brand-primary'"
                        @click="toggleRecording"
                    >
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <template #icon>
                            <Square v-if="isRecording" :size="20" fill="currentColor" />
                            <RecordIcon v-else :size="20" fill="currentColor" />
                        </template>
                        <span class="text-xs font-black uppercase tracking-[0.2em] ml-2">
                            {{ isRecording ? 'Stop Recording' : 'Start Studio Session' }}
                        </span>
                    </el-button>
                </div>

                <!-- Quick Settings -->
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <button @click="toggleSidebar('filters')"
                            class="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-all flex flex-col items-center gap-2"
                    >
                        <MagicWand :size="16" class="text-white/40" />
                        <span class="text-[9px] font-bold text-white/60 uppercase">Filters</span>
                    </button>
                    <button @click="toggleAI"
                            class="p-3 rounded-xl bg-white/5 border border-white/5 transition-all flex flex-col items-center gap-2"
                            :class="isAiActive ? 'border-brand-primary/40 text-brand-primary bg-brand-primary/5' : 'text-white/40'"
                    >
                        <Magic :size="16" />
                        <span class="text-[9px] font-bold uppercase">{{ isAiActive ? 'AI Active' : 'AI FX' }}</span>
                    </button>
                    <button @click="isTeleprompterActive = !isTeleprompterActive"
                            class="p-3 rounded-xl bg-white/5 border border-white/5 transition-all flex flex-col items-center gap-2"
                            :class="isTeleprompterActive ? 'border-brand-primary/40 text-brand-primary bg-brand-primary/5' : 'text-white/40'"
                    >
                        <TextMessage :size="16" />
                        <span class="text-[9px] font-bold uppercase">Prompt</span>
                    </button>
                    <button @click="toggleSidebar('hardware')"
                            class="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-primary/30 transition-all flex flex-col items-center gap-2"
                    >
                        <Devices :size="16" class="text-white/40" />
                        <span class="text-[9px] font-bold text-white/60 uppercase">Devices</span>
                    </button>
                </div>

                <!-- Finish Recording Dialog Integrated -->
                <div v-if="recordedVideoUrl" class="mt-4 p-5 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-black text-white uppercase tracking-tight">Capture Ready</span>
                        <button @click="recordedVideoUrl = ''" class="text-white/20 hover:text-white"><X :size="14" /></button>
                    </div>
                    <video :src="recordedVideoUrl" class="w-full aspect-video rounded-xl bg-black/40 overflow-hidden" controls />
                    <div class="flex gap-2">
                        <el-button class="cinematic-button is-primary flex-1 !h-12 !rounded-xl" @click="onFinishAndAdd">
                            <Plus :size="14" class="mr-2" /> Add to Timeline
                        </el-button>
                        <el-button class="cinematic-button !h-12 !rounded-xl !bg-white/10 !border-none !text-white flex-1" @click="downloadRecording">
                            <Download :size="14" class="mr-2" /> Save File
                        </el-button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Teleprompter Script Drawer/Panel (Conditional) -->
        <transition name="el-zoom-in-bottom">
            <div v-if="isTeleprompterActive" class="absolute bottom-20 left-4 right-4 bg-[#1a1a1e] rounded-2xl border border-white/10 shadow-2xl p-4 z-50">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[9px] font-black text-white/40 uppercase tracking-widest">Teleprompter</span>
                    <button @click="isTeleprompterScrolling = !isTeleprompterScrolling" 
                            class="text-[10px] font-bold uppercase text-brand-primary hover:underline">
                        {{ isTeleprompterScrolling ? 'Stop' : 'Scroll' }}
                    </button>
                </div>
                <el-input v-model="teleprompterScript" type="textarea" :rows="3" class="cinematic-textarea" />
            </div>
        </transition>

        <!-- Sidebar Floating Overlays from useRecorder -->
        <el-drawer :model-value="!!activeSidebar" @update:model-value="v => { if(!v) activeSidebar = null }" direction="ltr" size="300px" custom-class="recorder-drawer">
            <RecorderSidePanel 
                v-if="activeSidebar"
                :mode="mode"
                :active-sidebar="activeSidebar"
                :video-filters="[]" 
                :applied-filter="appliedFilter"
                :cam-settings="camSettings"
                :enable-asl-assist="enableAslAssist"
                :asl-mode="aslMode"
                :enable-beauty="enableBeauty"
                :beauty-settings="beautySettings"
                :active-captions="activeCaptions"
                :target-language="targetLanguage"
                :resource-pool="resourcePool"
                :active-overlays="activeOverlays"
                :stream-config="streamConfig"
                :stream-stats="streamStats"
                :current-slide-index="currentSlideIndex"
                :is-recording="isRecording"
                :podcast-settings="podcastSettings"
                :selected-avatar="selectedAvatar"
                :selected-voice="selectedVoice"
                :video-devices="videoDevices"
                :audio-devices="audioDevices"
                :selected-camera-id="selectedCameraId"
                :selected-mic-id="selectedMicId"
                :mic-volume="micVolume"
                :layout-preset="layoutPreset"
                :selected-platforms="selectedPlatforms"
                :available-accounts="availableAccounts"
                :is-teleprompter-active="isTeleprompterActive"
                :is-teleprompter-scrolling="isTeleprompterScrolling"
                :teleprompter-script="teleprompterScript"
                :teleprompter-speed="teleprompterSpeed"
                :teleprompter-font-size="teleprompterFontSize"
                :is-annotation-active="isAnnotationActive"
                :annotation-tool="annotationTool"
                :annotation-color="annotationColor"
                :annotation-size="annotationSize"
                :recording-quality="recordingQuality"
                :isVTuberActive="isVTuberActive"
                :is-whiteboard-launchpad-active="isWhiteboardLaunchpadActive"
                :whiteboard-content-type="typeof whiteboardContent === 'object' && whiteboardContent !== null && 'getTracks' in (whiteboardContent as any) ? 'stream' : (whiteboardPages.length > 0 ? 'pdf' : null)"
                :current-whiteboard-page="currentWhiteboardPage"
                :whiteboard-pages-count="whiteboardPages.length"
                :whiteboard-scripts="whiteboardScripts"
                :is-a-i-presenting="isAIPresenting"
                :is-synthesizing="isSynthesizing"
                :bgm-volume="bgmVolume"
                :is-ducking-enabled="isDuckingEnabled"
                :bgm-url="bgmUrl"
                :bgm-library="bgmLibrary"
                :processing-canvas="processingCanvas as any"
                @close="activeSidebar = null"
                @update:applied-filter="v => appliedFilter = v"
                @update:selected-mic-id="v => selectedMicId = v"
                @update:targetLanguage="v => targetLanguage = v"
                @toggle-ai-filter="(id, val) => toggleAIFilter(id, val)"
                @update:enable-asl-assist="v => enableAslAssist = v"
                @update:asl-mode="v => aslMode = v"
                @toggle-captions="toggleCaptions()"
                @update:cam-settings="v => Object.assign(camSettings, v)"
                @update:isVTuberActive="val => isVTuberActive = val"
                @update:selected-avatar="val => selectedAvatar = val"
                @update:selected-voice="val => selectedVoice = val"
                @trigger-resource-upload="triggerResourceUpload"
                @toggle-overlay="id => toggleOverlay(id)"
                @update:mic-volume="v => micVolume = v"
                @update:bgm-volume="v => bgmVolume = v"
                @update:is-ducking-enabled="v => isDuckingEnabled = v"
                @update:bgm-url="v => bgmUrl = v"
                @toggle-bgm="toggleBGM"
                @update:selected-camera-id="id => selectedCameraId = id"
                @update:layout-preset="v => layoutPreset = v"
                @update:is-teleprompter-active="v => isTeleprompterActive = v"
                @update:is-teleprompter-scrolling="v => isTeleprompterScrolling = v"
                @update:teleprompter-script="v => teleprompterScript = v"
                @update:teleprompter-speed="v => teleprompterSpeed = v"
                @update:teleprompter-font-size="v => teleprompterFontSize = v"
                @update:is-annotation-active="v => isAnnotationActive = v"
                @update:annotation-tool="v => annotationTool = v"
                @update:annotation-color="v => annotationColor = v"
                @update:annotation-size="v => annotationSize = v"
                @clear-annotations="() => {}"
                @update:recording-quality="v => Object.assign(recordingQuality, v)"
                @reset-whiteboard="() => { isWhiteboardLaunchpadActive = true; whiteboardContent = null }"
                @prev-whiteboard-page="prevPresentationPage"
                @next-whiteboard-page="nextPresentationPage"
                @go-to-whiteboard-page="v => goToPresentationPage(v)"
                @whiteboard-file-import="v => handleWhiteboardFileImport(v)"
                @whiteboard-screen-share="handleWhiteboardScreenShare"
                @generate-whiteboard-scripts="generateWhiteboardAIScripts"
                @start-ai-presentation="startAIPresentation"
                @stop-ai-presentation="stopAIPresentation"
                @toggle-platform="id => togglePlatform(id)"
            />
        </el-drawer>
    </div>
</template>

<style scoped lang="postcss">
.is-recording {
    @apply shadow-[0_0_20px_rgba(239,68,68,0.3)];
}

:deep(.cinematic-textarea .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-brand-primary/30 py-4 shadow-inner transition-all duration-300;
}
</style>
