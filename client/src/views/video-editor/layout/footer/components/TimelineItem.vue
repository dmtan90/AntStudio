<script setup lang="ts">
import { computed, ref, watch, onUnmounted, reactive, onMounted } from 'vue';
import { Left as ChevronLeft, Right as ChevronRight, Minus, Music } from '@icon-park/vue-next';
import { debounce } from 'lodash';
import VueDraggable from 'vue-draggable-resizable'

import { ElButton } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { drawWaveformFromAudioBuffer } from 'video-editor/lib/media';
import { formatMediaDuration } from 'video-editor/lib/time';
import { cn } from 'video-editor/lib/utils';
import { FabricUtils } from 'video-editor/fabric/utils';
import { propertiesToInclude } from 'video-editor/fabric/constants';

import ElementDescription from './ElementDescription.vue';

const props = defineProps<{ element: fabric.Object | any; trackWidth: number; type: string }>();
// console.log("props", props);

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: active, selection, timeline, animations, trimmerActive, trimmer, audio, instance } = storeToRefs(canvasStore);
const handle = ref<NodeJS.Timeout | null>(null);
const backgroundURL = ref("");

const SEEK_TIME_WIDTH = 42;
const HANDLE_WIDTH = 16;
const HANDLE_HEIGHT = 40;
const MIN_WIDTH = HANDLE_WIDTH * 2;

// const offset = ref(0);
// const duration = ref(0);
// const width = ref(0);
// const backgroundWidth = ref(0);
// const disabled = ref(false);
const timelineMs = computed(() => timeline.value?.duration ?? 5000);
const disabled = computed(() => timeline.value?.playing || animations.value?.previewing);
const baseId = computed(() => props.element?.id ?? props.element?.name ?? "");
const offsetMs = computed(() => props.element?.meta?.offset ?? props.element?.offset * 1000 ?? 0);
const durationMs = computed(() => props.element?.meta?.duration ?? props.element?.timeline * 1000 ?? 3000);
const offsetInSecond = computed(() => (offsetMs.value / 1000) * SEEK_TIME_WIDTH);
const widthInSecond = computed(() => (durationMs.value / 1000) * SEEK_TIME_WIDTH);
const backgroundWidth = computed(() => props.type == "audio" ? (props.element.timeline * SEEK_TIME_WIDTH) : (HANDLE_HEIGHT * (props.element.width! / props.element.height!)));
const timelineInSecond = computed(() => (timelineMs.value / 1000) * SEEK_TIME_WIDTH);
// const offsetInSecond = ref(0);
// const widthInSecond = ref(100);
// const offsetInSecond = computed({
//   get(){
//     return (offsetMs.value / 1000) * SEEK_TIME_WIDTH;
//   },

//   set(value){
//     console.log("offsetInSecond", value);
//   }
// });

// const widthInSecond = computed({
//   get(){
//     return (durationMs.value / 1000) * SEEK_TIME_WIDTH;
//   },

//   set(value){
//     console.log("widthInSecond", value);
//   }
// });

const trackStyle = computed(() => {
  return {
    backgroundImage: `url(${backgroundURL.value})`,
    backgroundSize: `${backgroundWidth.value}px ${HANDLE_HEIGHT}px`,
  }
});
const isSelected = ref(false);
// const trackWidth = ref(0);
// const offsetInSecond = ref(0);
// const widthInSecond = ref(0);
// watch([offsetMs, durationMs], (values) => {
//   console.log(values);
// });

const drawWaveformFromAudio = debounce((audio: any) => {
  drawWaveformFromAudioBuffer(audio.buffer, HANDLE_HEIGHT, widthInSecond.value, audio.trim, audio.timeline).then((blob) => {
    backgroundURL.value = URL.createObjectURL(blob);
  });
}, 1000);

const drawElementAsBackground = debounce((element: fabric.Object) => {
  if (handle.value) clearTimeout(handle.value);
  const object = instance.value!.getItemByName(element.name);
  if (object) {
    object.clone((clone: fabric.Object) => {
      clone.set({ opacity: 1, visible: true, clipPath: undefined });
      if (FabricUtils.isVideoElement(clone)) (clone as any).seek(1);
      handle.value = setTimeout(() => {
        backgroundURL.value = clone.toDataURL({ format: "webp", withoutShadow: true, withoutTransform: true });
      }, 1000);
    }, propertiesToInclude);
  }
}, 1000);

const computeSelected = () => {
  let isActive = false;
  if (!active.value) {
    isActive = false;
  }
  else if (FabricUtils.isActiveSelection(active.value)) {
    isActive = active.value?.objects?.some((object) => object.name === props.element.name)
  }
  else if (props.type == "audio") {
    isActive = active.value?.id === props.element.id;
  }
  else {
    isActive = active.value?.name === props.element.name;
  };
  isSelected.value = isActive;
};

const computeStyle = () => {
  // offsetInSecond.value = (offsetMs.value / 1000) * SEEK_TIME_WIDTH;
  // widthInSecond.value = (durationMs.value / 1000) * SEEK_TIME_WIDTH;
  // console.log("computeStyle", offset, width, props);
  // backgroundWidth.value = 40 * (props.element.width! / props.element.height!) + 10;
  // if(props.type == "audio"){
  //   backgroundWidth.value = props.element.timeline * SEEK_TIME_WIDTH;
  // }
  // else{
  //   backgroundWidth.value = 40 * (props.element.width! / props.element.height!);  
  // }

  // const durationInSeconds = timelineMs.value / 1000;
  // trackWidth.value = durationInSeconds * SEEK_TIME_WIDTH;
};

const computeUpdate = () => {
  // console.log("computeUpdate", active);
  computeSelected();
  computeStyle();
};

const render = () => {
  const element = props.element;
  if (!element) {
    return;
  }

  computeUpdate();
  if (props.type == "audio") {
    const _audio = audio.value?.get(baseId.value);
    // console.log("render", _audio);
    if (_audio) {
      drawWaveformFromAudio(_audio);
    }
  }
  else {
    drawElementAsBackground(element);
  }
}

// watch(() => props.element, (newElement) => {
//   render();
// }, { immediate: true });

watch(props, (newElement) => {
  render();
}, { immediate: true });

watch([canvas, selection, active], (value) => {
  computeUpdate();
});

watch(isSelected, (newVal) => {
  if (trimmerActive.value?.object.id === props.element.id && !newVal) trimmer.value.exit();
});

onMounted(() => {
  render();
});

onUnmounted(() => {
  if (props.type == "audio") {
    URL.revokeObjectURL(backgroundURL.value);
    drawWaveformFromAudio.cancel();
  }
  else {
    drawElementAsBackground.cancel();
  }
});

const handleDragTrack = (x: number, y: number) => {
  console.log("handleDragTrack", x, y);
  if (y < 0) {
    return false;
  }

  if (disabled.value || x < 0) return false;
  const newOffset = Math.floor((x / SEEK_TIME_WIDTH) * 1000);

  if (props.type == "audio") {
    const _audio = audio.value!.get(baseId.value);
    if (_audio) {
      audio.value?.update(baseId.value, { offset: newOffset / 1000 });
      return true;
    }
  }
  else {
    const object = instance.value!.getItemByName(props.element.name);
    if (object) {
      canvas.value.onChangeObjectTimelineProperty(object, "offset", newOffset);
      return true;
    }
  }

  return false;
};

const handleResizeTrack = (x: number, y: number, width: number, height: number) => {
  let status = handleDragTrack(x, y);
  if (status) {
    status = handleDragRightBar(width);
  }
  return status;
};

// const handleDragLeftBar = (value: number) => {
//   console.log("handleDragLeftBar", value);
//   if (disabled.value || value < 0) return false;
//   const newOffset = Math.floor((value / SEEK_TIME_WIDTH) * 1000);
//   const duration = durationMs.value + offsetMs.value - newOffset;
//   if(props.type == "audio"){
//     const _audio = audio.value!.get(baseId.value);
//     if(_audio){
//       audio.value?.update(baseId.value, { offset: newOffset/1000, timeline: duration/1000 });
//       return true;
//     }
//   }
//   else{
//     const object = instance.value!.getItemByName(baseId.value);
//     if(object){
//       canvas.value.onChangeObjectTimelineProperty(object, "offset", newOffset);
//       canvas.value.onChangeObjectTimelineProperty(object, "duration", duration); 
//       return true;
//     }
//   }
//   return false;
// };

const handleDragRightBar = (value: number) => {
  console.log("handleDragRightBar", value);
  if (disabled.value) return false;
  const newDuration = Math.floor((value / SEEK_TIME_WIDTH) * 1000);// - offsetMs.value;
  if (props.type == "audio") {
    const _audio = audio.value!.get(baseId.value);
    if (_audio) {
      audio.value?.update(baseId.value, { timeline: newDuration / 1000 });
      return true;
    }
  }
  else {
    const object = instance.value!.getItemByName(baseId.value);
    if (object) {
      canvas.value.onChangeObjectTimelineProperty(object, "duration", newDuration);
      return true;
    }
  }

  return false;
};

// const handleResizeTrack = (handle, x, y, width, height) => {
//   let status = false;
//   if(handle == "ml"){
//     status = handleDragLeftBar(x);
//   }
//   else if(handle == "mr"){
//     status = handleDragRightBar(x + width);
//   }

//   if(!status){
//     return false;
//   }
// };

const dragStop = (x: number, y: number) => {
  console.log("dragStop", x, y);
  return handleDragTrack(x, y);
};

const resizeStop = (x: number, y: number, width: number, height: number) => {
  console.log("resizeStop", x, y, width, height);
  return handleResizeTrack(x, y, width, height);
};

</script>

<template>
  <div class="h-10 overflow-visible shrink-0 relative">
    <div class="parent-draggable"
      :style="{ width: `${timelineInSecond}px`, height: `${HANDLE_HEIGHT}px`, position: 'relative' }">
      <VueDraggable axis="x" :parent="true" :x="offsetInSecond" :w="widthInSecond" :h="HANDLE_HEIGHT"
        :min-width="MIN_WIDTH" :handles="['ml', 'mr']" :active="isSelected" :preventDeactivation="true"
        @drag-stop="dragStop" @resize-stop="resizeStop" class="transition-none">
        <!-- Left Handle -->
        <template #ml>
          <button v-if="isSelected"
            class="flex items-center justify-center bg-brand-primary absolute top-0 h-full z-10 rounded-l-xl cursor-ew-resize border-l border-t border-b border-white/20 shadow-xl group/handle transition-all duration-300 active:scale-95"
            :style="{ width: `${HANDLE_WIDTH}px` }">
            <Minus v-if="!Math.round(offsetMs)" :size="12"
              class="text-white rotate-90 scale-75 group-hover/handle:scale-100" :stroke-width="4" />
            <ChevronLeft v-else :size="12" class="text-white scale-75 group-hover/handle:scale-110" :stroke-width="4" />
          </button>
          <span v-else></span>
        </template>

        <!-- Main Clip Card -->
        <button
          :class="cn('track relative h-full w-full z-0 border-2 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing hover:visible-handles transition-all duration-300 group/track', isSelected ? 'border-brand-primary bg-brand-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/5 hover:border-white/10 bg-white/5')"
          :style="trackStyle">
          <!-- Clip Content Overlay -->
          <div class="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/40 to-transparent pointer-events-none" />

          <!-- Clip Info Badge -->
          <span
            :class="cn('absolute top-1.5 max-w-[calc(100%-24px)] bg-[#0a0a0a]/80 border border-white/5 text-white/90 rounded-lg backdrop-blur-md px-2.5 py-1 flex items-center gap-2 capitalize shadow-lg transition-all duration-300', isSelected ? 'left-6 ring-1 ring-white/10' : 'left-2')">
            <ElementDescription :name="props.element.name" :type="props.type"
              class="max-w-[120px] truncate text-[11px] font-black tracking-tight" />
            <span
              class="text-[10px] font-bold font-mono text-white/40 border-l border-white/10 pl-2 ml-0.5 tracking-tighter">{{
                formatMediaDuration(durationMs, false) }}</span>
          </span>

          <!-- Audio Waveform / Visual Indicator (Managed by trackStyle background) -->
          <div v-if="props.type === 'audio'"
            class="absolute inset-0 opacity-30 select-none group-hover/track:opacity-50 transition-opacity" />
        </button>

        <!-- Right Handle -->
        <template #mr>
          <button v-if="isSelected"
            class="inline-flex items-center justify-center bg-brand-primary absolute top-0 h-full z-10 rounded-r-xl cursor-ew-resize border-r border-t border-b border-white/20 shadow-xl group/handle transition-all duration-300 active:scale-95"
            :style="{ width: `${HANDLE_WIDTH}px`, right: '0px' }">
            <Minus v-if="durationMs + offsetMs >= canvas.timeline.duration" :size="12"
              class="text-white rotate-90 scale-75 group-hover/handle:scale-100" :stroke-width="4" />
            <ChevronRight v-else :size="12" class="text-white scale-75 group-hover/handle:scale-110"
              :stroke-width="4" />
          </button>
          <span v-else></span>
        </template>
      </VueDraggable>
    </div>
  </div>
</template>

<style>
.parent-draggable {
  .vdr:has(.track) {
    .handle {
      button {
        width: 6px !important;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        opacity: 0.6;
      }
    }
  }

  .vdr:has(.track.border-brand-primary) {
    .handle {
      button {
        width: 16px !important;
        opacity: 1;
      }
    }
  }

  .vdr:has(.track:hover) {
    .handle {
      button {
        width: 16px !important;
        opacity: 0.9;
      }
    }
  }

  /* Ensure handles are always visible when selected */
  .vdr.active {
    .handle button {
      width: 16px !important;
      opacity: 1 !important;
    }
  }
}
</style>
