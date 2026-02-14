<template>
    <el-popover :width="480" trigger="click" placement="top"
        popper-class="!bg-[#0a0a0a]/95 !backdrop-blur-3xl !border-white/5 !rounded-[32px] !p-0 !shadow-2xl !shadow-black/50"
        :show-after="0" :hide-after="0" :offset="20" transition="el-zoom-in-bottom">
        <template #reference>
            <slot name="trigger" />
        </template>

        <div class="settings-content overflow-hidden rounded-[32px]">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 pb-0">
                <div class="flex flex-col gap-1">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter">Studio Settings</h2>
                    <p class="text-[9px] font-bold text-white/20 uppercase tracking-widest">Version 2.5.0-premium</p>
                </div>
            </div>

            <div class="p-6 pt-4">
                <el-tabs v-model="activeTab" class="custom-settings-tabs">
                    <!-- 1. Technical / Stream -->
                    <el-tab-pane name="stream">
                        <template #label>
                            <div class="tab-item">
                                <broadcast theme="outline" size="14" />
                                <span>Broadcasting</span>
                            </div>
                        </template>

                        <div class="space-y-6 py-2">
                            <div class="space-y-3">
                                <label class="section-label">Streaming Quality</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button v-for="(v, k) in qualityPresets" :key="k" @click="localStreamQuality = k"
                                        class="quality-btn" :class="{ 'active': localStreamQuality === k }">
                                        <span class="text-[9px] font-black uppercase">{{ k }}</span>
                                        <span class="text-[7px] opacity-40">{{ v.label }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </el-tab-pane>

                    <!-- 2. Beauty / Enhance -->
                    <el-tab-pane name="beauty">
                        <template #label>
                            <div class="tab-item">
                                <magic theme="outline" size="14" />
                                <span>Enhancement</span>
                            </div>
                        </template>

                        <div class="space-y-6 py-2">
                            <!-- Global AI Toggle -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-black text-blue-400 uppercase tracking-widest">Enable AI Features</span>
                                    <span class="text-[8px] text-white/40">Face Tracking, Reframing & Virtual Backgrounds</span>
                                </div>
                                <el-switch v-model="studioStore.aiEnabled" size="small" 
                                    style="--el-switch-on-color: #3b82f6;" />
                            </div>

                            <!-- Enhancement Presets -->
                            <div class="space-y-3">
                                <label class="section-label">Enhancement Presets</label>
                                <div class="grid grid-cols-4 gap-2">
                                    <button v-for="(p, k) in enhancementPresets" :key="k" 
                                        @click="applyEnhancementPreset(p)"
                                        class="preset-btn" :class="{ 'active': isCurrentPreset(p) }">
                                        <span class="text-[8px] font-black uppercase">{{ k }}</span>
                                    </button>
                                </div>
                            </div>

                            <div class="flex items-center justify-between py-2 border-t border-white/5">
                                <label class="section-label !mb-0">Advanced Settings</label>
                                <el-switch v-model="showAdvancedEnhance" size="small" />
                            </div>

                            <div v-if="showAdvancedEnhance" class="space-y-4 animate-in slide-in-from-top-2">
                                <div class="slider-group">
                                    <div class="flex justify-between items-center mb-1">
                                        <label class="slider-label">Skin Smoothing</label>
                                        <span class="value-badge">{{ (visualSettings.beauty.smoothing * 100).toFixed(0)
                                            }}%</span>
                                    </div>
                                    <el-slider v-model="visualSettings.beauty.smoothing" :min="0" :max="1" :step="0.01"
                                        size="small" />
                                </div>

                                <div class="slider-group">
                                    <div class="flex justify-between items-center mb-1">
                                        <label class="slider-label">Face Brightening</label>
                                        <span class="value-badge">{{ (visualSettings.beauty.brightness * 100).toFixed(0)
                                            }}%</span>
                                    </div>
                                    <el-slider v-model="visualSettings.beauty.brightness" :min="0" :max="2" :step="0.01"
                                        size="small" />
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="slider-group">
                                        <div class="flex justify-between items-center mb-1">
                                            <label class="slider-label">Sharpen</label>
                                            <span class="value-badge">{{ (visualSettings.beauty.sharpen *
                                                100).toFixed(0)
                                                }}%</span>
                                        </div>
                                        <el-slider v-model="visualSettings.beauty.sharpen" :min="0" :max="1"
                                            :step="0.01" size="small" />
                                    </div>
                                    <div class="slider-group">
                                        <div class="flex justify-between items-center mb-1">
                                            <label class="slider-label">Denoise</label>
                                            <span class="value-badge">{{ (visualSettings.beauty.denoise *
                                                100).toFixed(0)
                                                }}%</span>
                                        </div>
                                        <el-slider v-model="visualSettings.beauty.denoise" :min="0" :max="1"
                                            :step="0.01" size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-tab-pane>

                    <!-- 3. Background -->
                    <el-tab-pane name="background">
                        <template #label>
                            <div class="tab-item">
                                <pic theme="outline" size="14" />
                                <span>Enviro</span>
                            </div>
                        </template>

                        <div class="space-y-6 py-2">
                            <div class="grid grid-cols-3 gap-2">
                                <div class="mode-select-box"
                                    :class="{ 'active': visualSettings.background.mode === 'none' }"
                                    @click="visualSettings.background.mode = 'none'">
                                    <span class="text-[9px] font-black uppercase">Standard</span>
                                </div>
                                <div class="mode-select-box"
                                    :class="{ 'active': visualSettings.background.mode === 'blur' }"
                                    @click="visualSettings.background.mode = 'blur'">
                                    <span class="text-[9px] font-black uppercase">Blur</span>
                                </div>
                                <div class="mode-select-box"
                                    :class="{ 'active': visualSettings.background.mode === 'virtual' }"
                                    @click="visualSettings.background.mode = 'virtual'">
                                    <span class="text-[9px] font-black uppercase">Virtual</span>
                                </div>
                            </div>

                            <!-- Blur Intensities -->
                            <div v-if="visualSettings.background.mode === 'blur'"
                                class="space-y-3 animate-in slide-in-from-top-2">
                                <label class="section-label">Intensity</label>
                                <div class="grid grid-cols-3 gap-2">
                                    <button v-for="level in (['low', 'medium', 'high'] as const)" :key="level"
                                        @click="visualSettings.background.blurLevel = level" class="intensity-btn"
                                        :class="{ 'active': visualSettings.background.blurLevel === level }">
                                        {{ level.toUpperCase() }}
                                    </button>
                                </div>
                            </div>

                            <!-- Asset Selector (Virtual Mode) -->
                            <div v-if="visualSettings.background.mode === 'virtual'"
                                class="space-y-4 animate-in slide-in-from-top-2">
                                <div class="space-y-2">
                                    <label class="section-label">Assets</label>
                                    <div class="grid grid-cols-4 gap-2">
                                        <div class="upload-btn" @click="triggerUpload">
                                            <plus theme="outline" size="14" />
                                        </div>
                                        <div v-for="asset in backgroundAssets" :key="asset.url" class="asset-thumb"
                                            :class="{ 'active': visualSettings.background.assetUrl === asset.url }"
                                            @click="selectAsset(asset)">
                                            <img :src="asset.thumbnail" class="w-full h-full object-cover">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-tab-pane>
                </el-tabs>

                <div class="flex justify-end gap-2 pt-6 border-t border-white/5">
                    <button @click="resetSettings"
                        class="px-4 py-2 rounded-xl bg-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all text-white/40">Reset</button>
                </div>
            </div>
            <input type="file" ref="fileInput" class="hidden" accept="image/*,video/*" @change="handleUpload" />
        </div>
    </el-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { Magic, Pic, Broadcast, Plus } from '@icon-park/vue-next';
import { storeToRefs } from 'pinia';

const props = defineProps<{
    streamQuality: string;
}>();

const emit = defineEmits(['update:streamQuality']);

const studioStore = useStudioStore();
const { visualSettings, backgroundAssets } = storeToRefs(studioStore);

const localStreamQuality = computed({
    get: () => props.streamQuality,
    set: (val) => emit('update:streamQuality', val)
});

const activeTab = ref('beauty'); // Default to beauty for quick access
const fileInput = ref<HTMLInputElement | null>(null);
const showAdvancedEnhance = ref(false);

const qualityPresets = {
    low: { label: '360p' },
    medium: { label: '480p' },
    high: { label: '720p' },
    ultra: { label: '1080p' }
};

const enhancementPresets = {
    Natural: { smoothing: 0.1, brightness: 0.8, sharpen: 0.2, denoise: 0.1 },
    Smooth: { smoothing: 0.5, brightness: 1.0, sharpen: 0.1, denoise: 0.3 },
    Bright: { smoothing: 0.2, brightness: 1.3, sharpen: 0.3, denoise: 0.1 },
    Studio: { smoothing: 0.3, brightness: 1.1, sharpen: 0.5, denoise: 0.4 }
};

const applyEnhancementPreset = (preset: any) => {
    visualSettings.value.beauty.smoothing = preset.smoothing;
    visualSettings.value.beauty.brightness = preset.brightness;
    visualSettings.value.beauty.sharpen = preset.sharpen;
    visualSettings.value.beauty.denoise = preset.denoise;
};

const isCurrentPreset = (preset: any) => {
    return Math.abs(visualSettings.value.beauty.smoothing - preset.smoothing) < 0.01 &&
        Math.abs(visualSettings.value.beauty.brightness - preset.brightness) < 0.01 &&
        Math.abs(visualSettings.value.beauty.sharpen - preset.sharpen) < 0.01 &&
        Math.abs(visualSettings.value.beauty.denoise - preset.denoise) < 0.01;
};

const triggerUpload = () => fileInput.value?.click();

const handleUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        visualSettings.value.background.assetUrl = url;
        visualSettings.value.background.isAssetVideo = file.type.startsWith('video/');
        visualSettings.value.background.mode = 'virtual';
    }
};

const selectAsset = (asset: any) => {
    visualSettings.value.background.assetUrl = asset.url;
    visualSettings.value.background.isAssetVideo = asset.isVideo;
    visualSettings.value.background.mode = 'virtual';
};

const resetSettings = () => {
    studioStore.resetVisualSettings();
    localStreamQuality.value = 'high';
};
</script>

<style lang="css">
/* Re-use styles but adapted for smaller popover */
.custom-settings-tabs .el-tabs__header {
    margin-bottom: 0px !important;
}

.custom-settings-tabs .el-tabs__nav-wrap::after {
    display: none;
}

.custom-settings-tabs .el-tabs__active-bar {
    @apply !bg-blue-500 !h-[3px] !rounded-full;
}

.custom-settings-tabs .el-tabs__item {
    @apply !text-white/20 !font-black !uppercase !tracking-widest !h-auto !pb-3 !px-4 !text-[10px];
}

.custom-settings-tabs .el-tabs__item.is-active {
    @apply !text-white;
}

.tab-item {
    @apply flex items-center gap-2 py-1;
}

.section-label {
    @apply text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block;
}

.quality-btn {
    @apply p-3 rounded-xl border border-white/5 bg-white/5 flex flex-col items-center gap-1 transition-all hover:border-white/20;
}

.quality-btn.active {
    @apply bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20;
}

.preset-btn {
    @apply p-2 rounded-lg border border-white/5 bg-white/5 flex flex-col items-center gap-1 transition-all hover:border-white/20;
}

.preset-btn.active {
    @apply bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10;
}

.slider-label {
    @apply text-[9px] font-black text-white/50 uppercase tracking-widest;
}

.value-badge {
    @apply text-[8px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full;
}

.mode-select-box {
    @apply p-3 rounded-xl border border-white/5 bg-white/5 flex flex-col items-center gap-1 cursor-pointer transition-all hover:bg-white/10;
}

.mode-select-box.active {
    @apply border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/10;
}

.intensity-btn {
    @apply p-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-white/30 transition-all;
}

.intensity-btn.active {
    @apply bg-white/20 border-white/40 text-white;
}

.upload-btn {
    @apply aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all text-white/40;
}

.asset-thumb {
    @apply aspect-square rounded-xl border-2 border-white/5 overflow-hidden cursor-pointer transition-all relative grayscale hover:grayscale-0;
}

.asset-thumb.active {
    @apply border-blue-500 grayscale-0 shadow-md shadow-blue-500/20;
}

.el-slider {
    --el-slider-main-bg-color: #3b82f6;
    --el-slider-runway-bg-color: rgba(255, 255, 255, 0.05);
    --el-slider-stop-bg-color: transparent;
    --el-slider-button-size: 16px;
}
</style>
