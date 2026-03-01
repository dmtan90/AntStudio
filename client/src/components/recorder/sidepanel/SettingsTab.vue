<template>
    <div class="h-full flex flex-col">
        <!-- Main Settings Category List -->
        <div v-if="!activeCategory" class="flex flex-col gap-2">
            <button v-for="cat in categories" :key="cat.id" 
                @click="activeCategory = cat.id as any"
                class="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-brand-primary/30 transition-all text-left group">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center border border-white/10 text-brand-primary group-hover:scale-110 transition-transform">
                        <component :is="cat.icon" size="18" />
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[11px] font-bold text-white uppercase tracking-wider">{{ cat.name }}</span>
                        <span class="text-[9px] text-white/40 tracking-widest mt-0.5">{{ cat.desc }}</span>
                    </div>
                </div>
                <Right size="16" class="text-white/20 group-hover:text-brand-primary transition-colors" />
            </button>
        </div>

        <!-- Drill-down Sub-panel -->
        <div v-else class="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
            <!-- Breadcrumb / Back Button -->
            <div class="flex items-center gap-3 mb-4 sticky top-0 bg-black/80 backdrop-blur-md pb-2 z-10 border-b border-white/5">
                <button @click="activeCategory = null" 
                    class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <Left size="16" />
                </button>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">Settings</span>
                    <span class="text-xs font-bold text-white uppercase tracking-wider">{{ currentCategoryName }}</span>
                </div>
            </div>

            <!-- Inject specific tabs based on active category -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
                
                <FiltersTab v-if="activeCategory === 'filters'" 
                    :video-filters="videoFilters"
                    :applied-filter="appliedFilter"
                    :mode="mode"
                    :cam-settings="camSettings"
                    @update:appliedFilter="(v) => $emit('update:appliedFilter', v)" />
                    
                <AITab v-if="activeCategory === 'ai'" 
                    :mode="mode"
                    :enable-beauty="enableBeauty"
                    :beauty-settings="beautySettings"
                    :enable-asl-assist="enableAslAssist"
                    :asl-mode="aslMode"
                    :active-captions="activeCaptions"
                    :target-language="targetLanguage"
                    :cam-settings="camSettings"
                    :resource-pool="resourcePool"
                    :is-v-tuber-active="isVTuberActive"
                    :selected-avatar="selectedAvatar"
                    :selected-voice="selectedVoice"
                    :processing-canvas="processingCanvas"
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
                    @trigger-resource-upload="$emit('trigger-resource-upload')" />

                <ProductionTab v-if="activeCategory === 'production'"
                    :layout-preset="layoutPreset"
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
                    :cam-settings="camSettings"
                    @update:layout-preset="v => $emit('update:layout-preset', v)"
                    @update:is-teleprompter-active="v => $emit('update:is-teleprompter-active', v)"
                    @update:is-teleprompter-scrolling="v => $emit('update:is-teleprompter-scrolling', v)"
                    @update:teleprompter-script="v => $emit('update:teleprompter-script', v)"
                    @update:teleprompter-speed="v => $emit('update:teleprompter-speed', v)"
                    @update:teleprompter-font-size="v => $emit('update:teleprompter-font-size', v)"
                    @update:teleprompter-scroll-pos="v => $emit('update:teleprompter-scroll-pos', v)"
                    @update:is-annotation-active="v => $emit('update:is-annotation-active', v)"
                    @update:annotation-tool="v => $emit('update:annotation-tool', v)"
                    @update:annotation-color="v => $emit('update:annotation-color', v)"
                    @update:annotation-size="v => $emit('update:annotation-size', v)"
                    @clear-annotations="$emit('clear-annotations')" 
                    @update:recording-quality="v => $emit('update:recording-quality', v)"
                    @update:cam-settings="v => $emit('update:cam-settings', v)" />

                <HardwareTab v-if="activeCategory === 'hardware'" 
                    :video-devices="videoDevices"
                    :audio-devices="audioDevices"
                    :selected-camera-id="selectedCameraId"
                    :selected-mic-id="selectedMicId"
                    :mic-volume="micVolume"
                    @update:selected-camera-id="id => $emit('update:selected-camera-id', id)"
                    @update:selected-mic-id="id => $emit('update:selected-mic-id', id)"
                    @update:mic-volume="val => $emit('update:mic-volume', val)" />

                <LiveTab v-if="activeCategory === 'live'" 
                    :stream-config="streamConfig"
                    :stream-stats="streamStats"
                    :selected-platforms="selectedPlatforms"
                    :available-accounts="availableAccounts"
                    @toggle-platform="id => $emit('toggle-platform', id)"
                    :show-platform-selector="showPlatformSelector"
                    @update:show-platform-selector="v => $emit('update:show-platform-selector', v)" />
                    
                 <AudioTab v-if="activeCategory === 'audio'"
                    :mic-volume="micVolume"
                    :bgm-volume="bgmVolume"
                    :is-ducking-enabled="isDuckingEnabled"
                    :bgm-url="bgmUrl"
                    :bgm-library="bgmLibrary"
                    @update:micVolume="v => $emit('update:mic-volume', v)"
                    @update:bgmVolume="v => $emit('update:bgm-volume', v)"
                    @update:isDuckingEnabled="v => $emit('update:is-ducking-enabled', v)"
                    @update:bgmUrl="v => $emit('update:bgm-url', v)"
                    @toggle-bgm="$emit('toggle-bgm')" />
                
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Right, Left, MagicWand, Magic, Devices, SettingConfig, BroadcastRadio, Voice } from '@icon-park/vue-next'
import type { RecordingMode } from '@/composables/useRecorder'

import FiltersTab from './FiltersTab.vue'
import AITab from './AITab.vue'
import ProductionTab from './ProductionTab.vue'
import HardwareTab from './HardwareTab.vue'
import LiveTab from './LiveTab.vue'
import AudioTab from './AudioTab.vue'

const props = defineProps<{
    mode: RecordingMode
    // FiltersTab
    videoFilters?: any[]
    appliedFilter?: string
    camSettings?: any
    // AITab
    enableBeauty?: boolean
    beautySettings?: { smoothing: number; brightness: number }
    enableAslAssist?: boolean
    aslMode?: 'asl-to-text' | 'text-to-asl'
    activeCaptions?: boolean
    targetLanguage?: string
    resourcePool?: any[]
    isVTuberActive?: boolean
    selectedAvatar?: string
    selectedVoice?: string
    processingCanvas?: HTMLCanvasElement | null
    // ProductionTab
    layoutPreset?: string
    isTeleprompterActive?: boolean
    isTeleprompterScrolling?: boolean
    teleprompterScript?: string
    teleprompterSpeed?: number
    teleprompterFontSize?: number
    isAnnotationActive?: boolean
    annotationTool?: 'pen' | 'highlighter'
    annotationColor?: string
    annotationSize?: number
    recordingQuality?: { resolution: string; fps: number }
    // HardwareTab
    videoDevices?: MediaDeviceInfo[]
    audioDevices?: MediaDeviceInfo[]
    selectedCameraId?: string | null
    selectedMicId?: string | null
    micVolume?: number
    // LiveTab
    streamConfig?: { serverUrl: string, streamKey: string, useAntMedia: boolean }
    streamStats?: any
    selectedPlatforms?: string[]
    availableAccounts?: any[]
    // AudioTab
    bgmVolume?: number
    isDuckingEnabled?: boolean
    bgmUrl?: string | null
    bgmLibrary?: Array<{ id: string; name: string; url: string }>
    showPlatformSelector?: boolean
}>()

const activeCategory = ref<'filters' | 'ai' | 'production' | 'hardware' | 'live' | 'audio' | null>(null)

const categories = computed(() => {
    const list = [
        { id: 'filters', name: 'Filters & Blur', desc: 'Background effects, color grading', icon: MagicWand },
        { id: 'ai', name: 'AI Features', desc: 'Avatars, Auto-Captions, Tracking', icon: Magic },
        { id: 'production', name: 'Production', desc: 'Prompter, Layout, Annotation', icon: SettingConfig },
        { id: 'audio', name: 'Audio Settings', desc: 'Microphone, BGM, Ducking', icon: Voice },
        { id: 'hardware', name: 'Devices', desc: 'Camera, Microphone selection', icon: Devices },
        { id: 'live', name: 'Live Stream', desc: 'RTMP destination, Platforms', icon: BroadcastRadio }
    ]
    // if (props.mode === 'camera-screen' || props.mode === 'camera' || props.mode === 'screen') {
    //     list.push({ id: 'live', name: 'Live Stream', desc: 'RTMP destination, Platforms', icon: BroadcastRadio })
    // }
    return list
})

const currentCategoryName = computed(() => {
    return categories.value.find(c => c.id === activeCategory.value)?.name || ''
})
</script>
