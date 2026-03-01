<template>
    <div v-if="aiSettings.defaults" class="settings-section cinematic-panel p-6">
        <div class="panel-header mb-6">
            <span class="text-xs font-black uppercase tracking-widest opacity-60">{{ $t('admin.settings.taskDefaults.title') }}</span>
        </div>
        <div class="cinematic-table-container">
            <div
                class="cinematic-table-header grid grid-cols-12 gap-4 p-4 border-b border-white/5 opacity-30 text-[8px] font-black uppercase">
                <div class="col-span-2">{{ $t('admin.settings.taskDefaults.table.taskType') }}</div>
                <div class="col-span-4">{{ $t('admin.settings.taskDefaults.table.defaultCore') }}</div>
                <div class="col-span-4">{{ $t('admin.settings.taskDefaults.table.neuralModelId') }}</div>
                <div class="col-span-2 text-right">{{ $t('admin.settings.taskDefaults.table.costConfig') }}</div>
            </div>
            <div class="cinematic-table-body">
                <div v-for="type in ['text', 'image', 'video', 'audio', 'music']" :key="type"
                    class="cinematic-row grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/2 transition-all">
                    <div class="col-span-2 capitalize font-bold text-blue-400 text-xs">
                        {{ $t(`admin.settings.ai.capabilities.${type}`) }}
                    </div>
                    <div class="col-span-4">
                        <el-select v-if="aiSettings.defaults[type]" v-model="aiSettings.defaults[type].providerId"
                            size="small" class="glass-input w-full" :placeholder="t('admin.settings.taskDefaults.selectProvider')">
                            <el-option v-for="p in getProvidersForType(type)" :key="p.id" :label="p.name"
                                :value="p.id" />
                        </el-select>
                    </div>
                    <div class="col-span-4">
                        <el-select v-if="aiSettings.defaults[type]" v-model="aiSettings.defaults[type].modelId"
                            filterable allow-create default-first-option size="small" class="glass-input w-full"
                            :placeholder="t('admin.settings.taskDefaults.selectModel')">
                            <el-option v-for="m in getModelsForProvider(aiSettings.defaults[type].providerId, type)" :key="m"
                                :label="m" :value="m" />
                        </el-select>
                    </div>
                    <div class="col-span-2 flex flex-col items-end">
                        <el-input-number v-if="aiSettings.defaults[type]" v-model="aiSettings.defaults[type].creditCost"
                            :min="0" size="small" class="glass-input-number" />
                        <span v-if="type === 'video'" class="text-[8px] opacity-40 mt-1 uppercase font-black">{{ $t('admin.settings.taskDefaults.perSec') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
    aiSettings: any;
    getProvidersForType: (type: string) => any[];
    getModelsForProvider: (providerId: string, type: string) => string[];
}>();
</script>

<style scoped lang="scss">
.cinematic-panel {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 32px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

:deep(.glass-input-number) {
    .el-input__wrapper {
        background: rgba(255, 255, 255, 0.03) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
}
</style>
