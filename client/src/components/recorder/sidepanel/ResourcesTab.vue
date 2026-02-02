<template>
    <div class="flex flex-col gap-4">
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-white/30 uppercase">Resource Pool</span>
                <button @click="$emit('trigger-resource-upload')"
                    class="text-orange-400 hover:text-orange-300 transition-colors">
                    <file-addition size="16" />
                </button>
            </div>

            <div v-if="resourcePool.length === 0"
                class="upload-zone aspect-video border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-orange-500/30 group"
                @click="$emit('trigger-resource-upload')">
                <div
                    class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500/10">
                    <file-addition size="20" class="text-white/20 group-hover:text-orange-400" />
                </div>
                <span class="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Add Overlay</span>
            </div>

            <div v-else class="grid grid-cols-1 gap-2">
                <div v-for="res in resourcePool" :key="res.id"
                    class="resource-item p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between group">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                            <img v-if="res.type === 'image'" :src="res.element.src"
                                class="w-full h-full object-cover" />
                            <video v-else :src="res.element.src" class="w-full h-full object-cover"></video>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[9px] font-bold text-white truncate w-24">{{ res.name || 'Resource'
                                }}</span>
                            <span class="text-[7px] text-white/20 uppercase">{{ res.type }}</span>
                        </div>
                    </div>
                    <el-switch :model-value="activeOverlays.includes(res.id)" @click="$emit('toggle-overlay', res.id)"
                        size="small" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FileAddition } from '@icon-park/vue-next'
import { ElSwitch } from 'element-plus'

defineProps<{
    resourcePool: any[]
    activeOverlays: string[]
}>()

defineEmits<{
    (e: 'trigger-resource-upload'): void
    (e: 'toggle-overlay', id: string): void
}>()
</script>
