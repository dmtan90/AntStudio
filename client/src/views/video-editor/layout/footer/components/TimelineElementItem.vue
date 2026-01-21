<script setup lang="ts">
import { computed, ref, watch, onUnmounted,reactive } from 'vue';
import { Left as ChevronLeft, Right as ChevronRight, Minus } from '@icon-park/vue-next';
import { debounce } from 'lodash';
import VueDraggable from 'vue-draggable-resizable'

import { ElButton } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { formatMediaDuration } from 'video-editor/lib/time';
import { cn } from 'video-editor/lib/utils';
import { FabricUtils } from 'video-editor/fabric/utils';
import { propertiesToInclude } from 'video-editor/fabric/constants';

import ElementDescription from './ElementDescription.vue';

const props = defineProps<{ element: fabric.Object; trackWidth: number }>();

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selection, selectionActive: active, timeline, animations, instance } = storeToRefs(canvasStore);

const handle = ref<NodeJS.Timeout | null>(null);
const backgroundURL = ref("");

const SEEK_TIME_WIDTH = 42;
const HANDLE_WIDTH = 16;
const HANDLE_HEIGHT = 40;

const offset = ref(0);
const width = ref(0);
const backgroundWidth = ref(0);
// const disabled = ref(false);
const disabled = computed(() => timeline.value?.playing || animations.value?.previewing);
const style = reactive({
  backgroundImage: `url(${backgroundURL.value})`,
  backgroundSize: `${backgroundWidth.value}px 40px`,
});
const isSelected = ref(false);
const trackWidth = ref(0);

const drawElementAsBackground = debounce((element: fabric.Object) => {
  if (handle.value) clearTimeout(handle.value);
  const object = instance.value!.getItemByName(element.name);
  if (object) {
    object.clone((clone: fabric.Object) => {
      clone.set({ opacity: 1, visible: true, clipPath: undefined });
      if (FabricUtils.isVideoElement(clone)) (clone as any).seek(1);
      handle.value = setTimeout(() => {
        backgroundURL.value = clone.toDataURL({ format: "webp", withoutShadow: true, withoutTransform: true })
        style.backgroundImage = `url(${backgroundURL.value})`;
      }, 1000);
    }, propertiesToInclude);
  }
}, 1000);

const computeSelected = () => {
  let isActive = false;
  const currentActive = active.value as any;
  if (!currentActive){
    isActive = false;
  }
  else{
    if (FabricUtils.isActiveSelection(currentActive)){
      isActive = currentActive?.objects?.some((object: any) => object.name === props.element.name)  
    }
    else {
      isActive = currentActive?.name === props.element.name;
    };
  }
  isSelected.value = isActive;
};

const computeStyle = () => {
  offset.value = ((props.element as any).meta?.offset / 1000) * SEEK_TIME_WIDTH || 0;
  width.value = ((props.element as any).meta?.duration / 1000) * SEEK_TIME_WIDTH || 0;
  backgroundWidth.value = 40 * (props.element.width! / props.element.height!) + 10;
  // disabled.value = timeline.value?.playing || animations.value?.previewing;

  style.backgroundImage = `url(${backgroundURL.value})`;
  style.backgroundSize = `${backgroundWidth.value}px 40px`

  const durationInSeconds = timeline.value?.duration / 1000;
  trackWidth.value = durationInSeconds * SEEK_TIME_WIDTH;
};

const computeUpdate = () => {
  console.log("computeUpdate", active);
  computeSelected();
  computeStyle();
};

watch(() => props.element, (newElement) => {
  computeUpdate();
  drawElementAsBackground(newElement);
}, { immediate: true });

watch([canvas, selection, active], (value) => {
  computeUpdate();
});

onUnmounted(() => {
  drawElementAsBackground.cancel();
});

const handleDragTrack = (x: number) => {
  if (disabled.value || x < 0) return false;
  if(x > trackWidth.value - width.value){
    return false;
  }
  const newOffset = Math.floor((x / SEEK_TIME_WIDTH) * 1000);
  const object = instance.value!.getItemByName(props.element.name);
  if (object) {
    canvas.value.onChangeObjectTimelineProperty(object, "offset", newOffset);
  }
};

const handleDragLeftBar = (x: number) => {
  if (disabled.value) return;
  const newOffset = Math.floor((x / SEEK_TIME_WIDTH) * 1000);
  const element = props.element as any;
  const duration = (element.meta?.duration || 0) + (element.meta?.offset || 0) - newOffset;
  const object = instance.value!.getItemByName(props.element.name);
  if (object) {
    canvas.value.onChangeObjectTimelineProperty(object, "offset", newOffset);
    canvas.value.onChangeObjectTimelineProperty(object, "duration", duration);
  }
};

const handleDragRightBar = (width: number) => {
  if (disabled.value) return;
  const newDuration = Math.floor((width / SEEK_TIME_WIDTH) * 1000) - ((props.element as any).meta?.offset || 0);
  const object = instance.value!.getItemByName(props.element.name);
  if (object) {
    canvas.value.onChangeObjectTimelineProperty(object, "duration", newDuration);
  }
};

const handleResizeTrack = (handle, x, y, width, height) => {
  if(handle == "ml"){
    handleDragLeftBar(x);
  }
  else if(handle == "mr"){
    handleDragRightBar(x + width);
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
            <Minus v-if="!Math.round((props.element as any).meta?.offset || 0)" :size="15" class="text-white rotate-90" :stroke-width="2.5" />
            <ChevronLeft v-else :size="15" class="text-white" :stroke-width="2.5" />
          </button>
          <span v-else></span>
        </template>
        <button :class="cn('relative h-full w-full z-0 border-3 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing', isSelected ? 'border-primary' : 'border-gray-400')" :style="style">
          <span :class="cn('absolute top-1 bg-foreground/50 text-card rounded-sm backdrop-blur-sm px-2 py-1 flex items-center gap-2.5 capitalize', isSelected ? 'left-5' : 'left-1')">
            <span class="text-xxs">{{ formatMediaDuration((props.element as any).meta?.duration || 0) }}</span>
            <ElementDescription :name="props.element.name" :type="props.element.type" />
          </span>
        </button>
        <template #mr>
          <button v-if="isSelected" class="inline-flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-r-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px`, right: '0px' }">
            <Minus v-if="((props.element as any).meta?.duration || 0) + ((props.element as any).meta?.offset || 0) >= canvas.timeline.duration" :size="15" class="text-white rotate-90" :stroke-width="2.5" />
            <ChevronRight v-else :size="15" class="text-white" :stroke-width="2.5" />
          </button>
          <span v-else></span>
        </template>
      </VueDraggable>
    </div>
  </div>
</template>