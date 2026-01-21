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

import TimelineElementItem from './TimelineElementItem.vue';
import TimelineAudioItem from './TimelineAudioItem.vue';
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
  <div :class="cn('flex flex-1 shrink select-none', editor.timelineOpen ? 'h-auto' : 'h-0 overflow-hidden appearance-none')">
    <div class="bg-background shrink-0 w-2">
      <div class="h-8 w-full bg-card/40 dark:bg-gray-900/40 flex justify-center items-center"></div>
    </div>
    <div class="flex-1 flex flex-col bg-background shrink-0 overflow-x-scroll scrollbar-hidden relative" ref="containerRef">
      <div class="h-8 absolute bg-card/40 dark:bg-gray-900/40" :style="{ width: `${trackBackgroundWidth}px` }" />
      <div class="h-8 absolute bg-card dark:bg-gray-900 cursor-pointer" :style="{ width: `${trackWidth}px` }" @click="onClickSeekTime" />
      <div class="h-8 absolute inset-0 flex items-center z-20 pointer-events-none">
        <template v-for="(_, index) in timelineAmount" :key="index">
          <span v-if="index == 0 || index % 5 == 0" key="index" class="text-xxs shrink-0 cursor-pointer" :style="{ width: `${SEEK_TIME_WIDTH}px` }">
            {{ index }}s
          </span>
          <span v-else key={index} class="text-xxs shrink-0 cursor-pointer text-gray-400" :style="{ width: `${SEEK_TIME_WIDTH}px` }">
            •
          </span>
        </template>
      </div>
      <VueDraggable
        axis="x"
        :x="seekTimeInSeconds * SEEK_TIME_WIDTH"
        :w="1"
        :z="999"
        :resizable="false"
        :onDrag="onDrag"
        class="!h-full absolute top-0"
      >
        <div :class="cn('h-full w-1 bg-blue-400 dark:bg-primary z-20', disabled ? 'cursor-not-allowed' : 'cursor-ew-resize')" />
      </VueDraggable>
      <div class="absolute top-8 py-2.5 bottom-0 overflow-y-scroll scrollbar-hidden flex flex-col gap-1" :style="{ width: `${trackBackgroundWidth}px` }">
        <!--<TimelineElementItem v-for="element in [...elements].reverse()" :key="element.name" :element="element" :track-width="trackWidth" @click="(event) => onSelectTrack(event, element)"/>
        <TimelineAudioItem v-for="audio in [...audio.elements].reverse()" :key="audio.id" :audio="audio" :track-width="trackWidth" @click="(event) => onSelectTrack(event, element)"/>
        -->
        <template v-for="element in [...elements].reverse()" :key="element.name">
          <TimelineItem v-if="(element as any).meta && (element as any).meta.duration" :element="element" :track-width="trackWidth" :type="element.type" @click="(event) => onSelectTrack(event, element)"/>
        </template>
        <template v-for="element in [...audioElements].reverse()" :key="element.id">
          <TimelineItem :element="element" :track-width="trackWidth" type="audio" @click="(event) => onSelectTrack(event, element)"/>
        </template>
        <!--<TimelineItem v-for="element in [...audio.elements].reverse()" :key="element.id" :element="element" :track-width="trackWidth" type="audio" @click="(event) => onSelectTrack(event, element)"/>-->
      </div>
    </div>
  </div>
</template>