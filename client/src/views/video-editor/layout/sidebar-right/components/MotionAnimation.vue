<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Delete, PlayOne, Time, SettingTwo } from '@icon-park/vue-next';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { formatMediaDuration } from 'video-editor/lib/time';

const canvasStore = useCanvasStore();
const { selectionActive: selected, timeline } = storeToRefs(canvasStore);

const keyframes = computed(() => {
    if (!selected.value) return [];
    return (selected.value as any).anim?.keyframes || [];
});

const sortedKeyframes = computed(() => {
    return [...keyframes.value].sort((a, b) => a.time - b.time);
});

const addKeyframe = () => {
    if (!selected.value || !timeline.value) return;

    const obj = selected.value as any;
    const elementOffset = obj.meta?.offset || obj.offset * 1000 || 0;
    const seekMs = timeline.value.seek * 1000;

    // Calculate relative time (clamped within element duration)
    let relativeTime = seekMs - elementOffset;
    const duration = obj.meta?.duration || obj.timeline * 1000 || 5000;
    relativeTime = Math.max(0, Math.min(relativeTime, duration));

    const newKeyframe = {
        time: Math.round(relativeTime),
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        opacity: obj.opacity,
        easing: 'linear'
    };

    if (!obj.anim) obj.anim = { in: { name: 'none' }, out: { name: 'none' }, scene: { name: 'none' }, keyframes: [] };
    if (!obj.anim.keyframes) obj.anim.keyframes = [];

    // Remove existing keyframe at same time if any
    const existingIndex = obj.anim.keyframes.findIndex((kf: any) => Math.abs(kf.time - newKeyframe.time) < 50);
    if (existingIndex > -1) {
        obj.anim.keyframes.splice(existingIndex, 1);
    }

    obj.anim.keyframes.push(newKeyframe);
    canvasStore.instance.fire('object:modified', { target: obj });
};

const removeKeyframe = (index: number) => {
    if (!selected.value) return;
    const obj = selected.value as any;
    const kfToDelete = sortedKeyframes.value[index];
    const realIndex = obj.anim.keyframes.findIndex((kf: any) => kf.time === kfToDelete.time);
    if (realIndex > -1) {
        obj.anim.keyframes.splice(realIndex, 1);
        canvasStore.instance.fire('object:modified', { target: obj });
    }
};

const clearAll = () => {
    if (!selected.value) return;
    const obj = selected.value as any;
    if (obj.anim) {
        obj.anim.keyframes = [];
        canvasStore.instance.fire('object:modified', { target: obj });
    }
};

const playPreview = () => {
    if (!selected.value) return;
    canvasStore.animations.preview(selected.value as any, 'scene', (selected.value as any).anim);
};

</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Action Header -->
        <div class="flex items-center justify-between px-1">
            <div class="flex flex-col gap-1">
                <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Motion Tracks</h4>
                <span class="text-[9px] text-white/20">Add keyframes to create paths</span>
            </div>
            <div class="flex items-center gap-2">
                <el-tooltip content="Clear All" placement="top">
                    <button @click="clearAll"
                        class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-white/20 hover:text-red-400 transition-all">
                        <Delete :size="14" />
                    </button>
                </el-tooltip>
                <button @click="addKeyframe"
                    class="h-8 px-3 rounded-lg flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary hover:border-brand-primary text-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/10">
                    <Plus :size="14" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">Add Keyframe</span>
                </button>
            </div>
        </div>

        <!-- Keyframe List -->
        <div class="flex flex-col gap-2">
            <div v-if="sortedKeyframes.length === 0"
                class="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-white/5 bg-white/[0.02] opacity-50">
                <Time :size="24" class="text-white/10 mb-2" />
                <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest text-center px-10">No
                    keyframes added yet for this element</span>
            </div>

            <div v-for="(kf, index) in sortedKeyframes" :key="index"
                class="group flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all">
                <div class="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-mono font-bold text-brand-primary">{{ index + 1 }}</span>
                </div>

                <div class="flex-1 flex flex-col gap-0.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-white/80">At {{ formatMediaDuration(kf.time, false)
                            }}</span>
                        <span class="text-[9px] text-white/30 font-mono tracking-tighter uppercase">{{ kf.easing
                            }}</span>
                    </div>
                    <div class="flex items-center gap-2 overflow-hidden">
                        <span class="text-[9px] text-white/20 truncate">X:{{ Math.round(kf.left) }} Y:{{
                            Math.round(kf.top) }} S:{{ kf.scaleX?.toFixed(2) }} R:{{ kf.angle }}°</span>
                    </div>
                </div>

                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="removeKeyframe(index)"
                        class="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20">
                        <Delete :size="12" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Preview -->
        <div v-if="sortedKeyframes.length > 0" class="pt-4 border-t border-white/5">
            <button @click="playPreview"
                class="w-full h-11 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 flex items-center justify-center gap-3 text-white transition-all shadow-xl group/play">
                <div
                    class="w-7 h-7 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary group-hover/play:scale-110 transition-transform">
                    <PlayOne :size="16" theme="filled" />
                </div>
                <span
                    class="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 group-hover/play:text-white transition-colors">Preview
                    Motion</span>
            </button>
        </div>
    </div>
</template>
