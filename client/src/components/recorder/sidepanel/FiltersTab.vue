<template>
    <div class="flex flex-col gap-8">
        <div class="panel-section">
            <span class="text-[10px] font-bold text-white/30 uppercase mb-4 block">Color Grade</span>
            <div class="grid grid-cols-2 gap-3">
                <button v-for="filter in videoFilters" :key="filter.id"
                    class="filter-card flex flex-col gap-2 p-2 rounded-xl border transition-all"
                    :class="appliedFilter === filter.id ? 'bg-blue-600 border-blue-400 shadow-[0_8px_25px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/5 hover:border-white/10'"
                    @click="$emit('update:appliedFilter', filter.id)">
                    <div class="aspect-video rounded-lg bg-gray-900 overflow-hidden relative">
                        <div class="absolute inset-0 bg-cover bg-center transition-transform hover:scale-110"
                            :style="{ filter: filter.css, backgroundImage: `url(${filter.thumb})` }">
                        </div>
                    </div>
                    <span class="text-[9px] font-bold text-center uppercase truncate">{{ filter.name }}</span>
                </button>
            </div>
        </div>

        <div v-if="mode === 'camera-screen'" class="panel-section">
            <span class="text-[10px] font-bold text-white/30 uppercase mb-4 block">Camera Frame</span>
            <div class="grid grid-cols-2 gap-2 mb-4">
                <button v-for="shape in ['circle', 'rect', 'square', 'round-rect']" :key="shape"
                    class="p-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    :class="{ 'border-blue-500 text-blue-400 bg-blue-500/10': camSettings.shape === shape }"
                    @click="camSettings.shape = shape">
                    {{ shape.replace('-', ' ') }}
                </button>
            </div>

            <div class="space-y-4">
                <div class="control-item">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[9px] text-white/40 font-bold uppercase">Size</span>
                        <span class="text-[9px] text-blue-400 font-mono">{{ camSettings.size }}%</span>
                    </div>
                    <el-slider v-model="camSettings.size" :min="10" :max="100" :show-tooltip="false" size="small" />
                </div>

                <div class="control-item">
                    <span class="text-[9px] text-white/40 font-bold uppercase block mb-2">Position</span>
                    <div class="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg w-32">
                        <button
                            v-for="pos in ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right']"
                            :key="pos" class="aspect-square w-full rounded-sm border border-transparent transition-all"
                            :class="camSettings.position === pos ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'"
                            @click="camSettings.position = pos" :title="pos">
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ElSlider } from 'element-plus'

defineProps<{
    videoFilters: any[]
    appliedFilter: string
    mode: string
    camSettings: any
}>()

defineEmits<{
    (e: 'update:appliedFilter', filterId: string): void
}>()
</script>
