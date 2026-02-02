<template>
    <div v-if="podcastSettings" class="podcast-sidebar space-y-8">
        <!-- Podcast Studio Controls -->
        <div class="panel-section">
            <span class="text-[10px] font-bold text-orange-400 uppercase mb-4 block">Podcast Studio</span>

            <div class="control-item mb-4">
                <span class="text-[9px] text-white/40 font-bold uppercase block mb-2">Background</span>
                <div class="grid grid-cols-4 gap-2">
                    <button
                        v-for="bg in ['#000', 'linear-gradient(45deg, #1a1a1a, #000)', 'linear-gradient(135deg, #001, #102)']"
                        :key="bg" class="aspect-video rounded-lg border border-white/10" :style="{ background: bg }"
                        @click="$emit('update:podcast-settings', { ...podcastSettings, bg })"></button>
                    <button
                        class="aspect-video rounded-lg border border-white/10 bg-white/5 flex items-center justify-center"
                        title="Custom Image" @click="$emit('trigger-resource-upload')">
                        <close size="14" class="rotate-45" />
                    </button>
                </div>
            </div>

            <div class="control-item">
                <span class="text-[9px] text-white/40 font-bold uppercase block mb-2">Visualizer Style</span>
                <div class="flex gap-2">
                    <button v-for="type in ['bars', 'waveform', 'circles']" :key="type"
                        class="flex-1 py-2 bg-white/5 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        :class="podcastSettings.visualType === type ? 'bg-orange-500 text-white border-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'border-white/5 text-white/40 hover:bg-white/10'"
                        @click="$emit('update:podcast-settings', { ...podcastSettings, visualType: type })">
                        {{ type }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Advanced Audio Suite -->
        <div class="panel-section border-t border-white/5 pt-6">
            <span class="text-[10px] font-bold text-orange-400 uppercase mb-4 block">Advanced Audio Suite</span>

            <div class="space-y-6">
                <div class="control-item">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[9px] text-white/40 font-bold uppercase">Pro Enhance</span>
                        <el-switch :model-value="podcastSettings.proEnhance" 
                            @update:model-value="v => $emit('update:podcast-settings', { ...podcastSettings, proEnhance: !!v })"
                            size="small" />
                    </div>
                    <p class="text-[8px] text-white/20 mt-1">Multi-band compression & noise gate</p>
                </div>

                <div class="control-item">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[9px] text-white/40 font-bold uppercase">Master Mix</span>
                        <span class="text-[9px] text-orange-400 font-mono">{{ (podcastSettings.bgmVolume * 100).toFixed(0) }}% BGM</span>
                    </div>
                    <el-slider :model-value="podcastSettings.bgmVolume" @update:model-value="v => $emit('update:podcast-settings', { ...podcastSettings, bgmVolume: v })"
                        :min="0" :max="1" :step="0.01" :show-tooltip="false" size="small" />
                </div>
            </div>
        </div>

        <!-- Virtual Camera Suite -->
        <div class="panel-section border-t border-white/5 pt-6">
            <span class="text-[10px] font-bold text-orange-400 uppercase mb-4 block">Visual Guest Feed</span>
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] text-white/40 uppercase">Background</span>
                    <div class="flex gap-2">
                        <button v-for="t in ['none', 'blur', 'image', 'video']" :key="t"
                            class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[8px] font-bold uppercase transition-all"
                            :class="podcastSettings.backgroundType === t ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'text-white/40'"
                            @click="$emit('update:podcast-settings', { ...podcastSettings, backgroundType: t })">
                            {{ t[0] }}
                        </button>
                    </div>
                </div>

                <div v-if="podcastSettings.backgroundType === 'image' || podcastSettings.backgroundType === 'video'"
                    class="space-y-2">
                    <span class="text-[9px] text-white/40 uppercase block">Resource</span>
                    <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        <div v-for="res in filteredResources" :key="res.id"
                            class="w-12 h-12 rounded-lg bg-black/40 border-2 cursor-pointer overflow-hidden transition-all"
                            :class="podcastSettings.backgroundResource === res.id ? 'border-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.3)]' : 'border-transparent'"
                            @click="$emit('update:podcast-settings', { ...podcastSettings, backgroundResource: res.id })">
                            <img v-if="res.type === 'image'" :src="res.url" class="w-full h-full object-cover" />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <VideoOne theme="outline" size="14" class="text-white/20" />
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
import { Close, VideoOne } from '@icon-park/vue-next'
import { ElSwitch, ElSlider } from 'element-plus'

const props = defineProps<{
    mode: string
    podcastSettings: any
    resourcePool: any[]
}>()

const filteredResources = computed(() => {
    if (props.podcastSettings.backgroundType === 'image') return props.resourcePool.filter(r => r.type === 'image')
    if (props.podcastSettings.backgroundType === 'video') return props.resourcePool.filter(r => r.type === 'video')
    return []
})

defineEmits<{
    (e: 'update:podcast-settings', settings: any): void
    (e: 'update:audio-advanced', settings: any): void
    (e: 'trigger-resource-upload'): void
}>()
</script>
