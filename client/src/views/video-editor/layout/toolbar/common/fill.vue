<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn } from '@/utils/ui';

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
    <button
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'fill' ? null : 'fill')"
      class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 flex items-center gap-2.5 group transition-all duration-300 shadow-sm"
      :class="[
        editor.sidebarRight === 'fill' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
      ]"
    >
      <div class="relative flex items-center">
        <div :class="cn('h-5 w-5 border border-white/20 rounded-full shadow-inner transition-all', !selected?.fill ? 'opacity-30' : 'opacity-100')" :style="{ background }" />
        <div v-if="!selected?.fill" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-red-500/80 -rotate-45" />
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest">Fill</span>
    </button>
  </div>
</template>