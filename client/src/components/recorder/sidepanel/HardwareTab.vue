<template>
    <div class="flex flex-col gap-8">
        <!-- Camera Selection -->
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-orange-400 uppercase">Camera Device</span>
                <span class="text-[8px] text-white/20 uppercase tracking-widest">{{ videoDevices.length }} Found</span>
            </div>
            
            <div class="flex flex-col gap-2">
                <div v-for="dev in videoDevices" :key="dev.deviceId"
                    class="device-item p-4 rounded-2xl border transition-all cursor-pointer group"
                    :class="selectedCameraId === dev.deviceId ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/5 border-white/5 hover:border-white/10'"
                    @click="$emit('update:selectedCameraId', dev.deviceId)">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all group-hover:bg-orange-500/20"
                            :class="{ 'text-orange-400': selectedCameraId === dev.deviceId }">
                            <camera size="16" />
                        </div>
                        <div class="flex flex-col overflow-hidden">
                            <span class="text-xs font-bold text-white truncate">{{ dev.label || 'Default Camera' }}</span>
                            <span class="text-[9px] text-white/40 truncate">{{ dev.deviceId.substring(0, 20) }}...</span>
                        </div>
                        <div v-if="selectedCameraId === dev.deviceId" class="ml-auto">
                            <check-one theme="filled" size="14" class="text-orange-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Microphone Selection -->
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-orange-400 uppercase">Microphone Input</span>
                <span class="text-[8px] text-white/20 uppercase tracking-widest">{{ audioDevices.length }} Found</span>
            </div>

            <div class="flex flex-col gap-2 mb-6">
                <div v-for="dev in audioDevices" :key="dev.deviceId"
                    class="device-item p-4 rounded-2xl border transition-all cursor-pointer group"
                    :class="selectedMicId === dev.deviceId ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/5 border-white/5 hover:border-white/10'"
                    @click="$emit('update:selectedMicId', dev.deviceId)">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all group-hover:bg-orange-500/20"
                            :class="{ 'text-orange-400': selectedMicId === dev.deviceId }">
                            <microphone-one size="16" />
                        </div>
                        <div class="flex flex-col overflow-hidden">
                            <span class="text-xs font-bold text-white truncate">{{ dev.label || 'Default Microphone' }}</span>
                            <span class="text-[9px] text-white/40 truncate">{{ dev.deviceId.substring(0, 20) }}...</span>
                        </div>
                        <div v-if="selectedMicId === dev.deviceId" class="ml-auto">
                            <check-one theme="filled" size="14" class="text-orange-500" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gain Control -->
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] text-white/40 font-bold uppercase">Input Gain</span>
                    <span class="text-[10px] text-orange-400 font-mono">{{ (micVolume * 100).toFixed(0) }}%</span>
                </div>
                <el-slider :model-value="micVolume" @update:model-value="v => $emit('update:micVolume', v as number)"
                    :min="0" :max="2" :step="0.01" :show-tooltip="false" size="small" />
                <p class="text-[8px] text-white/20 mt-2 uppercase text-center">Software Pre-amp</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Camera, MicrophoneOne, CheckOne } from '@icon-park/vue-next'
import { ElSlider } from 'element-plus'

defineProps<{
    videoDevices: MediaDeviceInfo[]
    audioDevices: MediaDeviceInfo[]
    selectedCameraId: string | null
    selectedMicId: string | null
    micVolume: number
}>()

defineEmits<{
    (e: 'update:selectedCameraId', id: string): void
    (e: 'update:selectedMicId', id: string): void
    (e: 'update:micVolume', val: number): void
}>()
</script>

<style scoped>
.device-item:hover {
    transform: translateX(4px);
}
</style>
