<template>
    <transition name="slide-right">
        <div v-if="activeSidebar"
            class="side-panel absolute top-24 right-4 bottom-24 w-72 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl z-50 flex flex-col overflow-hidden">
            <!-- Header (Fixed) -->
            <div class="flex items-center justify-between p-6 border-b border-white/5">
                <h3 class="text-xs font-black uppercase tracking-widest text-white/40">{{ activeSidebar }}</h3>
                <button @click="$emit('close')"
                    class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <close size="14" />
                </button>
            </div>

            <!-- Content Area (Scrollable) -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
                <!-- Filters Panel -->
                <FiltersTab v-if="activeSidebar === 'filters'" :video-filters="videoFilters"
                    :applied-filter="appliedFilter" :mode="mode" :cam-settings="camSettings"
                    @update:applied-filter="v => $emit('update:appliedFilter', v)" />

                <!-- Whiteboard Sidebar -->
                <WhiteboardTab v-if="activeSidebar === 'whiteboard' || mode === 'whiteboard'" 
                    :is-launchpad-active="isWhiteboardLaunchpadActive"
                    :content-type="whiteboardContentType"
                    :current-page="currentWhiteboardPage"
                    :total-pages="whiteboardPagesCount"
                    :cam-settings="camSettings"
                    :whiteboard-scripts="whiteboardScripts"
                    :is-a-i-presenting="isAIPresenting"
                    :is-synthesizing="isSynthesizing"
                    :selected-avatar="selectedAvatar"
                    :selected-voice="selectedVoice"
                    :target-language="targetLanguage"
                    @reset-whiteboard="$emit('reset-whiteboard')"
                    @prev-page="$emit('prev-whiteboard-page')"
                    @next-page="$emit('next-whiteboard-page')"
                    @trigger-import="v => $emit('whiteboard-file-import', v)"
                    @trigger-share="$emit('whiteboard-screen-share')"
                    @update:cam-settings="v => $emit('update:cam-settings', v)"
                    @generate-scripts="$emit('generate-whiteboard-scripts')"
                    @start-ai-presentation="$emit('start-ai-presentation')"
                    @stop-ai-presentation="$emit('stop-ai-presentation')"
                    @update:selected-avatar="v => $emit('update:selected-avatar', v)"
                    @update:selected-voice="v => $emit('update:selected-voice', v)"
                    @select-vtuber-entity="vt => $emit('select-vtuber-entity', vt)" />

                <!-- AI Sidebar -->
                <AITab v-if="activeSidebar === 'ai' && mode !== 'podcast'" :enable-beauty="enableBeauty"
                    :beauty-settings="beautySettings" :enable-asl-assist="enableAslAssist" :asl-mode="aslMode"
                    :active-captions="activeCaptions" :target-language="targetLanguage" :cam-settings="camSettings"
                    :resource-pool="resourcePool" :isVTuberActive="isVTuberActive" 
                    :selected-avatar="selectedAvatar"
                    :selected-voice="selectedVoice"
                    @toggle-ai-filter="(id, val) => $emit('toggle-ai-filter', id, val)"
                    @update:enable-asl-assist="v => $emit('update:enable-asl-assist', v)"
                    @update:asl-mode="v => $emit('update:asl-mode', v)"
                    @toggle-captions="v => $emit('toggle-captions', v)"
                    @update:targetLanguage="v => $emit('update:targetLanguage', v)"
                    @update:camSettings="v => $emit('update:cam-settings', v)"
                    @update:isVTuberActive="val => $emit('update:isVTuberActive', val)"
                    @update:selectedAvatar="val => $emit('update:selected-avatar', val)"
                    @update:selected-voice="val => $emit('update:selected-voice', val)"
                    @select-vtuber-entity="vt => $emit('select-vtuber-entity', vt)"
                    @presentation-next="$emit('next-whiteboard-page')"
                    @presentation-prev="$emit('prev-whiteboard-page')"
                    @presentation-go-to="v => $emit('go-to-whiteboard-page', v)"
                    @trigger-resource-upload="$emit('trigger-resource-upload')"
                    :processing-canvas="processingCanvas"
                    :mode="mode" />

                <!-- Podcast Sidebar -->
                <PodcastTab v-if="activeSidebar === 'podcast' || (activeSidebar === 'ai' && mode === 'podcast')"
                    :mode="mode" :podcast-settings="podcastSettings" :resource-pool="resourcePool"
                    @update:podcast-settings="v => $emit('update:podcast-settings', v)"
                    @update:audio-advanced="v => $emit('update:audio-advanced', v)"
                    @trigger-resource-upload="$emit('trigger-resource-upload')" />

                <!-- Resources (Pool) -->
                <ResourcesTab v-if="activeSidebar === 'resources'" :resource-pool="resourcePool"
                    :active-overlays="activeOverlays" @trigger-resource-upload="$emit('trigger-resource-upload')"
                    @toggle-overlay="id => $emit('toggle-overlay', id)" />

                <!-- Live Sidebar -->
                <LiveTab v-if="activeSidebar === 'live'" 
                    :stream-config="streamConfig" 
                    :stream-stats="streamStats"
                    :selected-platforms="selectedPlatforms"
                    :available-accounts="availableAccounts"
                    @toggle-platform="id => $emit('toggle-platform', id)" />


                <!-- Audio Sidebar -->
                <AudioTab v-if="activeSidebar === 'audio'"
                    :mic-volume="micVolume"
                    :bgm-volume="bgmVolume"
                    :is-ducking-enabled="isDuckingEnabled"
                    :bgm-url="bgmUrl"
                    :bgm-library="bgmLibrary"
                    @update:mic-volume="v => $emit('update:mic-volume', v)"
                    @update:bgm-volume="v => $emit('update:bgm-volume', v)"
                    @update:is-ducking-enabled="v => $emit('update:is-ducking-enabled', v)"
                    @update:bgm-url="v => $emit('update:bgm-url', v)"
                    @toggle-bgm="$emit('toggle-bgm')" />

                <!-- Hardware Sidebar -->
                <HardwareTab v-if="activeSidebar === 'hardware'" :video-devices="videoDevices"
                    :audio-devices="audioDevices" :selected-camera-id="selectedCameraId"
                    :selected-mic-id="selectedMicId" :mic-volume="micVolume"
                    @update:selected-camera-id="id => $emit('update:selected-camera-id', id)"
                    @update:selected-mic-id="id => $emit('update:selected-mic-id', id)"
                    @update:mic-volume="val => $emit('update:mic-volume', val)" />

                <ProductionTab v-if="activeSidebar === 'production'"
                    :layout-preset="layoutPreset"
                    :is-teleprompter-active="isTeleprompterActive"
                    :is-teleprompter-scrolling="isTeleprompterScrolling"
                    :teleprompter-script="teleprompterScript"
                    :teleprompter-speed="teleprompterSpeed"
                    :teleprompter-font-size="teleprompterFontSize"
                    :cam-settings="camSettings"
                    @update:layout-preset="v => $emit('update:layout-preset', v)"
                    @update:is-teleprompter-active="v => $emit('update:is-teleprompter-active', v)"
                    @update:is-teleprompter-scrolling="v => $emit('update:is-teleprompter-scrolling', v)"
                    @update:teleprompter-script="v => $emit('update:teleprompter-script', v)"
                    @update:teleprompter-speed="v => $emit('update:teleprompter-speed', v)"
                    @update:teleprompter-font-size="v => $emit('update:teleprompter-font-size', v)"
                    @update:teleprompter-scroll-pos="v => $emit('update:teleprompter-scroll-pos', v)"
                    :is-annotation-active="isAnnotationActive"
                    :annotation-tool="annotationTool"
                    :annotation-color="annotationColor"
                    :annotation-size="annotationSize"
                    @update:is-annotation-active="v => $emit('update:is-annotation-active', v)"
                    @update:annotation-tool="v => $emit('update:annotation-tool', v)"
                    @update:annotation-color="v => $emit('update:annotation-color', v)"
                    @update:annotation-size="v => $emit('update:annotation-size', v)"
                    @clear-annotations="$emit('clear-annotations')" 
                    :recording-quality="recordingQuality"
                    @update:recording-quality="v => $emit('update:recording-quality', v)"
                    @update:cam-settings="v => $emit('update:cam-settings', v)" />
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { Close } from '@icon-park/vue-next'
import type { RecordingMode } from '@/composables/useRecorder'

// Modular Components
import FiltersTab from './sidepanel/FiltersTab.vue'
import AITab from './sidepanel/AITab.vue'
import PodcastTab from './sidepanel/PodcastTab.vue'
import ResourcesTab from './sidepanel/ResourcesTab.vue'
import LiveTab from './sidepanel/LiveTab.vue'
import WhiteboardTab from './sidepanel/WhiteboardTab.vue'
import AudioTab from './sidepanel/AudioTab.vue'
import HardwareTab from './sidepanel/HardwareTab.vue'
import ProductionTab from './sidepanel/ProductionTab.vue'

defineProps<{
    mode: RecordingMode
    activeSidebar: string | null
    videoFilters: any[]
    appliedFilter: string
    camSettings: any
    enableAslAssist: boolean
    aslMode: 'asl-to-text' | 'text-to-asl'
    enableBeauty: boolean
    beautySettings: { smoothing: number; brightness: number }
    activeCaptions: boolean
    targetLanguage: string
    resourcePool: any[]
    activeOverlays: string[]
    streamConfig: { serverUrl: string, streamKey: string, useAntMedia: boolean }
    streamStats?: any
    currentSlideIndex: number
    isRecording: boolean
    podcastSettings: any
    selectedAvatar: string
    selectedVoice: string
    videoDevices: any[]
    audioDevices: MediaDeviceInfo[]
    selectedCameraId: string | null
    selectedMicId: string | null
    micVolume: number
    layoutPreset: string
    selectedPlatforms: string[]
    availableAccounts: any[]
    isTeleprompterActive: boolean
    isTeleprompterScrolling: boolean
    teleprompterScript: string
    teleprompterSpeed: number
    teleprompterFontSize: number
    isAnnotationActive: boolean
    annotationTool: 'pen' | 'highlighter'
    annotationColor: string
    annotationSize: number
    recordingQuality: { resolution: string; fps: number }
    isVTuberActive: boolean
    isWhiteboardLaunchpadActive: boolean
    whiteboardContentType: 'stream' | 'pdf' | 'ppt' | 'video' | null
    currentWhiteboardPage: number
    whiteboardPagesCount: number
    whiteboardScripts: string[]
    isAIPresenting: boolean
    isSynthesizing: boolean
    bgmVolume: number
    isDuckingEnabled: boolean
    bgmUrl: string | null
    bgmLibrary: any[]
    processingCanvas: HTMLCanvasElement | null
}>()

defineEmits<{
    (e: 'close'): void
    (e: 'update:appliedFilter', filterId: string): void
    (e: 'update:enable-asl-assist', val: boolean): void
    (e: 'update:asl-mode', mode: 'asl-to-text' | 'text-to-asl'): void
    (e: 'toggle-ai-filter', id: string, val: boolean): void
    (e: 'update:beauty-settings', val: any): void
    (e: 'toggle-captions', val: boolean): void
    (e: 'update:targetLanguage', val: string): void
    (e: 'trigger-presentation-upload'): void
    (e: 'trigger-resource-upload'): void
    (e: 'toggle-overlay', id: string): void
    (e: 'update:current-slide-index', idx: number): void
    (e: 'update:podcast-settings', settings: any): void
    (e: 'update:audio-advanced', settings: any): void
    (e: 'update:cam-settings', val: any): void
    (e: 'update:selected-avatar', val: string): void
    (e: 'update:selected-voice', val: string): void
    (e: 'select-vtuber-entity', vt: any): void
    (e: 'update:selected-camera-id', id: string): void
    (e: 'update:selected-mic-id', id: string): void
    (e: 'update:mic-volume', val: number): void
    (e: 'update:layout-preset', val: string): void
    (e: 'update:is-teleprompter-active', val: boolean): void
    (e: 'update:is-teleprompter-scrolling', val: boolean): void
    (e: 'update:teleprompter-script', val: string): void
    (e: 'update:teleprompter-speed', val: number): void
    (e: 'update:teleprompter-font-size', val: number): void
    (e: 'update:teleprompter-scroll-pos', val: number): void
    (e: 'update:is-annotation-active', val: boolean): void
    (e: 'update:annotation-tool', val: 'pen' | 'highlighter'): void
    (e: 'update:annotation-color', val: string): void
    (e: 'update:annotation-size', val: number): void
    (e: 'clear-annotations'): void
    (e: 'update:recording-quality', val: any): void
    (e: 'update:isVTuberActive', val: boolean): void
    (e: 'reset-whiteboard'): void
    (e: 'prev-whiteboard-page'): void
    (e: 'next-whiteboard-page'): void
    (e: 'go-to-whiteboard-page', page: number): void
    (e: 'whiteboard-file-import', type: string): void
    (e: 'whiteboard-screen-share'): void
    (e: 'generate-whiteboard-scripts'): void
    (e: 'start-ai-presentation'): void
    (e: 'stop-ai-presentation'): void
    (e: 'update:bgm-volume', val: number): void
    (e: 'update:is-ducking-enabled', val: boolean): void
    (e: 'update:bgm-url', val: string | null): void
    (e: 'toggle-bgm'): void
    (e: 'toggle-platform', id: string): void
}>()
</script>

<style lang="scss" scoped>
.side-panel {
    background: rgba(10, 10, 12, 0.7);
    backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: -20px 0 60px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
    animation: sidebarGlow 8s infinite alternate;
}

@keyframes sidebarGlow {
    from {
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: -20px 0 60px rgba(0, 0, 0, 0.6);
    }
    to {
        border-color: rgba(59, 130, 246, 0.2);
        box-shadow: -20px 0 60px rgba(59, 130, 246, 0.1);
    }
}

.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(59, 130, 246, 0.4);
    }
}
</style>
