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

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden">
    <el-button :icon="Check" plain round class="px-2.5" @click="handleCropEnd">
      <span>Done</span>
    </el-button>
    <el-divider direction="vertical" class="h-8" />
    <div class="flex items-center gap-2.5">
      <el-tooltip content="Mirror image horizontally" placement="bottom">
        <el-button plain circle @click="handleFlipImage('flipX')">
          <FlipHorizontally :size="15" />
        </el-button>
      </el-tooltip>
      <el-tooltip content="Mirror image vertically" placement="bottom">
        <el-button plain circle @click="handleFlipImage('flipY')">
          <FlipVertically :size="15" />
        </el-button>
      </el-tooltip>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <el-button plain round class="gap-1.5">
      <CornerUpLeft :size="15" />
      <span>Reset</span>
    </el-button>
  </div>
</template>
