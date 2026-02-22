<template>
    <div class="flex flex-col gap-6">
        <div class="panel-section space-y-4">
            <span class="text-[10px] font-bold text-blue-400 uppercase block">Live Configuration</span>

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
    </div>
</template>

<script setup lang="ts">
import { ElSwitch } from 'element-plus'

defineProps<{
    streamConfig: { serverUrl: string, streamKey: string, useAntMedia: boolean }
    streamStats?: any
}>()
</script>
