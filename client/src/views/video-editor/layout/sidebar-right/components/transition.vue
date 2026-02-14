<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Close as X, Down as ChevronDown, Time, Movie, Magic, Effects, Composition } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import Label from 'video-editor/components/ui/label.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas } = storeToRefs(canvasStore);

const transitionOptions = [
    { id: 'none', label: 'None', icon: Movie },
    { id: 'fade', label: 'Cross Fade', icon: Magic },
    { id: 'blur', label: 'Blur Dissolve', icon: Effects },
    { id: 'glitch', label: 'Digital Glitch', icon: Composition },
    { id: 'light-leak', label: 'Light Leak', icon: Magic },
    { id: 'morph', label: 'Liquid Morph', icon: Magic },
    { id: 'zoom-blur', label: 'Zoom Blur', icon: Effects },
    { id: 'wipe', label: 'Classic Wipe', icon: ChevronDown, hasDirection: true },
    { id: 'slide', label: 'Slide Push', icon: ChevronDown, hasDirection: true },
    { id: 'cube', label: '3D Cube', icon: Effects, hasDirection: true },
    { id: 'flip', label: '3D Flip', icon: Effects, hasDirection: true },
    { id: 'circle', label: 'Iris Circle', icon: ChevronDown },
];

const directions = [
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
    { id: 'up', label: 'Up' },
    { id: 'down', label: 'Down' },
];

const activeDirection = computed({
    get: () => (canvas.value as any)?.transitionDirection || 'left',
    set: (val) => {
        if (canvas.value) {
            (canvas.value as any).transitionDirection = val;
            editor.onModified?.();
        }
    }
});

const currentTransition = computed(() => transitionOptions.find(o => o.id === activeTransition.value));

const activeTransition = computed({
    get: () => canvas.value?.transition || 'none',
    set: (val) => {
        if (canvas.value) {
            canvas.value.transition = val;
            editor.onModified?.();
        }
    }
});

const transitionDuration = computed({
    get: () => (canvas.value?.transitionDuration || 1000) / 1000,
    set: (val) => {
        if (canvas.value) {
            canvas.value.transitionDuration = val * 1000;
            editor.onModified?.();
        }
    }
});

const selectTransition = (id: string) => {
    activeTransition.value = id as any;
};
</script>

<template>
    <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
        <!-- Header -->
        <div
            class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group">
            <div
                class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            </div>
            <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Transitions</h2>
            <button
                class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10"
                @click="editor.setActiveSidebarRight(null)">
                <X :size="14" />
            </button>
        </div>

        <section class="flex-1 overflow-y-auto custom-scrollbar relative">
            <div class="p-5 flex flex-col gap-8 pb-20">
                <!-- Settings -->
                <div class="flex flex-col gap-6 p-5 rounded-2xl bg-white/2 border border-white/5 shadow-inner">
                    <div class="flex flex-col gap-3">
                        <div class="flex justify-between items-center mb-1">
                            <Label
                                class="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                                <Time :size="12" /> Duration
                            </Label>
                            <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{
                                transitionDuration.toFixed(1) }}s</span>
                        </div>
                        <SliderInput :model-value="transitionDuration" :min="0.1" :max="3" :step="0.1"
                            @update:model-value="(val) => transitionDuration = val" />
                    </div>

                    <!-- Direction Switcher -->
                    <div v-if="currentTransition?.hasDirection"
                        class="flex flex-col gap-3 pt-4 border-t border-white/5">
                        <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Direction</Label>
                        <div class="grid grid-cols-4 gap-2">
                            <button v-for="dir in directions" :key="dir.id" @click="activeDirection = dir.id"
                                class="py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all"
                                :class="[
                                    activeDirection === dir.id
                                        ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary shadow-lg shadow-brand-primary/10'
                                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'
                                ]">
                                {{ dir.label }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Grid -->
                <div class="flex flex-col gap-4">
                    <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Transition Presets</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <button v-for="opt in transitionOptions" :key="opt.id" @click="selectTransition(opt.id)"
                            class="group relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 overflow-hidden"
                            :class="[
                                activeTransition === opt.id
                                    ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/8 hover:border-white/10 hover:text-white/70'
                            ]">
                            <!-- Selected Glow -->
                            <div v-if="activeTransition === opt.id"
                                class="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent"></div>

                            <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                                :class="activeTransition === opt.id ? 'bg-brand-primary/20 scale-110 shadow-lg' : 'bg-black/20 group-hover:scale-105'">
                                <component :is="opt.icon" :size="20" />
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-widest text-center">{{ opt.label
                            }}</span>

                            <!-- Checkmark for selected -->
                            <div v-if="activeTransition === opt.id"
                                class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]">
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Bottom mask -->
            <div
                class="fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none opacity-80">
            </div>
        </section> section
    </div>
</template>

<style scoped>
.cinematic-panel {
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
}
</style>
