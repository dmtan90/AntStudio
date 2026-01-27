<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { Check, Left as ChevronLeft, Right as ChevronRight, Play } from '@icon-park/vue-next';
import { floor } from 'lodash';
import VueDraggable from 'vue-draggable-resizable'

import { ElButton, ElInput } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { cn } from '@/utils/ui';
import { useMeasure } from 'video-editor/hooks/use-measure';
import { drawWaveformFromAudioBuffer } from 'video-editor/lib/media';

const editor = useEditorStore();
const audio = computed(() => editor.canvas.trimmer.active!.object);

const [containerRef, dimensions] = useMeasure();
const containerWidth = computed(() => (dimensions.value as any).width - 16); // handleWidth

const background = ref("");
const trim = ref(0);
const timeline = ref(0);

const handleWidth = 16;

watch(containerWidth, (newWidth) => {
  console.log("containerWidth", newWidth);
  if (newWidth <= 0) return;
  const newTrim = (newWidth / audio.value.duration) * audio.value.trim;
  const newTimeline = (newWidth / audio.value.duration) * audio.value.timeline + newTrim;
  trim.value = newTrim;
  timeline.value = newTimeline;
  console.log("trim", trim, timeline);
}, { immediate: true });

watch(dimensions, (newDimensions: any) => {
  if (!newDimensions.width) return;
  drawWaveformFromAudioBuffer(audio.value.buffer, 40, newDimensions.width, undefined, undefined).then((blob) => background.value = URL.createObjectURL(blob));
}, { immediate: true });

onUnmounted(() => {
  URL.revokeObjectURL(background.value);
});

const handleChanges = () => {
  const _trim = (trim.value / containerWidth.value) * audio.value.duration;
  const _timeline = ((containerWidth.value - timeline.value) / containerWidth.value) * audio.value.duration;
  editor.canvas.audio.update(audio.value.id, { trim: _trim, timeline: audio.value.duration - _trim - _timeline });
  editor.canvas.trimmer.exit();
};

const absoluteDuration = computed(() => audio.value.duration - (trim.value / containerWidth.value) * audio.value.duration - ((containerWidth.value - timeline.value) / containerWidth.value) * audio.value.duration);
const trackWidth = computed(() => containerWidth.value - trim.value - (containerWidth.value - timeline.value) - handleWidth);
const style = computed(() => ({
  backgroundImage: `url(${background.value})`,
}));

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap pr-2 gap-6 px-1 py-1">
    <div class="flex items-center gap-3">
      <button class="h-9 w-9 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all duration-300 active:scale-90 shadow-sm">
        <Play :size="16" class="ml-0.5" fill="currentColor" />
      </button>
      <div class="relative bg-white/5 rounded-xl border border-white/5 h-9 flex items-center px-2 group transition-all duration-300 hover:border-white/10 hover:bg-white/10">
        <el-input class="h-full text-[11px] font-bold w-20 cinematic-input-ghost" :model-value="floor(absoluteDuration, 1)" readonly />
        <span class="text-white/30 text-[9px] font-black uppercase tracking-widest mr-1">s</span>
      </div>
    </div>
    
    <div ref="containerRef" class="flex-1 h-10 overflow-hidden relative rounded-xl border border-white/10 bg-[#0a0a0a]/60 group/track transition-all duration-300 hover:border-white/20">
      <div :class="cn('bg-background items-stretch bg-repeat-x bg-center shrink-0 h-full w-full opacity-30 group-hover/track:opacity-50 transition-opacity')" :style="style" />
      <div class="absolute inset-0 bg-transparent" />
      <div class="absolute h-full top-0 flex" :style="{width: `${containerWidth}px`}">
        <VueDraggable
          axis="x"
          :x="trim"
          :y="0"
          :w="handleWidth"
          :h="40"
          :parent="true"
          :z="999"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => trim = x">
          <button class="absolute grid place-items-center h-full bg-brand-primary rounded-l-lg z-20 cursor-ew-resize group/handle shadow-lg" :style="{ width: `${handleWidth}px` }">
            <ChevronLeft :size="12" class="text-white group-hover/handle:scale-125 transition-transform" :stroke-width="4" stroke="#ffffff" />
          </button>
        </VueDraggable>
        <div class="h-full absolute border-y-2 border-brand-primary mix-blend-screen bg-brand-primary/10 z-10 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]" :style="{ left: `${trim + handleWidth}px`, width: `${trackWidth}px` }" />
        <VueDraggable
          axis="x"
          :x="timeline"
          :y="0"
          :w="handleWidth"
          :h="40"
          :parent="true"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => timeline = x">
          <button class="absolute grid place-items-center h-full bg-brand-primary rounded-r-lg z-20 cursor-ew-resize group/handle shadow-lg" :style="{ width: `${handleWidth}px` }">
            <ChevronRight :size="12" class="text-white group-hover/handle:scale-125 transition-transform" :stroke-width="4" stroke="#ffffff" />
          </button>
        </VueDraggable>
      </div>
    </div>

    <button 
        class="flex items-center gap-2.5 h-9 px-6 rounded-xl bg-brand-primary text-white transition-all duration-300 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/90 hover:scale-[1.02] active:scale-95" 
        @click="handleChanges"
    >
      <Check :size="16" :stroke-width="4" />
      <span>Done</span>
    </button>
  </div>
</template>

<style scoped>
.cinematic-input-ghost :deep(.el-input__wrapper) {
  background-color: transparent !important;
  box-shadow: none !important;
  padding: 0 4px;
}
.cinematic-input-ghost :deep(.el-input__inner) {
  color: white;
  font-family: inherit;
  font-weight: 800;
  font-size: 11px;
  text-align: right;
  padding-right: 4px;
}
</style>