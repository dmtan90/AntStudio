<template>
    <div class="flex flex-col gap-8">
        <!-- Microphone Section (Re-located for consistency) -->
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-blue-400 uppercase">Microphone Gain</span>
                <span class="text-[10px] text-blue-400 font-mono">{{ (micVolume * 100).toFixed(0) }}%</span>
            </div>
            
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <el-slider :model-value="micVolume" @update:model-value="v => $emit('update:micVolume', v as number)"
                    :min="0" :max="2" :step="0.01" :show-tooltip="false" size="small" />
                <p class="text-[8px] text-white/20 mt-2 uppercase text-center">Software Pre-amp</p>
            </div>
        </div>

        <!-- Background Music -->
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-blue-400 uppercase">Background Music</span>
                <div class="flex items-center gap-2">
                    <button @click="$emit('toggle-bgm')" 
                        class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all"
                        :class="bgmUrl ? 'text-blue-400 bg-blue-400/10 border border-blue-500/20' : 'text-white/40 border border-white/5'">
                        <play v-if="!bgmUrl" size="14" />
                        <pause v-else size="14" />
                    </button>
                </div>
            </div>

            <!-- Volume Control -->
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md mb-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] text-white/40 font-bold uppercase">BGM Volume</span>
                    <span class="text-[10px] text-blue-400 font-mono">{{ (bgmVolume * 100).toFixed(0) }}%</span>
                </div>
                <el-slider :model-value="bgmVolume" @update:model-value="v => $emit('update:bgmVolume', v as number)"
                    :min="0" :max="1" :step="0.01" :show-tooltip="false" size="small" />
            </div>

            <!-- Library -->
            <div class="flex flex-col gap-2">
                <div v-for="track in bgmLibrary" :key="track.id"
                    class="track-item p-4 rounded-2xl border transition-all cursor-pointer group"
                    :class="bgmUrl === track.url ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/5 hover:border-white/10'"
                    @click="$emit('update:bgmUrl', track.url === bgmUrl ? null : track.url)">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all group-hover:bg-blue-500/20"
                            :class="{ 'text-blue-400': bgmUrl === track.url }">
                            <music size="16" />
                        </div>
                        <div class="flex flex-col overflow-hidden">
                            <span class="text-xs font-bold text-white truncate">{{ track.name }}</span>
                            <span class="text-[9px] text-white/40 uppercase tracking-widest font-mono">BGM Track</span>
                        </div>
                        <div v-if="bgmUrl === track.url" class="ml-auto">
                            <check-one theme="filled" size="14" class="text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Audio Ducking -->
        <div class="panel-section border-t border-white/5 pt-6">
            <div class="toggle-card flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-white/90">Auto Ducking</span>
                    <span class="text-[9px] text-white/40">Lower music automatically while speaking</span>
                </div>
                <el-switch :model-value="isDuckingEnabled"
                    @update:model-value="v => $emit('update:isDuckingEnabled', !!v)"
                    size="small" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Play, Pause, Music, CheckOne } from '@icon-park/vue-next'
import { ElSlider, ElSwitch } from 'element-plus'

defineProps<{
    micVolume: number
    bgmVolume: number
    isDuckingEnabled: boolean
    bgmUrl: string | null
    bgmLibrary: Array<{ id: string; name: string; url: string }>
}>()

defineEmits<{
    (e: 'update:micVolume', val: number): void
    (e: 'update:bgmVolume', val: number): void
    (e: 'update:isDuckingEnabled', val: boolean): void
    (e: 'update:bgmUrl', val: string | null): void
    (e: 'toggle-bgm'): void
}>()
</script>

<style scoped>
.track-item:hover {
    transform: translateX(4px);
}
.toggle-card {
    transition: all 0.3s ease;
}
</style>
