<script setup lang="ts">
import { computed } from 'vue';
import { ExcludeSelection as Blend, Selected as Crop, MagicWand as Wand } from '@icon-park/vue-next';

import { ElButton, ElDivider } from 'element-plus';

import { cn } from 'video-editor/lib/utils';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

import ToolbarStrokeOption from '../common/stroke.vue';
import ToolbarTimelineOption from '../common/timeline.vue';
import ToolbarOpacityOption from '../common/opacity.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected, cropper } = storeToRefs(canvasStore);

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden">
    <div class="flex items-center">
      <el-button :icon="Crop" class="px-2.5" text bg round @click="cropper.cropActiveObject()">
        <span>Crop</span>
      </el-button>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <ToolbarStrokeOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarOpacityOption />
    <el-divider direction="vertical" class="h-8" />
    <div class="flex items-center">
      <el-button
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'filters' ? null : 'filters')"
        :icon="Wand" text bg round
        :type="!selected?.filters?.length ? '' : 'primary'"
        :disabled="editor.sidebarRight === 'filters'"
        :class="cn('px-2.5')"
      >
        <span>Filter</span>
      </el-button>
      <el-button
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'clip' ? null : 'clip')"
        :icon="Blend" text bg round
        :type="!selected?.clipPath ? '' : 'primary'"
        :disabled="editor.sidebarRight === 'clip'"
        :class="cn('px-2.5')"
      >
        <span>Mask</span>
      </el-button>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <ToolbarTimelineOption />
  </div>
</template>
