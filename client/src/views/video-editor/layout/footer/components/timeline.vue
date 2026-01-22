<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { debounce } from 'lodash';
import VueDraggable from 'vue-draggable-resizable';
import { Motion, MotionConfig, useDragControls } from "motion-v"

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { formatMediaDuration } from 'video-editor/lib/time';
import { cn } from 'video-editor/lib/utils';

import { useMeasure } from 'video-editor/hooks/use-measure';

import TimelineItem from './TimelineItem.vue';

const SEEK_TIME_WIDTH = 42;
const HANDLE_WIDTH = 16;

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, timeline, animations, elements, selection, audioElements } = storeToRefs(canvasStore);

const [containerRef, dimensions] = useMeasure();
// const canvas = editor.canvas;
watch(canvas, () => {
  console.log("canvas", canvas);
  forceUpdate();
});
watch(audioElements, (value) => {
  console.log("audioElements", audioElements);
  // forceUpdate();
});

const durationInSeconds = computed(() => (timeline.value?.duration ?? 0) / 1000);
const seekTimeInSeconds = computed(() => (timeline.value?.seek ?? 0) / 1000);

const disabled = computed(() => (timeline.value as any)?.playing || (animations.value as any)?.previewing);

const trackWidth = computed(() => durationInSeconds.value * SEEK_TIME_WIDTH);
const trackBackgroundWidth = computed(() => Math.max((dimensions.value as any).width, (durationInSeconds.value + 6) * SEEK_TIME_WIDTH));
const timelineAmount = computed(() => Math.floor(trackBackgroundWidth.value / SEEK_TIME_WIDTH));
// const audioElements = computed(() => editor.value?.canvas?.audio ?? []);

const forceUpdate = () => {
  // seekTimeInSeconds; durationInSeconds; disabled; trackWidth; trackBackgroundWidth; timelineAmount
};

const onSeek = (x: number) => {
  if (disabled.value) return;
  let seek = x / SEEK_TIME_WIDTH;
  // canvas.timeline.setSeek(seek);
  // console.log("seek", seek);
  if (seek > durationInSeconds.value) {
    seek = durationInSeconds.value;
  }
  (timeline.value as any)?.set("seek", seek);
  forceUpdate();
};

const onClickSeekTime = (event: MouseEvent) => {
  if (disabled.value) return;
  const x = event.clientX - (event.currentTarget as HTMLElement).getBoundingClientRect().left;
  onSeek(x);
  // const seek = x / SEEK_TIME_WIDTH;
  // // canvas.timeline.setSeek(seek);
  // canvas.timeline.set("seek", seek);
};

const onDrag = (x: number, y: number) => {
  if (disabled.value) return;
  let seek = x / SEEK_TIME_WIDTH;
  // canvas.timeline.setSeek(seek);
  // console.log("seek", seek);
  if (seek > durationInSeconds.value) {
    return false;
  }
  else if (seek < 0) {
    return false;
  }
  (timeline.value as any)?.set("seek", seek);
  forceUpdate();
};

const controls = useDragControls();

// const onSeekHandleDrag = (x: number) => {
//   if (disabled.value) return;
//   const seek = x / SEEK_TIME_WIDTH;
//   // canvas.timeline.setSeek(seek);
//   canvas.timeline.set("seek", seek);
// };

const onSelectTrack = (event: any, item: any) => {
  console.log("onSelectTrack", selection.value, item);
  if (disabled.value) {
    return
  }

  // selection.value?.selectObjectByName(item.name, event.shiftKey);
  if (item.type == 'audio' || !item.type) {
    (selection.value as any)?.selectAudio(item);
  }
  else {
    (selection.value as any)?.selectObjectByName(item.name, event.shiftKey);
  }
};

// watch([audioElements, elements], (values) => {
//   console.log("Elements", values);
// });

</script>

<template>
  <div
    :class="cn('flex flex-1 shrink select-none', editor.timelineOpen ? 'h-auto' : 'h-0 overflow-hidden appearance-none')">
    <!-- Left Sidebar Area -->
    <div class="bg-[#050505] shrink-0 w-2 border-t border-r border-white/5">
      <div class="h-8 w-full bg-[#050505] border-b border-white/5 flex justify-center items-center"></div>
    </div>

    <!-- Main Timeline Container -->
    <div
      class="flex-1 flex flex-col bg-[#080808] border-t border-white/5 shrink-0 overflow-x-auto custom-scrollbar relative"
      ref="containerRef">
      <!-- Ruler Area Background -->
      <div class="h-8 absolute bg-[#0a0a0a] border-b border-white/5 z-0"
        :style="{ width: `${trackBackgroundWidth}px` }" />

      <!-- Clickable Seek Area -->
      <div class="h-8 absolute cursor-pointer hover:bg-white/5 transition-colors z-30"
        :style="{ width: `${trackWidth}px` }" @click="onClickSeekTime" />

      <!-- Ruler Ticks and Numbers -->
      <div class="h-8 absolute inset-0 flex items-center z-10 pointer-events-none">
        <template v-for="(_, index) in timelineAmount" :key="index">
          <div v-if="index % 5 == 0"
            class="flex flex-col items-start justify-end h-full px-1 border-l border-white/20 select-none group/tick transition-opacity"
            :style="{ width: `${SEEK_TIME_WIDTH}px` }">
            <span
              class="text-[9px] font-mono font-black text-white/40 uppercase tracking-tighter leading-none pb-1 group-hover/tick:text-white transition-colors">{{
              index }}s</span>
            <div
              class="h-1/2 w-px bg-white/20 group-hover/tick:bg-brand-primary group-hover/tick:h-full transition-all" />
          </div>
          <div v-else class="flex flex-col justify-end h-full px-0.5 border-l border-white/5 select-none"
            :style="{ width: `${SEEK_TIME_WIDTH}px` }">
            <div class="h-1/4 w-px bg-white/5" />
          </div>
        </template>
      </div>

      <!-- Playhead (Scrubber) -->
      <VueDraggable axis="x" :x="seekTimeInSeconds * SEEK_TIME_WIDTH" :w="12" :z="999" :resizable="false"
        :onDrag="onDrag" class="!h-full absolute top-0 -ml-[6px] transition-none">
        <div
          :class="cn('h-full w-px relative flex flex-col items-center group/playhead z-50', disabled ? 'cursor-not-allowed' : 'cursor-ew-resize')">
          <!-- Playhead Line with Glow -->
          <div class="absolute inset-y-0 w-px bg-brand-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]" />

          <!-- Playhead Handle -->
          <div
            class="w-2.5 h-2.5 bg-brand-primary rounded-full border border-[#050505] shadow-[0_0_10px_rgba(59,130,246,0.8)] z-50 -mt-1 hover:scale-125 hover:ring-4 hover:ring-brand-primary/20 transition-all duration-300" />

          <!-- Active Playhead Indicator Tooltip (Optional, can be added later) -->
        </div>
      </VueDraggable>

      <!-- Clip Tracks Area -->
      <div class="absolute top-8 py-3 bottom-0 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar bg-[#0a0a0a]/40"
        :style="{ width: `${trackBackgroundWidth}px` }">
        <template v-for="element in [...elements].reverse()" :key="element.name">
          <TimelineItem v-if="(element as any).meta && (element as any).meta.duration" :element="element"
            :track-width="trackWidth" :type="element.type" @click="(event) => onSelectTrack(event, element)" />
        </template>
        <template v-for="element in [...audioElements].reverse()" :key="element.id">
          <TimelineItem :element="element" :track-width="trackWidth" type="audio"
            @click="(event) => onSelectTrack(event, element)" />
        </template>
      </div>
    </div>
  </div>
</template>