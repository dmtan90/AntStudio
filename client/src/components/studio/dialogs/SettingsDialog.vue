<template>
    <el-dialog v-model="visible" :show-close="false" width="680px" append-to-body
        class="studio-settings-dialog !bg-[#0a0a0a]/95 !backdrop-blur-3xl !border-white/5 !rounded-[40px] !p-0 overflow-hidden">
        <template #header>
            <div class="flex items-center justify-between p-8 pb-0">
                <div class="flex flex-col gap-1">
                    <h2 class="text-2xl font-black text-white uppercase tracking-tighter">Studio Settings</h2>
                    <p class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Version 2.5.0-premium</p>
                </div>
                <button @click="visible = false"
                    class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group">
                    <close theme="outline" size="20" class="text-white/40 group-hover:text-white" />
                </button>
            </div>
        </template>

        <div class="p-8 pt-6">
            <el-tabs v-model="activeTab" class="custom-settings-tabs">
                <!-- 1. Technical / Stream -->
                <el-tab-pane name="stream">
                    <template #label>
                        <div class="tab-item">
                            <broadcast theme="outline" size="16" />
                            <span>Broadcasting</span>
                        </div>
                    </template>

                    <div class="space-y-8 py-4">
                        <div class="space-y-4">
                            <label class="section-label">Streaming Quality</label>
                            <div class="grid grid-cols-4 gap-3">
                                <button v-for="(v, k) in qualityPresets" :key="k" @click="localStreamQuality = k"
                                    class="quality-btn" :class="{ 'active': localStreamQuality === k }">
                                    <span class="text-[10px] font-black uppercase">{{ k }}</span>
                                    <span class="text-[8px] opacity-40">{{ v.label }}</span>
                                </button>
                            </div>
                            <p class="text-[9px] text-white/20 italic italic">Recommendation: Use 'Low' if network is
                                unstable.
                            </p>
                        </div>
                    </div>
                </el-tab-pane>

                <!-- 2. Beauty / Enhance -->
                <el-tab-pane name="beauty">
                    <template #label>
                        <div class="tab-item">
                            <magic theme="outline" size="16" />
                            <span>Enhancement</span>
                        </div>
                    </template>

                    <div class="grid grid-cols-2 gap-8 py-4">
                        <div class="space-y-6">
                            <div class="slider-group">
                                <div class="flex justify-between items-center mb-2">
                                    <label class="slider-label">Skin Smoothing (Beauty)</label>
                                    <span class="value-badge">{{ (visualSettings.beauty.smoothing * 100).toFixed(0)
                                    }}%</span>
                                </div>
                                <el-slider v-model="visualSettings.beauty.smoothing" :min="0" :max="1" :step="0.01" />
                            </div>

                            <div class="slider-group">
                                <div class="flex justify-between items-center mb-2">
                                    <label class="slider-label">Face Brightening</label>
                                    <span class="value-badge">{{ (visualSettings.beauty.brightness * 100).toFixed(0)
                                    }}%</span>
                                </div>
                                <el-slider v-model="visualSettings.beauty.brightness" :min="0" :max="2" :step="0.01" />
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="slider-group">
                                <div class="flex justify-between items-center mb-2">
                                    <label class="slider-label">Edge Sharpening</label>
                                    <span class="value-badge">{{ (visualSettings.beauty.sharpen * 100).toFixed(0)
                                    }}%</span>
                                </div>
                                <el-slider v-model="visualSettings.beauty.sharpen" :min="0" :max="1" :step="0.01" />
                            </div>

                            <div class="slider-group">
                                <div class="flex justify-between items-center mb-2">
                                    <label class="slider-label">Noise Reduction</label>
                                    <span class="value-badge">{{ (visualSettings.beauty.denoise * 100).toFixed(0)
                                    }}%</span>
                                </div>
                                <el-slider v-model="visualSettings.beauty.denoise" :min="0" :max="1" :step="0.01" />
                            </div>

                            <div
                                class="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 mt-2">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-black uppercase tracking-wider text-white">Red-Eye
                                        Removal</span>
                                    <span class="text-[8px] text-white/30 lowercase">Auto-fix flash reflection</span>
                                </div>
                                <el-switch v-model="visualSettings.beauty.redEye" />
                            </div>
                        </div>
                    </div>
                </el-tab-pane>

                <!-- 3. Background -->
                <el-tab-pane name="background">
                    <template #label>
                        <div class="tab-item">
                            <pic theme="outline" size="16" />
                            <span>Environment</span>
                        </div>
                    </template>

                    <div class="space-y-8 py-4">
                        <div class="grid grid-cols-3 gap-4">
                            <div class="mode-select-box"
                                :class="{ 'active': visualSettings.background.mode === 'none' }"
                                @click="visualSettings.background.mode = 'none'">
                                <span class="text-[10px] font-black uppercase">Standard</span>
                                <span class="text-[8px] opacity-40">Zero effects</span>
                            </div>
                            <div class="mode-select-box"
                                :class="{ 'active': visualSettings.background.mode === 'blur' }"
                                @click="visualSettings.background.mode = 'blur'">
                                <span class="text-[10px] font-black uppercase tracking-tighter">Portrait Blur</span>
                                <span class="text-[8px] opacity-40">AI Deep Focus</span>
                            </div>
                            <div class="mode-select-box"
                                :class="{ 'active': visualSettings.background.mode === 'virtual' }"
                                @click="visualSettings.background.mode = 'virtual'">
                                <span class="text-[10px] font-black uppercase">Virtual Stage</span>
                                <span class="text-[8px] opacity-40">Replace BG</span>
                            </div>
                        </div>

                        <!-- Blur Intensities -->
                        <div v-if="visualSettings.background.mode === 'blur'"
                            class="space-y-4 animate-in slide-in-from-top-4">
                            <label class="section-label">Blur Intensity</label>
                            <div class="grid grid-cols-3 gap-3">
                                <button v-for="level in (['low', 'medium', 'high'] as const)" :key="level"
                                    @click="visualSettings.background.blurLevel = level" class="intensity-btn"
                                    :class="{ 'active': visualSettings.background.blurLevel === level }">
                                    {{ level.toUpperCase() }}
                                </button>
                            </div>
                        </div>

                        <!-- Asset Selector (Virtual Mode) -->
                        <div v-if="visualSettings.background.mode === 'virtual'"
                            class="space-y-6 animate-in slide-in-from-top-4">
                            <div class="space-y-4">
                                <label class="section-label">Stage Assets</label>
                                <div class="grid grid-cols-4 gap-3">
                                    <div class="upload-btn" @click="triggerUpload">
                                        <plus theme="outline" size="16" />
                                        <span class="text-[8px] font-bold">UPLOAD</span>
                                    </div>
                                    <div v-for="asset in stockAssets" :key="asset.url" class="asset-thumb"
                                        :class="{ 'active': visualSettings.background.assetUrl === asset.url }"
                                        @click="selectAsset(asset)">
                                        <img :src="asset.thumbnail" class="w-full h-full object-cover">
                                        <div v-if="asset.isVideo" class="video-badge">VIDEO</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-tab-pane>
            </el-tabs>

            <div class="flex justify-end gap-3 pt-8 border-t border-white/5">
                <button @click="resetSettings"
                    class="px-6 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase hover:bg-white/10 transition-all text-white/40">Reset
                    to Default</button>
                <button @click="visible = false"
                    class="px-8 py-3 rounded-2xl bg-blue-600 text-[10px] font-black uppercase hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all text-white">Save
                    Changes</button>
            </div>
        </div>
        <input type="file" ref="fileInput" class="hidden" accept="image/*,video/*" @change="handleUpload" />
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { Close, Magic, Pic, Broadcast, Plus, Camera, VideoTwo } from '@icon-park/vue-next';
import { storeToRefs } from 'pinia';

const props = defineProps<{
    modelValue: boolean;
    streamQuality: string;
}>();

const emit = defineEmits(['update:modelValue', 'update:streamQuality']);

const studioStore = useStudioStore();
const { visualSettings } = storeToRefs(studioStore);

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

const localStreamQuality = computed({
    get: () => props.streamQuality,
    set: (val) => emit('update:streamQuality', val)
});

const activeTab = ref('stream');
const fileInput = ref<HTMLInputElement | null>(null);

const qualityPresets = {
    low: { label: '360p @ 30fps' },
    medium: { label: '480p @ 30fps' },
    high: { label: '720p @ 30fps' },
    ultra: { label: '1080p @ 30fps' }
};

const stockAssets = [
    { name: 'Office', url: '/bg/modern-office.jpg', thumbnail: '/bg/modern-office.jpg', isVideo: false },
    { name: 'Studio', url: '/bg/pro-studio.jpg', thumbnail: '/bg/pro-studio.jpg', isVideo: false },
    { name: 'Cyberpunk', url: '/bg/cyberpunk_penthouse.jpg', thumbnail: '/bg/cyberpunk_penthouse.jpg', isVideo: false },
    { name: 'Clouds', url: '/bg/cloud.jpg', thumbnail: '/bg/cloud.jpg', isVideo: false },
];

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
.studio-settings-dialog {
    --el-dialog-bg-color: transparent;
    --el-dialog-box-shadow: none;
    --el-text-color-primary: #fff;
}

.custom-settings-tabs .el-tabs__nav-wrap::after {
    display: none;
}

.custom-settings-tabs .el-tabs__active-bar {
    @apply !bg-blue-500 !h-[3px] !rounded-full;
}

.custom-settings-tabs .el-tabs__item {
    @apply !text-white/20 !font-black !uppercase !tracking-widest !h-auto !pb-4 !px-6;
}

.custom-settings-tabs .el-tabs__item.is-active {
    @apply !text-white;
}

.tab-item {
    @apply flex items-center gap-3 py-2;
}

.section-label {
    @apply text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block;
}

.quality-btn {
    @apply p-4 rounded-3xl border border-white/5 bg-white/5 flex flex-col items-center gap-1 transition-all hover:border-white/20;
}

.quality-btn.active {
    @apply bg-blue-600 border-blue-400 shadow-xl shadow-blue-500/20;
}

.slider-label {
    @apply text-[10px] font-black text-white/50 uppercase tracking-widest;
}

.value-badge {
    @apply text-[9px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full;
}

.mode-select-box {
    @apply p-5 rounded-3xl border border-white/5 bg-white/5 flex flex-col items-center gap-1 cursor-pointer transition-all hover:bg-white/10;
}

.mode-select-box.active {
    @apply border-blue-500/50 bg-blue-500/10 ring-4 ring-blue-500/5;
}

.intensity-btn {
    @apply p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-white/30 transition-all;
}

.intensity-btn.active {
    @apply bg-white/20 border-white/40 text-white;
}

.upload-btn {
    @apply aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/30 hover:bg-white/5 transition-all text-white/40;
}

.asset-thumb {
    @apply aspect-video rounded-2xl border-2 border-white/5 overflow-hidden cursor-pointer transition-all relative grayscale hover:grayscale-0;
}

.asset-thumb.active {
    @apply border-blue-500 grayscale-0 shadow-lg shadow-blue-500/20;
}

.video-badge {
    @apply absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[6px] font-black text-white;
}

.el-slider {
    --el-slider-main-bg-color: #3b82f6;
    --el-slider-runway-bg-color: rgba(255, 255, 255, 0.05);
    --el-slider-stop-bg-color: transparent;
}
</style>
