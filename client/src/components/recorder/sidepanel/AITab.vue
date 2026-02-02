<template>
    <div class="flex flex-col gap-8">
        <div class="panel-section space-y-6">
            <div class="space-y-4">
                <span class="text-[10px] font-bold text-orange-400 uppercase block">Beauty Filter</span>
                <div
                    class="toggle-card flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-white/90">Retouch</span>
                        <span class="text-[9px] text-white/40">Smooth & Brighten</span>
                    </div>
                    <el-switch :model-value="enableBeauty"
                        @update:model-value="v => $emit('toggle-ai-filter', 'beauty_smooth', !!v)" size="small" />
                </div>

                <div v-if="enableBeauty" class="space-y-4 pt-2 border-t border-white/5">
                    <div class="control-item">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-white/60 uppercase">Smoothing</span>
                            <span class="text-[9px] text-orange-400 font-mono">{{ (beautySettings.smoothing *
                                100).toFixed(0)
                            }}%</span>
                        </div>
                        <el-slider v-model="beautySettings.smoothing" :min="0" :max="1" :step="0.01"
                            :show-tooltip="false" size="small" />
                    </div>
                    <div class="control-item">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-white/60 uppercase">Brightness</span>
                            <span class="text-[9px] text-orange-400 font-mono">{{ (beautySettings.brightness *
                                100).toFixed(0)
                            }}%</span>
                        </div>
                        <el-slider v-model="beautySettings.brightness" :min="0.5" :max="2" :step="0.01"
                            :show-tooltip="false" size="small" />
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <span class="text-[10px] font-bold text-orange-400 uppercase block">Accessibility</span>
                <div class="toggle-card flex flex-col gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-bold text-white/90">ASL Assist</span>
                            <span class="text-[9px] text-white/40">Hand signs recognition</span>
                        </div>
                        <el-switch :model-value="enableAslAssist"
                            @update:model-value="v => $emit('update:enableAslAssist', !!v)" size="small" />
                    </div>
 
                    <div v-if="enableAslAssist" class="pt-2 border-t border-white/5 flex flex-col gap-2">
                        <span class="text-[9px] text-white/40 uppercase">Mode</span>
                        <div class="grid grid-cols-2 gap-2">
                            <button class="p-2 rounded-lg text-[9px] font-bold border transition-all"
                                :class="aslMode === 'asl-to-text' ? 'bg-orange-500 border-orange-400 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/40'"
                                @click="$emit('update:aslMode', 'asl-to-text')">
                                Sign to Text
                            </button>
                            <button class="p-2 rounded-lg text-[9px] font-bold border transition-all"
                                :class="aslMode === 'text-to-asl' ? 'bg-orange-500 border-orange-400 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/40'"
                                @click="$emit('update:aslMode', 'text-to-asl')">
                                Text to Sign
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    class="toggle-card flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-white">Live Captions</span>
                        <span class="text-[9px] text-white/40">Real-time STT</span>
                    </div>
                    <el-switch :model-value="activeCaptions" @update:model-value="v => $emit('toggle-captions', !!v)"
                        size="small" />
                </div>

                <div v-if="activeCaptions" class="pt-2 border-b border-white/5 pb-4">
                    <span class="text-[9px] text-white/40 uppercase block mb-2">Translation</span>
                    <el-select :model-value="targetLanguage"
                        @update:model-value="v => $emit('update:targetLanguage', v)" size="small" class="w-full">
                        <el-option label="Vietnamese" value="vi" />
                        <el-option label="English" value="en" />
                        <el-option label="Japanese" value="ja" />
                        <el-option label="Korean" value="ko" />
                    </el-select>
                </div>
            </div>

            <div class="space-y-4">
                <span class="text-[10px] font-bold text-orange-400 uppercase block">Virtual Camera</span>
                <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] text-white/40 uppercase">Background</span>
                        <div class="flex gap-2">
                            <button v-for="t in ['none', 'blur', 'image', 'video']" :key="t"
                                class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[8px] font-bold uppercase transition-all"
                                :class="camSettings.backgroundType === t ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'text-white/40'"
                                @click="$emit('update:camSettings', { ...camSettings, backgroundType: t })">
                                {{ t[0] }}
                            </button>
                        </div>
                    </div>
 
                    <div v-if="camSettings.backgroundType === 'blur'" class="control-item">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-white/60 uppercase">Blur Strength</span>
                            <span class="text-[9px] text-orange-400 font-mono">{{ camSettings.blurStrength }}px</span>
                        </div>
                        <el-slider :model-value="camSettings.blurStrength" @update:model-value="v => $emit('update:camSettings', { ...camSettings, blurStrength: v })"
                            :min="0" :max="30" :show-tooltip="false" size="small" />
                    </div>
 
                    <div v-if="camSettings.backgroundType === 'image' || camSettings.backgroundType === 'video'"
                        class="space-y-2">
                        <span class="text-[9px] text-white/40 uppercase block">Resource</span>
                        <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                            <div v-for="res in filteredResources" :key="res.id"
                                class="w-12 h-12 rounded-lg bg-black/40 border-2 cursor-pointer overflow-hidden transition-all"
                                :class="camSettings.backgroundResource === res.id ? 'border-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'border-transparent'"
                                @click="$emit('update:camSettings', { ...camSettings, backgroundResource: res.id })">
                                <img v-if="res.type === 'image'" :src="res.url" class="w-full h-full object-cover" />
                                <div v-else class="w-full h-full flex items-center justify-center">
                                    <VideoOne theme="outline" size="14" class="text-white/20" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="toggle-card flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-white">Enhanced Quality</span>
                        <span class="text-[9px] text-white/40">AI denoising & sharpening</span>
                    </div>
                    <el-switch :model-value="camSettings.enableEnhance" 
                        @update:model-value="v => $emit('update:camSettings', { ...camSettings, enableEnhance: !!v })"
                        size="small" />
                </div>

                <!-- FaceSwap Section -->
                <div class="panel-section border-t border-white/5 pt-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex flex-col gap-1">
                            <span class="text-[10px] font-bold text-orange-400 uppercase">FaceSwap</span>
                            <span class="text-[9px] text-white/40">AI Face Replacement</span>
                        </div>
                        <el-switch :model-value="camSettings.enableFaceSwap" 
                            @update:model-value="v => $emit('update:camSettings', { ...camSettings, enableFaceSwap: !!v })"
                            size="small" />
                    </div>

                    <div v-if="camSettings.enableFaceSwap" class="space-y-4">
                        <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                            <span class="text-[9px] text-white/40 uppercase block mb-3">Select Target Face</span>
                            <div v-if="resourcePool.filter(r => r.type === 'image').length" 
                                class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                <div v-for="res in resourcePool.filter(r => r.type === 'image')" :key="res.id"
                                    class="w-12 h-12 rounded-lg bg-black/40 border-2 cursor-pointer overflow-hidden transition-all"
                                    :class="camSettings.faceSwapResource === res.id ? 'border-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'border-transparent'"
                                    @click="$emit('update:camSettings', { ...camSettings, faceSwapResource: res.id })">
                                    <img :src="res.url" class="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div v-else class="text-center py-4 border-2 border-dashed border-white/5 rounded-xl">
                                <p class="text-[8px] text-white/20 uppercase mb-2">No Face Images</p>
                                <button @click="$emit('trigger-resource-upload')" 
                                    class="text-[8px] text-orange-400 font-bold hover:underline">UPLOAD FACE</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElSwitch, ElSlider, ElSelect, ElOption } from 'element-plus'
import { VideoOne } from '@icon-park/vue-next'

const props = defineProps<{
    enableBeauty: boolean
    beautySettings: { smoothing: number; brightness: number }
    enableAslAssist: boolean
    aslMode: 'asl-to-text' | 'text-to-asl'
    activeCaptions: boolean
    targetLanguage: string
    camSettings: any
    resourcePool: any[]
}>()

const filteredResources = computed(() => {
    if (props.camSettings.backgroundType === 'image') return props.resourcePool.filter(r => r.type === 'image')
    if (props.camSettings.backgroundType === 'video') return props.resourcePool.filter(r => r.type === 'video')
    return []
})

defineEmits<{
    (e: 'toggle-ai-filter', id: string, val: boolean): void
    (e: 'update:enableAslAssist', val: boolean): void
    (e: 'update:aslMode', mode: 'asl-to-text' | 'text-to-asl'): void
    (e: 'toggle-captions', val: boolean): void
    (e: 'update:targetLanguage', val: string): void
    (e: 'update:camSettings', val: any): void
    (e: 'trigger-resource-upload'): void
}>()
</script>
