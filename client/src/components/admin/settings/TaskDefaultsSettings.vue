<template>
    <div v-if="aiSettings.defaults" class="settings-section cinematic-panel p-6">
        <div class="panel-header mb-6">
            <span class="text-xs font-black uppercase tracking-widest opacity-60">Creative Task Defaults</span>
        </div>
        <div class="cinematic-table-container">
            <div
                class="cinematic-table-header grid grid-cols-12 gap-4 p-4 border-b border-white/5 opacity-30 text-[8px] font-black uppercase">
                <div class="col-span-2">Task Type</div>
                <div class="col-span-4">Default Intelligence Core</div>
                <div class="col-span-4">Neural Model ID</div>
                <div class="col-span-2 text-right">Cost Configuration</div>
            </div>
            <div class="cinematic-table-body">
                <div v-for="type in ['text', 'image', 'video', 'audio', 'music']" :key="type"
                    class="cinematic-row grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/2 transition-all">
                    <div class="col-span-2 capitalize font-bold text-blue-400 text-xs">
                        {{ type }}
                    </div>
                    <div class="col-span-4">
                        <el-select v-if="aiSettings.defaults[type]" v-model="aiSettings.defaults[type].providerId"
                            size="small" class="glass-input w-full" placeholder="Select Provider">
                            <el-option v-for="p in getProvidersForType(type)" :key="p.id" :label="p.name"
                                :value="p.id" />
                        </el-select>
                    </div>
                    <div class="col-span-4">
                        <el-select v-if="aiSettings.defaults[type]" v-model="aiSettings.defaults[type].modelId"
                            filterable allow-create default-first-option size="small" class="glass-input w-full"
                            placeholder="Select or Type Model">
                            <el-option v-for="m in getModelsForProvider(aiSettings.defaults[type].providerId)" :key="m"
                                :label="m" :value="m" />
                        </el-select>
                    </div>
                    <div class="col-span-2 flex flex-col items-end">
                        <el-input-number v-if="aiSettings.defaults[type]" v-model="aiSettings.defaults[type].creditCost"
                            :min="0" size="small" class="glass-input-number" />
                        <span v-if="type === 'video'" class="text-[8px] opacity-40 mt-1 uppercase font-black">(per
                            sec)</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    aiSettings: any;
    getProvidersForType: (type: string) => any[];
    getModelsForProvider: (providerId: string) => string[];
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
