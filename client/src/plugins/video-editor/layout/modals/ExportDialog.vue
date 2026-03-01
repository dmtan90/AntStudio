<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from 'video-editor/store/editor';
import { ElDialog, ElButton, ElProgress, ElRadio, ElRadioGroup, ElSelect, ElOption } from 'element-plus';
import { Videocamera, Close, Check, Loading, Download } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const editor = useEditorStore();
const { t } = useI18n();

const showDialog = ref(false);
const isExporting = ref(false);
const exportProgress = ref(0);
const currentFrame = ref('');
const estimatedTime = ref('');
const exportedFileSize = ref('');

// Quality Presets
const qualityPresets = computed(() => [
    {
        id: 'draft',
        name: t('videoEditor.export.presets.draft'),
        description: t('videoEditor.export.presets.draftDesc'),
        icon: '⚡',
        settings: { resolution: '720p', fps: 24, bitrate: 'low', codec: 'h264' }
    },
    {
        id: 'standard',
        name: t('videoEditor.export.presets.standard'),
        description: t('videoEditor.export.presets.standardDesc'),
        icon: '⭐',
        settings: { resolution: '1080p', fps: 30, bitrate: 'medium', codec: 'h264' }
    },
    {
        id: 'high',
        name: t('videoEditor.export.presets.high'),
        description: t('videoEditor.export.presets.highDesc'),
        icon: '💎',
        settings: { resolution: '1080p', fps: 60, bitrate: 'high', codec: 'h264' }
    },
    {
        id: 'ultra',
        name: t('videoEditor.export.presets.ultra'),
        description: t('videoEditor.export.presets.ultraDesc'),
        icon: '🚀',
        settings: { resolution: '2160p', fps: 60, bitrate: 'ultra', codec: 'h265' }
    }
]);

const selectedPreset = ref('standard');
const customSettings = ref({
    format: 'mp4',
    codec: 'h264',
    resolution: '1080p',
    fps: 30,
    bitrate: 'medium',
    includeAudio: true
});

const resolutionOptions = computed(() => [
    { label: `720p (1280x720)`, value: '720p' },
    { label: `1080p (1920x1080)`, value: '1080p' },
    { label: `1440p (2560x1440)`, value: '1440p' },
    { label: `4K (3840x2160)`, value: '2160p' }
]);

const fpsOptions = [24, 30, 60];
const bitrateOptions = computed(() => [
    { label: `${t('videoEditor.export.bitrateLow')} (5 Mbps)`, value: 'low' },
    { label: `${t('videoEditor.export.bitrateMedium')} (10 Mbps)`, value: 'medium' },
    { label: `${t('videoEditor.export.bitrateHigh')} (20 Mbps)`, value: 'high' },
    { label: `${t('videoEditor.export.bitrateUltra')} (40 Mbps)`, value: 'ultra' }
]);

const codecOptions = computed(() => [
    { label: `H.264 (${t('videoEditor.export.codecCompatible')})`, value: 'h264' },
    { label: `H.265 (${t('videoEditor.export.codecEfficient')})`, value: 'h265' }
]);

const currentPreset = computed(() => {
    return qualityPresets.value.find(p => p.id === selectedPreset.value);
});

const estimatedFileSize = computed(() => {
    const duration = editor.totalDuration / 1000; // in seconds
    const bitrateMap = { low: 5, medium: 10, high: 20, ultra: 40 };
    const bitrate = bitrateMap[customSettings.value.bitrate as keyof typeof bitrateMap] || 10;
    const sizeInMB = (duration * bitrate) / 8;
    return sizeInMB > 1000 ? `${(sizeInMB / 1024).toFixed(2)} GB` : `${sizeInMB.toFixed(0)} MB`;
});

watch(selectedPreset, (preset) => {
    const presetData = qualityPresets.value.find(p => p.id === preset);
    if (presetData) {
        customSettings.value = { ...customSettings.value, ...presetData.settings };
    }
});

const openDialog = () => {
    showDialog.value = true;
    isExporting.value = false;
    exportProgress.value = 0;
};

const closeDialog = () => {
    if (!isExporting.value) {
        showDialog.value = false;
    }
};

const startExport = async () => {
    isExporting.value = true;
    exportProgress.value = 0;

    try {
        // Simulate export progress (replace with actual export logic)
        const progressInterval = setInterval(() => {
            exportProgress.value += 1;

            // Update estimated time
            const remaining = 100 - exportProgress.value;
            const estimatedSeconds = Math.ceil(remaining * 0.5);
            estimatedTime.value = estimatedSeconds > 60
                ? `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`
                : `${estimatedSeconds}s`;

            if (exportProgress.value >= 100) {
                clearInterval(progressInterval);
                onExportComplete();
            }
        }, 500);

        // TODO: Integrate with actual export system
        // await editor.exportVideo(customSettings.value);

    } catch (error: any) {
        toast.error(error.message || 'Export failed');
        isExporting.value = false;
    }
};

const onExportComplete = () => {
    isExporting.value = false;
    exportedFileSize.value = estimatedFileSize.value;
    toast.success(t('videoEditor.export.successMessage'));

    // Auto-close after 2 seconds
    setTimeout(() => {
        showDialog.value = false;
    }, 2000);
};

const cancelExport = () => {
    if (confirm(t('videoEditor.export.confirmCancel'))) {
        isExporting.value = false;
        exportProgress.value = 0;
        toast.info(t('videoEditor.export.cancelledMessage'));
    }
};

// Expose method to open dialog
defineExpose({
    open: openDialog
});
</script>

<template>
    <el-dialog v-model="showDialog" :width="700" :close-on-click-modal="false" :close-on-press-escape="!isExporting"
        class="export-dialog">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Videocamera theme="filled" size="20" class="text-orange-400" />
                </div>
                <div>
                    <h2 class="text-lg font-black text-white uppercase tracking-wider">{{ t('videoEditor.export.title') }}</h2>
                    <p class="text-[10px] text-white/40 font-bold uppercase">
                        {{ isExporting ? t('videoEditor.export.exportingStatus') : t('videoEditor.export.chooseQuality') }}
                    </p>
                </div>
            </div>
            <button v-if="!isExporting" @click="closeDialog"
                class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <Close size="16" class="text-white/60" />
            </button>
        </div>

        <!-- Export Progress (when exporting) -->
        <div v-if="isExporting" class="space-y-6">
            <!-- Progress Circle -->
            <div class="flex flex-col items-center gap-4">
                <div class="relative w-32 h-32">
                    <svg class="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="4" fill="transparent"
                            class="text-white/10" />
                        <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="4" fill="transparent"
                            class="text-orange-500 transition-all duration-300"
                            :style="{ strokeDasharray: 376.8, strokeDashoffset: 376.8 * (1 - exportProgress / 100) }" />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-3xl font-black text-white">{{ Math.round(exportProgress) }}%</span>
                    </div>
                </div>

                <!-- Frame Preview -->
                <div v-if="currentFrame"
                    class="w-full h-32 rounded-lg bg-black/40 border border-white/10 overflow-hidden">
                    <img :src="currentFrame" class="w-full h-full object-contain" />
                </div>

                <!-- Status Info -->
                <div class="w-full space-y-2">
                    <div class="flex justify-between text-xs">
                        <span class="text-white/60 font-bold uppercase">{{ t('videoEditor.export.timeRemaining') }}</span>
                        <span class="text-orange-400 font-mono">{{ estimatedTime }}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-white/60 font-bold uppercase">{{ t('videoEditor.export.estimatedSize') }}</span>
                        <span class="text-orange-400 font-mono">{{ estimatedFileSize }}</span>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-300"
                        :style="{ width: `${exportProgress}%` }"></div>
                </div>
            </div>

            <!-- Cancel Button -->
            <el-button @click="cancelExport" class="w-full !bg-white/5 !border-white/10 !text-white/60" size="large">
                {{ t('videoEditor.export.cancelExport') }}
            </el-button>
        </div>

        <!-- Quality Presets (when not exporting) -->
        <div v-else class="space-y-6">
            <!-- Preset Selection -->
            <div class="grid grid-cols-2 gap-3">
                <div v-for="preset in qualityPresets" :key="preset.id" @click="selectedPreset = preset.id"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all group" :class="selectedPreset === preset.id
                        ? 'bg-orange-500/10 border-orange-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'">
                    <div class="flex items-start gap-3">
                        <div class="text-2xl">{{ preset.icon }}</div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-black text-white uppercase">{{ preset.name }}</span>
                                <Check v-if="selectedPreset === preset.id" size="14" class="text-orange-400" />
                            </div>
                            <p class="text-[10px] text-white/40 font-medium mb-2">{{ preset.description }}</p>
                            <div class="flex flex-wrap gap-1">
                                <span class="px-2 py-0.5 rounded bg-black/40 text-[9px] text-white/60 font-mono">
                                    {{ preset.settings.resolution }}
                                </span>
                                <span class="px-2 py-0.5 rounded bg-black/40 text-[9px] text-white/60 font-mono">
                                    {{ preset.settings.fps }}fps
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Advanced Settings -->
            <div class="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white/60 uppercase">{{ t('videoEditor.export.advancedSettings') }}</span>
                    <span class="text-[10px] text-orange-400 font-mono">{{ estimatedFileSize }}</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                        <label class="text-[10px] text-white/40 font-bold uppercase">{{ t('videoEditor.export.resolution') }}</label>
                        <el-select v-model="customSettings.resolution" size="small" class="w-full">
                            <el-option v-for="opt in resolutionOptions" :key="opt.value" :label="opt.label"
                                :value="opt.value" />
                        </el-select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] text-white/40 font-bold uppercase">{{ t('videoEditor.export.frameRate') }}</label>
                        <el-select v-model="customSettings.fps" size="small" class="w-full">
                            <el-option v-for="fps in fpsOptions" :key="fps" :label="`${fps} FPS`" :value="fps" />
                        </el-select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] text-white/40 font-bold uppercase">{{ t('videoEditor.export.bitrate') }}</label>
                        <el-select v-model="customSettings.bitrate" size="small" class="w-full">
                            <el-option v-for="opt in bitrateOptions" :key="opt.value" :label="opt.label"
                                :value="opt.value" />
                        </el-select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] text-white/40 font-bold uppercase">{{ t('videoEditor.export.codec') }}</label>
                        <el-select v-model="customSettings.codec" size="small" class="w-full">
                            <el-option v-for="opt in codecOptions" :key="opt.value" :label="opt.label"
                                :value="opt.value" />
                        </el-select>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
                <el-button @click="closeDialog" class="flex-1 !bg-white/5 !border-white/10 !text-white/60" size="large">
                    {{ t('videoEditor.export.cancel') }}
                </el-button>
                <el-button @click="startExport"
                    class="flex-1 !bg-orange-500 !border-orange-500 !text-white hover:!bg-orange-600" size="large">
                    <Download size="16" class="mr-2" />
                    {{ t('videoEditor.export.exportVideo') }}
                </el-button>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.export-dialog :deep(.el-dialog__header) {
    display: none;
}

.export-dialog :deep(.el-dialog__body) {
    padding: 24px;
    background: #0a0a0a;
    border-radius: 16px;
}

.export-dialog :deep(.el-select) {
    width: 100%;
}

.export-dialog :deep(.el-select .el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
}

.export-dialog :deep(.el-select .el-input__inner) {
    color: white;
    font-size: 11px;
    font-weight: 600;
}
</style>
