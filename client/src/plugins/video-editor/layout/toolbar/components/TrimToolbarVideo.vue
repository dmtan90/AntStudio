<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { Check, Left as ChevronLeft, Right as ChevronRight, Play } from '@icon-park/vue-next';
import { floor } from 'lodash';
import VueDraggable from 'vue-draggable-resizable'

import { ElButton, ElInput } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { cn } from '@/utils/ui';
import { useMeasure } from 'video-editor/hooks/use-measure';

const editor = useEditorStore();
const trim = computed(() => editor.canvas.trimmer.active!.object);

const [containerRef, dimensions] = useMeasure();
const containerWidth = computed(() => (dimensions.value as any).width - 16); // handleWidth

const background = ref("");
const data = ref({ trimStartX: 0, trimEndX: 0, duration: 0 });

const handleWidth = 16;

watch(containerWidth, (newWidth) => {
  if (newWidth <= 0) return;
  const object = editor.canvas.instance!.getItemByName(trim.value.name) as any;
  const trimStartX = (newWidth / object.duration(false)) * object.trimStart!;
  const trimEndX = newWidth - (newWidth / object.duration(false)) * object.trimEnd!;
  data.value = { trimStartX: trimStartX, trimEndX: trimEndX, duration: object.duration(false) };
}, { immediate: true });

watch(trim, (newTrim) => {
  const video = editor.canvas.instance!.getItemByName(newTrim.name) as any;
  if (background.value || video.meta!.placeholder) return;
  video.clone((clone: any) => {
    clone.set({ opacity: 1, visible: true, clipPath: undefined });
    clone.seek(1);
    setTimeout(() => {
      clone.set({ filters: [] });
      clone.applyFilters();
      background.value = clone.toDataURL({ format: "jpeg", quality: 0.1, withoutShadow: true, withoutTransform: true });
    }, 500);
  });
}, { immediate: true });

const backgroundWidth = computed(() => 40 * ((trim.value as any).width! / (trim.value as any).height!) + 10);
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
      <div class="absolute h-full top-0 flex">
        <VueDraggable
          axis="x"
          :x="data.trimStartX"
          :y="0"
          :w="handleWidth"
          :h="40"
          :parent="true"
          :z="999"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => handleDragChange('trimStartX', x)">
          <button class="absolute grid place-items-center h-full bg-brand-primary rounded-l-lg z-20 cursor-ew-resize group/handle shadow-lg" :style="{ width: `${handleWidth}px` }">
            <ChevronLeft :size="12" class="text-white group-hover/handle:scale-125 transition-transform" :stroke-width="4" stroke="#ffffff" />
          </button>
        </VueDraggable>
        <div class="h-full absolute border-y-2 border-brand-primary mix-blend-screen bg-brand-primary/10 z-10 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]" :style="{ left: `${data.trimStartX + handleWidth}px`, width: `${trackWidth}px` }"></div>
        <VueDraggable
          axis="x"
          :x="data.trimEndX"
          :y="0"
          :w="handleWidth"
          :h="40"
          :parent="true"
          :resizable="false"
          class="!h-full"
          :onDrag="(x, y) => handleDragChange('trimEndX', x)">
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