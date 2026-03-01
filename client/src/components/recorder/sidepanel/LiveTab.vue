<template>
    <div class="flex flex-col gap-6">
        <!-- Platform Selection -->
        <div class="panel-section space-y-4">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-blue-400 uppercase">Destinations</span>
                <button @click="$emit('update:show-platform-selector', true)" class="text-[9px] font-black text-white/40 hover:text-blue-400 uppercase tracking-widest transition-all">
                    Manage
                </button>
            </div>

            <div class="flex flex-wrap gap-2">
                <div v-for="acc in availableAccounts" :key="acc._id"
                     @click="$emit('toggle-platform', acc._id)"
                     class="platform-tag flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 cursor-pointer transition-all"
                     :class="[{ 'active': selectedPlatforms.includes(acc._id) }]">
                    <youtube v-if="acc.platform === 'youtube'" theme="filled" class="text-[10px]" :class="selectedPlatforms.includes(acc._id) ? 'text-red-500' : 'text-white/40'" />
                    <facebook v-else-if="acc.platform === 'facebook'" theme="filled" class="text-[10px]" :class="selectedPlatforms.includes(acc._id) ? 'text-blue-500' : 'text-white/40'" />
                    <tiktok v-else-if="acc.platform === 'tiktok'" theme="filled" class="text-[10px]" :class="selectedPlatforms.includes(acc._id) ? 'text-white' : 'text-white/40'" />
                    <broadcast v-else theme="filled" class="text-[10px]" :class="selectedPlatforms.includes(acc._id) ? 'text-blue-400' : 'text-white/40'" />
                    <span class="text-[9px] font-bold uppercase tracking-wider" :class="selectedPlatforms.includes(acc._id) ? 'text-white' : 'text-white/40'">
                        {{ acc.accountName }}
                    </span>
                </div>
            </div>
        </div>

        <div class="panel-section space-y-4">
            <span class="text-[10px] font-bold text-blue-400 uppercase block">RTMP / Custom Configuration</span>

            <div class="toggle-card flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                <span class="text-xs font-bold text-white">Use Ant Media</span>
                <el-switch v-model="streamConfig.useAntMedia" size="small" />
            </div>

            <div class="control-item">
                <span class="text-[9px] text-white/40 font-bold uppercase block mb-2">Server URL</span>
                <input v-model="streamConfig.serverUrl"
                    class="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-blue-500/50 transition-all outline-none" />
            </div>

            <div class="control-item">
                <span class="text-[9px] text-white/40 font-bold uppercase block mb-2">Stream Key</span>
                <input v-model="streamConfig.streamKey"
                    class="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:border-blue-500/50 transition-all outline-none" />
            </div>
        </div>

        <div v-if="streamStats"
            class="panel-section bg-gradient-to-br from-blue-500/10 to-transparent p-4 rounded-2xl border border-blue-500/10">
            <span class="text-[10px] font-bold text-blue-400 uppercase mb-4 block">Stream Health</span>
            <div class="grid grid-cols-2 gap-4">
                <div class="stat-card">
                    <span class="text-[8px] text-white/40 uppercase block">Bitrate</span>
                    <span class="text-xs font-mono text-white/90">{{ streamStats.bitrate }} kbps</span>
                </div>
                <div class="stat-card">
                    <span class="text-[8px] text-white/40 uppercase block">FPS</span>
                    <span class="text-xs font-mono text-white/90">{{ streamStats.fps }}</span>
                </div>
                <div class="stat-card">
                    <span class="text-[8px] text-white/40 uppercase block">RTT</span>
                    <span class="text-xs font-mono text-white/90">{{ streamStats.rtt }}ms</span>
                </div>
            </div>
        </div>

        <PlatformSelector :model-value="showPlatformSelector" @update:model-value="$emit('update:show-platform-selector', $event)" :available-accounts="availableAccounts" :selected-platforms="selectedPlatforms" @toggle-platform="$emit('toggle-platform', $event)" />
    </div>
</template>

<script setup lang="ts">
import { ElSwitch } from 'element-plus'
import { Youtube, Facebook, Tiktok, Broadcast } from '@icon-park/vue-next'
import PlatformSelector from '@/components/studio/modals/PlatformSelector.vue'

defineProps<{
    streamConfig: { serverUrl: string, streamKey: string, useAntMedia: boolean }
    streamStats?: any
    selectedPlatforms: string[]
    availableAccounts: any[]
    showPlatformSelector?: boolean
}>()

defineEmits(['toggle-platform', 'update:show-platform-selector'])
</script>

<style scoped lang="postcss">
.platform-tag.active {
    @apply border-blue-500/30 bg-blue-500/10;
}
.stat-card {
    @apply flex flex-col gap-1;
}
</style>
