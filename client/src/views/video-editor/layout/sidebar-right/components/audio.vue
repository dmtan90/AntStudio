<script setup lang="ts">
import { computed } from 'vue';
import { VolumeUp, VolumeMute, Close as X, PreviewOpen as Eye, PreviewCloseOne as EyeOff } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn } from '@/utils/ui';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const disabled = computed(() => !selected.value || selected.value.visible === false);

const volume = computed({
    get: () => (selected.value?.volume ?? 1) * 100,
    set: (val: number) => {
        canvas.value.onChangeAudioProperties(selected.value, { volume: val / 100 });
    }
});

const fadeIn = computed({
    get: () => selected.value?.fadeIn ?? 0,
    set: (val: number) => {
        canvas.value.onChangeAudioProperties(selected.value, { fadeIn: val });
    }
});

const fadeOut = computed({
    get: () => selected.value?.fadeOut ?? 0,
    set: (val: number) => {
        canvas.value.onChangeAudioProperties(selected.value, { fadeOut: val });
    }
});

const isMuted = computed({
    get: () => selected.value?.muted ?? false,
    set: (val: boolean) => {
        canvas.value.onChangeAudioProperties(selected.value, { muted: val });
    }
});

</script>

<template>
    <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
        <!-- Header -->
        <div
            class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header">
            <div
                class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700">
            </div>
            <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Audio</h2>
            <div class="flex items-center gap-2 relative z-10">
                <button @click="canvas.onChangeAudioProperties(selected, { visible: !selected.visible })"
                    :title="selected?.visible === false ? 'Show Layer' : 'Hide Layer'"
                    class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300">
                    <EyeOff v-if="selected?.visible === false" :size="14" />
                    <Eye v-else :size="14" />
                </button>
                <button @click="editor.setActiveSidebarRight(null)"
                    class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300">
                    <X :size="14" />
                </button>
            </div>
        </div>

        <!-- Content -->
        <section
            :class="cn('flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20 transition-all duration-500', disabled ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100 pointer-events-auto')">

            <div class="flex flex-col gap-8">
                <!-- Volume Section -->
                <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/2 border border-white/5">
                    <div class="flex items-center justify-between">
                        <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Volume</h4>
                        <button @click="isMuted = !isMuted"
                            class="text-white/40 hover:text-brand-primary transition-colors">
                            <VolumeMute v-if="isMuted" :size="14" />
                            <VolumeUp v-else :size="14" />
                        </button>
                    </div>

                    <div class="flex items-center gap-4">
                        <el-slider v-model="volume" :min="0" :max="200" :step="1" size="small"
                            class="flex-1 cinematic-slider" />
                        <span class="text-[10px] font-mono text-white/60 w-8 text-right">{{ Math.round(volume)
                            }}%</span>
                    </div>
                </div>

                <!-- Fades Section -->
                <div class="grid grid-cols-1 gap-6">
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                            <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Fade In</h4>
                            <span class="text-[10px] font-mono text-white/60">{{ fadeIn.toFixed(1) }}s</span>
                        </div>
                        <el-slider v-model="fadeIn" :min="0" :max="10" :step="0.1" size="small"
                            class="cinematic-slider" />
                    </div>

                    <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                            <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Fade Out</h4>
                            <span class="text-[10px] font-mono text-white/60">{{ fadeOut.toFixed(1) }}s</span>
                        </div>
                        <el-slider v-model="fadeOut" :min="0" :max="10" :step="0.1" size="small"
                            class="cinematic-slider" />
                    </div>
                </div>

                <!-- Info Section -->
                <div class="mt-4 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
                    <div class="flex flex-col gap-1">
                        <span
                            class="text-[9px] font-black text-brand-primary uppercase tracking-tighter opacity-60">Clip
                            Name</span>
                        <span class="text-[11px] font-medium text-white/80 truncate">{{ selected?.name }}</span>
                    </div>
                </div>
            </div>

        </section>
    </div>
</template>

<style scoped>
.cinematic-slider :deep(.el-slider__runway) {
    background-color: rgba(255, 255, 255, 0.05);
    height: 4px;
}

.cinematic-slider :deep(.el-slider__bar) {
    background: linear-gradient(90deg, #6A24FF, #9D68FF);
    height: 4px;
}

.cinematic-slider :deep(.el-slider__button) {
    width: 12px;
    height: 12px;
    border: 2px solid #6A24FF;
    background-color: #000;
    transition: all 0.3s;
}

.cinematic-slider :deep(.el-slider__button:hover) {
    transform: scale(1.2);
    box-shadow: 0 0 10px rgba(106, 36, 255, 0.5);
}
</style>
