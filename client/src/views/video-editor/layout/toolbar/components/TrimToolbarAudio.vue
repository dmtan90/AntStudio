<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { Check, Left as ChevronLeft, Right as ChevronRight, Play } from '@icon-park/vue-next';
import { floor } from 'lodash';
import VueDraggable from 'vue-draggable-resizable'

import { ElButton, ElInput } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { cn } from 'video-editor/lib/utils';
import { useMeasure } from 'video-editor/hooks/use-measure';
import { drawWaveformFromAudioBuffer } from 'video-editor/lib/media';

const editor = useEditorStore();
const audio = computed(() => editor.canvas.trimmer.active!.object);

const [containerRef, dimensions] = useMeasure();
const containerWidth = computed(() => dimensions.value.width - 16); // handleWidth

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

watch(dimensions, (newDimensions) => {
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
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden pr-12">
    <div class="flex items-center gap-2">
      <el-button type="primary" text bg circle>
        <Play :size="15" class="" fill="#000000" />
      </el-button>
      <div class="relative">
        <el-input class="h-8 text-xs w-24 pr-8" :model-value="floor(absoluteDuration, 1)" readonly />
        <span class="absolute text-gray-500 text-xs right-2.5 top-1/2 -translate-y-1/2 font-medium">s</span>
      </div>
    </div>
    <div ref="containerRef" class="mx-6 flex-1 h-8 overflow-hidden relative rounded-md">
      <div :class="cn('bg-background items-stretch bg-repeat-x bg-center shrink-0 h-full w-full')" :style="style" />
      <div class="absolute inset-0 bg-black/40" />
      <div class="absolute h-full top-0 flex" :style="{width: `${containerWidth}px`}">
        <VueDraggable
          axis="x"
          :x="trim"
          :y="0"
          :w="handleWidth"
          :h="32"
          :parent="true"
          :z="999"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => trim = x">
          <button class="absolute grid place-items-center h-full bg-primary rounded-l-md z-20" :style="{ width: `${handleWidth}px` }">
            <ChevronLeft :size="14" :stroke-width="2.5" stroke="#ffffff" />
          </button>
        </VueDraggable>
        <div class="h-full absolute border-t-2 border-b-2 border-primary mix-blend-overlay bg-gray-300 z-10" :style="{ left: `${trim + handleWidth}px`, width: `${trackWidth}px` }" />
        <VueDraggable
          axis="x"
          :x="timeline"
          :y="0"
          :w="handleWidth"
          :h="32"
          :parent="true"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => timeline = x">
          <button class="absolute grid place-items-center h-full bg-primary rounded-r-md z-20" :style="{ width: `${handleWidth}px` }">
            <ChevronRight :size="14" :stroke-width="2.5" stroke="#ffffff" />
          </button>
        </VueDraggable>
      </div>
    </div>
    <el-button type="primary" text bg round class="gap-1.5 pl-2.5 hover:bg-primary/90" @click="handleChanges">
      <Check :size="15" />
      <span>Done</span>
    </el-button>
  </div>
</template>