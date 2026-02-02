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

                <!-- AI Sidebar -->
                <AITab v-if="activeSidebar === 'ai' && mode !== 'podcast'" :enable-beauty="enableBeauty"
                    :beauty-settings="beautySettings" :enable-asl-assist="enableAslAssist" :asl-mode="aslMode"
                    :active-captions="activeCaptions" :target-language="targetLanguage" :cam-settings="camSettings"
                    :resource-pool="resourcePool" @toggle-ai-filter="(id, val) => $emit('toggle-ai-filter', id, val)"
                    @update:enable-asl-assist="v => $emit('update:enable-asl-assist', v)"
                    @update:asl-mode="v => $emit('update:asl-mode', v)"
                    @toggle-captions="v => $emit('toggle-captions', v)"
                    @update:targetLanguage="v => $emit('update:targetLanguage', v)"
                    @update:camSettings="v => $emit('update:cam-settings', v)"
                    @trigger-resource-upload="$emit('trigger-resource-upload')" />

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
                <LiveTab v-if="activeSidebar === 'live'" :stream-config="streamConfig" :stream-stats="streamStats" />

                <!-- Autopilot Sidebar -->
                <AutopilotTab v-if="activeSidebar === 'autopilot'" :autopilot-data="autopilotData"
                    :current-slide-index="currentSlideIndex" :is-recording="isRecording" :avatar-presets="avatarPresets"
                    :selected-avatar="selectedAvatar" :selected-voice="selectedVoice"
                    @trigger-presentation-upload="$emit('trigger-presentation-upload')"
                    @update:current-slide-index="v => $emit('update:current-slide-index', v)"
                    @update:selected-avatar="v => $emit('update:selected-avatar', v)"
                    @update:selected-voice="v => $emit('update:selected-voice', v)"
                    @start-autopilot="$emit('start-autopilot')" />

                <!-- Hardware Sidebar -->
                <HardwareTab v-if="activeSidebar === 'hardware'" :video-devices="videoDevices"
                    :audio-devices="audioDevices" :selected-camera-id="selectedCameraId"
                    :selected-mic-id="selectedMicId" :mic-volume="micVolume"
                    @update:selected-camera-id="id => $emit('update:selected-camera-id', id)"
                    @update:selected-mic-id="id => $emit('update:selected-mic-id', id)"
                    @update:mic-volume="val => $emit('update:mic-volume', val)" />

                <!-- Production Sidebar -->
                <ProductionTab v-if="activeSidebar === 'production'"
                    :layout-preset="layoutPreset"
                    :is-teleprompter-active="isTeleprompterActive"
                    :is-teleprompter-scrolling="isTeleprompterScrolling"
                    :teleprompter-script="teleprompterScript"
                    :teleprompter-speed="teleprompterSpeed"
                    :teleprompter-font-size="teleprompterFontSize"
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
                    @clear-annotations="$emit('clear-annotations')" />
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
import AutopilotTab from './sidepanel/AutopilotTab.vue'
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
    autopilotData: any
    currentSlideIndex: number
    isRecording: boolean
    podcastSettings: any
    avatarPresets: any[]
    selectedAvatar: string
    selectedVoice: string
    videoDevices: MediaDeviceInfo[]
    audioDevices: MediaDeviceInfo[]
    selectedCameraId: string | null
    selectedMicId: string | null
    micVolume: number
    layoutPreset: string
    isTeleprompterActive: boolean
    isTeleprompterScrolling: boolean
    teleprompterScript: string
    teleprompterSpeed: number
    teleprompterFontSize: number
    isAnnotationActive: boolean
    annotationTool: 'pen' | 'highlighter'
    annotationColor: string
    annotationSize: number
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
    (e: 'start-autopilot'): void
    (e: 'update:podcast-settings', settings: any): void
    (e: 'update:audio-advanced', settings: any): void
    (e: 'update:cam-settings', val: any): void
    (e: 'update:selected-avatar', val: string): void
    (e: 'update:selected-voice', val: string): void
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
}>()
</script>

<style lang="scss" scoped>
.side-panel {
    box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
    animation: sidebarPulse 10s infinite alternate;
}

@keyframes sidebarPulse {
    from {
        border-color: rgba(255, 255, 255, 0.1);
    }

    to {
        border-color: rgba(249, 115, 22, 0.2);
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
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(249, 115, 22, 0.3);
    }
}
</style>
