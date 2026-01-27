<script setup lang="ts">
import { Check, CornerUpLeft, FlipHorizontally, FlipVertically } from '@icon-park/vue-next';

import { ElButton, ElDivider, ElTooltip } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, cropperActive, selectionActive, instance } = storeToRefs(canvasStore);

const handleCropEnd = () => {
  console.log("handleCropEnd");
  instance.value.discardActiveObject();
  if (selectionActive.value) instance.value.setActiveObject(selectionActive.value);
  cropperActive.value = null;
};

const handleFlipImage = (property: "flipX" | "flipY") => {
  canvas.value.onChangeImageProperty(cropperActive.value!, property, !cropperActive![property]);
};

const handleReset = () => {
    // TODO: Implement reset logic if needed
};
</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap gap-3.5 px-1 py-1">
    <button 
      class="flex items-center gap-2.5 h-9 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all duration-300 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5 active:scale-95" 
      @click="handleCropEnd"
    >
      <Check :size="16" :stroke-width="4" />
      <span>Done</span>
    </button>

    <div class="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

    <div class="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
      <el-tooltip content="Mirror image horizontally" placement="top" popper-class="cinematic-tooltip">
        <button class="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90" @click="handleFlipImage('flipX')">
          <FlipHorizontally :size="16" />
        </button>
      </el-tooltip>
      <el-tooltip content="Mirror image vertically" placement="top" popper-class="cinematic-tooltip">
        <button class="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90" @click="handleFlipImage('flipY')">
          <FlipVertically :size="16" />
        </button>
      </el-tooltip>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

    <button 
      class="flex items-center gap-2.5 h-9 px-4 rounded-xl border border-white/5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest active:scale-95" 
      @click="handleReset"
    >
      <CornerUpLeft :size="16" />
      <span>Reset</span>
    </button>
  </div>
</template>
