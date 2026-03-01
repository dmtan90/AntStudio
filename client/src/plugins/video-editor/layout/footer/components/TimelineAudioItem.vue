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

import ElementDescription from './ElementDescription.vue';

const props = defineProps<{ audio: any; trackWidth: number }>();

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: active, selection, timeline, animations, trimmerActive, trimmer, audio } = storeToRefs(canvasStore);
const backgroundURL = ref("");

const SEEK_TIME_WIDTH = 42;
const HANDLE_WIDTH = 16;
const HANDLE_HEIGHT = 28;

const offset = ref(0);
const duration = ref(0);
const width = ref(0);
// const disabled = ref(false);
const disabled = computed(() => timeline.value?.playing || animations.value?.previewing);
const style = reactive({
  backgroundImage: `url(${backgroundURL.value})`,
  backgroundSize: `${width.value}px 40px`,
});
const isSelected = ref(false);
const trackWidth = ref(0);

const drawWaveformFromAudio = debounce((audio: any) => {
  drawWaveformFromAudioBuffer(audio.buffer, 40, width.value, audio.trim, audio.timeline).then((blob) => {
    backgroundURL.value = URL.createObjectURL(blob), 
    style.backgroundImage = `url(${backgroundURL.value})`
  });
}, 1000);

const computeSelected = () => {
  let isActive = false;
  if (!active.value || active.value.type !== "audio"){
    isActive = false;
  }
  else{
    isActive = active.value.id === props.audio.id;
  }
  isSelected.value = isActive;
};

const computeStyle = () => {
  offset.value = props.audio.offset * SEEK_TIME_WIDTH;
  duration.value = props.audio.duration * SEEK_TIME_WIDTH;
  width.value = props.audio.timeline * SEEK_TIME_WIDTH;
  // disabled.value = timeline.value?.playing || animations.value?.previewing;

  style.backgroundImage = `url(${backgroundURL.value})`;
  style.backgroundSize = `${width.value}px 40px`

  const durationInSeconds = timeline.value?.duration / 1000;
  trackWidth.value = durationInSeconds * SEEK_TIME_WIDTH;
};

const computeUpdate = () => {
  computeSelected();
  computeStyle()
};

watch(() => props.audio, (newAudio) => {
  computeUpdate();
  drawWaveformFromAudio(newAudio);
}, { immediate: true });

watch([canvas, selection, active], (value) => {
  computeUpdate();
});

watch(isSelected, (newVal) => {
  if (trimmerActive.value?.object.id === props.audio.id && !newVal) trimmer.value.exit();
});

onUnmounted(() => {
  URL.revokeObjectURL(backgroundURL.value);
});

const handleDragTrack = (value: number) => {
  if (disabled.value) return;
  const newOffset = value / SEEK_TIME_WIDTH;
  audio.value?.update(props.audio.id, { offset: newOffset });
};

const handleDragLeftBar = (value: number) => {
  if (disabled.value) return;
  const newOffset = value / SEEK_TIME_WIDTH;
  const newTimeline = props.audio.timeline + props.audio.offset - newOffset;
  audio.value.update(props.audio.id, { offset: newOffset, timeline: newTimeline });
};

const handleDragRightBar = (value: number) => {
  if (disabled.value) return;
  const newTimeline = value / SEEK_TIME_WIDTH - props.audio.offset;
  audio.value.update(props.audio.id, { timeline: newTimeline });
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
        :parent="true"
        :onDrag="(x) => handleDragTrack(x)"
        :onResize="handleResizeTrack"
        :handles="['ml', 'mr']"
        :active="isSelected"
        :preventDeactivation="true"
      >
        <template #ml>
          <button v-if="isSelected" class="flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-l-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px` }">
            <Minus v-if="props.audio.timeline >= props.audio.duration || props.audio.offset <= 0" :size="15" class="text-white rotate-90" :stroke-width="4" />
            <ChevronLeft v-else :size="15" class="text-white" :stroke-width="4" />
          </button>
          <span v-else></span>
        </template>
        <el-button :class="cn('relative h-full w-full z-0 border-3 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing', isSelected ? 'border-primary' : 'border-gray-400')" :style="style">
          <span :class="cn('absolute top-1 bg-foreground/50 text-card rounded-sm backdrop-blur-sm px-2 py-1 flex items-center gap-2.5 capitalize', isSelected ? 'left-5' : 'left-1')">
            <span class="text-xxs">{{ formatMediaDuration(props.audio.timeline * 1000) }}</span>
            <div class="inline-flex items-center gap-1.5">
              <Music :size="12" />
              <span class="text-xxs">Audio</span>
            </div>
          </span>
        </el-button>
        <template #mr>
          <button v-if="isSelected" class="inline-flex items-center justify-center bg-primary absolute top-0 h-full z-10 rounded-r-lg cursor-ew-resize" :style="{ width: `${HANDLE_WIDTH}px`, right: '0px' }">
            <Minus v-if="props.audio.timeline >= props.audio.duration || props.audio.offset + props.audio.timeline >= canvas.timeline.duration / 1000" :size="15" class="text-white rotate-90" :stroke-width="4" />
            <ChevronRight v-else :size="15" class="text-white" :stroke-width="4" />
          </button>
          <span v-else></span>
        </template>
      </VueDraggable>
    </div>
  </div>
</template>