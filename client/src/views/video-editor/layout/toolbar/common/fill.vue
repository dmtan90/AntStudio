<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn } from 'video-editor/lib/utils';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const background = computed(() => {
  if (!selected.value) return "#000000";
  if (typeof selected.value.fill === "string") return selected.value.fill || "#000000";
  const gradient = (selected.value.fill as fabric.Gradient)?.colorStops?.map((stop) => `${stop.color} ${stop.offset * 100}%`).join(", ");
  if(gradient){
    return `linear-gradient(90deg, ${gradient})`;
  }
  return "#000000";
});

</script>

<template>
  <div class="flex items-center">
    <el-button
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'fill' ? null : 'fill')"
      text bg round
      :type="!selected?.fill ? '' : 'primary'"
      :disabled="editor.sidebarRight === 'fill'"
      :class="cn('px-2.5')"
    >
      <div class="relative">
        <div :class="cn('h-5 w-5 border rounded-full', !selected?.fill ? 'opacity-50' : 'opacity-100')" :style="{ background }" />
        <div v-if="!selected?.fill" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-card-foreground -rotate-45" />
      </div>
      <span>Fill</span>
    </el-button>
  </div>
</template>