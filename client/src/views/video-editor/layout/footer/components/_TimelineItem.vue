<script setup lang="ts">
import { computed, ref, watch, onUnmounted, reactive } from 'vue';
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

const offset = ref(0);
const duration = ref(0);
const width = ref(0);
const backgroundWidth = ref(0);
// const disabled = ref(false);
const disabled = computed(() => timeline.value?.playing || animations.value?.previewing);
// const style = reactive({
//   backgroundImage: `url(${backgroundURL.value})`,
//   backgroundSize: `${backgroundWidth.value}px 40px`,
// });
const style = computed(() => {
  return {
    backgroundImage: `url(${backgroundURL.value})`,
    backgroundSize: `${backgroundWidth.value}px 40px`,
  }
});
const isSelected = ref(false);
const trackWidth = ref(0);

const drawWaveformFromAudio = debounce((audio: any) => {
  drawWaveformFromAudioBuffer(audio.buffer, 40, width.value, audio.trim, audio.timeline).then((blob) => {
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
  if(props.type != "audio"){
    if (!active.value){
      isActive = false;
    }
    else{
      if (FabricUtils.isActiveSelection(active.value)){
        isActive = active.value?.objects?.some((object) => object.name === props.element.name)  
      }
      else {
        isActive = active.value?.name === props.element.name;
      };
    }
  }
  else{
    if (!active.value || active.value.type !== "audio"){
      isActive = false;
    }
    else{
      isActive = active.value.id === props.element.id;
    }
  }
  isSelected.value = isActive;
};

const computeStyle = () => {
  if(props.type != "audio"){
    offset.value = ((props.element as any).meta?.offset / 1000) * SEEK_TIME_WIDTH || 0;
    width.value = (((props.element as any).meta?.duration / 1000) * SEEK_TIME_WIDTH) ?? 10;
    // backgroundWidth.value = 40 * (props.element.width! / props.element.height!) + 10;
    backgroundWidth.value = 40 * (props.element.width! / props.element.height!) || 0;
  }
  else{
    offset.value = props.element.offset * SEEK_TIME_WIDTH;
    duration.value = props.element.duration * SEEK_TIME_WIDTH;
    width.value = (props.element.timeline * SEEK_TIME_WIDTH) ?? 10;
  }
  const durationInSeconds = timeline.value?.duration / 1000;
  trackWidth.value = durationInSeconds * SEEK_TIME_WIDTH;
};

const computeUpdate = () => {
  // console.log("computeUpdate", active);
  computeSelected();
  computeStyle();
};

watch(() => props.element, (newElement) => {
  computeUpdate();
  if(props.type == "audio"){
    const _audio = audio.value.get(newElement.name);
    drawWaveformFromAudio(_audio);
  }
  else{
    drawElementAsBackground(newElement);
  }
}, { immediate: true });

watch([canvas, selection, active], (value) => {
  computeUpdate();
});

watch(isSelected, (newVal) => {
  if (trimmerActive.value?.object.id === props.element.id && !newVal) trimmer.value.exit();
});

onUnmounted(() => {
  if(props.type == "audio"){
    URL.revokeObjectURL(backgroundURL.value);
    drawWaveformFromAudio.cancel();
  }
  else{
    drawElementAsBackground.cancel();
  }
});

const handleDragTrack = (x: number, y: number) => {
  console.log("handleDragTrack", x, y, active);
  if(y < 0){
    return false;
  }
  if(props.type != "audio"){
    if (disabled.value || x < 0) return false;
    const newOffset = Math.floor((x / SEEK_TIME_WIDTH) * 1000);
    const object = instance.value!.getItemByName(props.element.name);
    const duration = (props.element as any).meta?.duration || 0;
    if (object && newOffset + duration <= timeline.value?.duration) {
      canvas.value.onChangeObjectTimelineProperty(object, "offset", newOffset);
      return true;
    }
  }
  else{
    if (disabled.value || x < 0) return false;
    const newOffset = x / SEEK_TIME_WIDTH;
    const object = active.value;
    const durationInSeconds = timeline.value?.duration / 1000;
    if(object && newOffset + object.timeline <= durationInSeconds){
      audio.value?.update(props.element.id, { offset: newOffset });
      const _object = instance.value!.getItemByName(props.element.id);
      //update audio visual
      if(_object){
        canvas.value.onChangeObjectTimelineProperty(_object, "offset", newOffset*1000);  
      }
      return true;
    }
  }
  return false;
};

const handleDragLeftBar = (value: number) => {
  if(props.type != "audio"){
    if (disabled.value || value < 0) return false;
    const newOffset = Math.floor((value / SEEK_TIME_WIDTH) * 1000);
    const element = props.element as any;
    const duration = (element.meta?.duration || 0) + (element.meta?.offset || 0) - newOffset;
    const object = instance.value!.getItemByName(props.element.name);
    if (object) {
      canvas.value.onChangeObjectTimelineProperty(object, "offset", newOffset);
      canvas.value.onChangeObjectTimelineProperty(object, "duration", duration);
      return true;
    }
  }
  else{
    if (disabled.value || value < 0) return false;
    const newOffset = value / SEEK_TIME_WIDTH;
    const newTimeline = props.element.timeline + props.element.offset - newOffset;
    audio.value?.update(props.element.id, { offset: newOffset, timeline: newTimeline });
    const _object = instance.value!.getItemByName(props.element.id);
    //update audio visual
    if(_object){
      canvas.value.onChangeObjectTimelineProperty(_object, "offset", newOffset*1000);
      canvas.value.onChangeObjectTimelineProperty(_object, "duration", newTimeline*1000);
    }
    return true;
  }
  return false;
};

const handleDragRightBar = (value: number) => {
  if(props.type != "audio"){
    if (disabled.value) return false;
    const newDuration = Math.floor((value / SEEK_TIME_WIDTH) * 1000) - ((props.element as any).meta?.offset || 0);
    const object = instance.value!.getItemByName(props.element.name);
    const offset = (object as any)?.meta?.offset || 0;
    if (object && offset + newDuration <= timeline.value?.duration) {
      canvas.value.onChangeObjectTimelineProperty(object, "duration", newDuration);
      return true;
    }
  }
  else{
    if (disabled.value) return false;
    const newTimeline = value / SEEK_TIME_WIDTH - props.element.offset;
    const object = active.value;
    const durationInSeconds = timeline.value?.duration / 1000;
    if(object && object.offset + newTimeline <= durationInSeconds){
      audio.value?.update(props.element.id, { timeline: newTimeline });
      const _object = instance.value!.getItemByName(props.element.id);
      //update audio visual
      if(_object){
        canvas.value.onChangeObjectTimelineProperty(_object, "duration", newTimeline*1000);  
      }
      return true;
    }
  }
  return false;
};

const handleResizeTrack = (handle, x, y, width, height) => {
  if(handle == "ml"){
    return handleDragLeftBar(x);
  }
  else if(handle == "mr"){
    return handleDragRightBar(x + width);
  }
  else{
    return false;
  }
};

</script>

<template>
  <div class="h-10 overflow-visible shrink-0 relative">
    <div class="parent-draggable" :style="{ width: `${trackWidth}px`, height: `${HANDLE_HEIGHT}px`, position: 'relative' }">
      <VueDraggable
        axis="x"
        :x="offset"
        :y="0"
        :w="width"
        :h="HANDLE_HEIGHT"
        :onDrag="handleDragTrack"
        :onResize="handleResizeTrack"
        :handles="['ml', 'mr']"
        :active="isSelected"
        :preventDeactivation="true"
      >
        <template #ml>
          <button v-if="isSelected" class="flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-l-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px` }">
            <template v-if="props.type == 'audio'">
              <Minus v-if="props.element.timeline >= props.element.duration || props.element.offset <= 0" :size="15" class="text-white rotate-90" :stroke-width="4" />
              <ChevronLeft v-else :size="15" class="text-white" :stroke-width="4" />
            </template>
            <template v-else>
              <Minus v-if="!Math.round((props.element as any).meta?.offset || 0)" :size="15" class="text-white rotate-90" :stroke-width="2.5" />
              <ChevronLeft v-else :size="15" class="text-white" :stroke-width="2.5" />
            </template>
          </button>
          <span v-else></span>
        </template>
        <button :class="cn('relative h-full w-full z-0 border-3 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing', isSelected ? 'border-primary' : 'border-gray-400')" :style="style">
          <span :class="cn('absolute top-1 bg-foreground/50 text-card rounded-sm backdrop-blur-sm px-2 py-1 flex items-center gap-2.5 capitalize', isSelected ? 'left-5' : 'left-1')">
            <template v-if="props.type == 'audio'">
              <span class="text-xxs">{{ formatMediaDuration(props.element.timeline * 1000) }}</span>
            </template>
            <template v-else>
              <span class="text-xxs">{{ formatMediaDuration((props.element as any).meta?.duration || 0) }}</span>
            </template>
            <ElementDescription :name="props.element.name" :type="props.type" />
          </span>
        </button>
        <template #mr>
          <button v-if="isSelected" class="inline-flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-r-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px`, right: '0px' }">
            <template v-if="props.type == 'audio'">
              <Minus v-if="props.element.timeline >= props.element.duration || props.element.offset + props.element.timeline >= canvas.timeline.duration / 1000" :size="15" class="text-white rotate-90" :stroke-width="4" />
              <ChevronRight v-else :size="15" class="text-white" :stroke-width="4" />
            </template>
            <template v-else>
              <Minus v-if="((props.element as any).meta?.duration || 0) + ((props.element as any).meta?.offset || 0) >= canvas.timeline.duration" :size="15" class="text-white rotate-90" :stroke-width="2.5" />
              <ChevronRight v-else :size="15" class="text-white" :stroke-width="2.5" />
            </template>
          </button>
          <span v-else></span>
        </template>
      </VueDraggable>
    </div>
  </div>
  <!--<VueDraggable
    axis="both"
    :x="offset"
    :w="width"
    :h="HANDLE_HEIGHT"
    :onDrag="handleDragTrack"
    :onResize="handleResizeTrack"
    :handles="['ml', 'mr']"
    :active="isSelected"
    :preventDeactivation="true"
    :style="{ height: `${HANDLE_HEIGHT}px` }"
    :grid="[10, 45]"
    classNameActive="drag-active"
    classNameResizing="drag-resizing"
    classNameDragging="drag-dragging"
  >
    <template #ml>
      <button v-if="isSelected" class="flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-l-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px` }">
        <template v-if="props.type == 'audio'">
          <Minus v-if="props.element.timeline >= props.element.duration || props.element.offset <= 0" :size="15" class="text-white rotate-90" :stroke-width="4" />
          <ChevronLeft v-else :size="15" class="text-white" :stroke-width="4" />
        </template>
        <template v-else>
          <Minus v-if="!Math.round(props.element.meta!.offset)" :size="15" class="text-white rotate-90" :stroke-width="2.5" />
          <ChevronLeft v-else :size="15" class="text-white" :stroke-width="2.5" />
        </template>
      </button>
      <span v-else></span>
    </template>
    <button :class="cn('absolute top-0 left-0 h-full w-full z-0 border-3 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing', isSelected ? 'border-primary' : 'border-gray-100')" :style="style">
      <span :class="cn('absolute top-1 bg-foreground/50 text-card rounded-sm backdrop-blur-sm px-2 py-1 flex items-center gap-2.5 capitalize', isSelected ? 'left-5' : 'left-1')">
        <template v-if="props.type == 'audio'">
          <span class="text-xxs">{{ formatMediaDuration(props.element.timeline * 1000) }}</span>
        </template>
        <template v-else>
          <span class="text-xxs">{{ formatMediaDuration(props.element.meta!.duration) }}</span>
        </template>
        <ElementDescription :name="props.element.name" :type="props.type" />
      </span>
    </button>
    <template #mr>
      <button v-if="isSelected" class="inline-flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-r-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px`, right: '0px' }">
        <template v-if="props.type == 'audio'">
          <Minus v-if="props.element.timeline >= props.element.duration || props.element.offset + props.element.timeline >= canvas.timeline.duration / 1000" :size="15" class="text-white rotate-90" :stroke-width="4" />
          <ChevronRight v-else :size="15" class="text-white" :stroke-width="4" />
        </template>
        <template v-else>
          <Minus v-if="props.element.meta!.duration + props.element.meta!.offset >= canvas.timeline.duration" :size="15" class="text-white rotate-90" :stroke-width="2.5" />
          <ChevronRight v-else :size="15" class="text-white" :stroke-width="2.5" />
        </template>
      </button>
      <span v-else></span>
    </template>
  </VueDraggable>-->
</template>
