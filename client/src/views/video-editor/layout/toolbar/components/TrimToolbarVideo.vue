<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { Check, Left as ChevronLeft, Right as ChevronRight, Play } from '@icon-park/vue-next';
import { floor } from 'lodash';
import VueDraggable from 'vue-draggable-resizable'

import { ElButton, ElInput } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { cn } from 'video-editor/lib/utils';
import { useMeasure } from 'video-editor/hooks/use-measure';

const editor = useEditorStore();
const trim = computed(() => editor.canvas.trimmer.active!.object);

const [containerRef, dimensions] = useMeasure();
const containerWidth = computed(() => dimensions.value.width - 16); // handleWidth

const background = ref("");
const data = ref({ trimStartX: 0, trimEndX: 0, duration: 0 });

const handleWidth = 16;

watch(containerWidth, (newWidth) => {
  if (newWidth <= 0) return;
  const object = editor.canvas.instance!.getItemByName(trim.value.name) as fabric.Video;
  const trimStartX = (newWidth / object.duration(false)) * object.trimStart!;
  const trimEndX = newWidth - (newWidth / object.duration(false)) * object.trimEnd!;
  data.value = { trimStartX: trimStartX, trimEndX: trimEndX, duration: object.duration(false) };
}, { immediate: true });

watch(trim, (newTrim) => {
  const video = editor.canvas.instance!.getItemByName(newTrim.name) as fabric.Video;
  if (background.value || video.meta!.placeholder) return;
  video.clone((clone: fabric.Video) => {
    clone.set({ opacity: 1, visible: true, clipPath: undefined });
    clone.seek(1);
    setTimeout(() => {
      clone.set({ filters: [] });
      clone.applyFilters();
      background.value = clone.toDataURL({ format: "jpeg", quality: 0.1, withoutShadow: true, withoutTransform: true });
    }, 500);
  });
}, { immediate: true });

const backgroundWidth = computed(() => 40 * (trim.value.width! / trim.value.height!) + 10);
const trackWidth = computed(() => containerWidth.value - data.value.trimStartX - (containerWidth.value - data.value.trimEndX) - handleWidth);
const absoluteDuration = computed(() => data.value.duration - (data.value.trimStartX / containerWidth.value) * data.value.duration - ((containerWidth.value - data.value.trimEndX) / containerWidth.value) * data.value.duration);

const handleDragChange = (key: "trimStartX" | "trimEndX", value: number) => {
  data.value = { ...data.value, [key]: value };
};

const handleChanges = () => {
  const trimStart = (data.value.trimStartX / containerWidth.value) * data.value.duration;
  const trimEnd = ((containerWidth.value - data.value.trimEndX) / containerWidth.value) * data.value.duration;
  editor.canvas.onChangeActiveVideoProperty("trimStart", trimStart);
  editor.canvas.onChangeActiveVideoProperty("trimEnd", trimEnd);
  editor.canvas.trimmer.exit();
};

const style = computed(() => ({
  backgroundImage: `url(${background.value})`,
  backgroundSize: `${backgroundWidth.value}px 40px`,
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
      <div class="absolute h-full top-0 flex">
        <VueDraggable
          axis="x"
          :x="data.trimStartX"
          :y="0"
          :w="handleWidth"
          :h="32"
          :parent="true"
          :z="999"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => handleDragChange('trimStartX', x)">
          <button class="absolute grid place-items-center h-full bg-primary rounded-l-md z-20" :style="{ width: `${handleWidth}px` }">
            <ChevronLeft :size="14" :stroke-width="2.5" stroke="#ffffff" />
          </button>
        </VueDraggable>
        <div class="h-full absolute border-t-2 border-b-2 border-primary mix-blend-overlay bg-gray-300 z-10" :style="{ left: `${data.trimStartX + handleWidth}px`, width: `${trackWidth}px` }"></div>
        <VueDraggable
          axis="x"
          :x="data.trimEndX"
          :y="0"
          :w="handleWidth"
          :h="32"
          :parent="true"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => handleDragChange('trimEndX', x)">
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