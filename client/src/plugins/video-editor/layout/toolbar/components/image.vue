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
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap gap-3.5 px-1 py-1">
    <div class="flex items-center">
      <button 
        class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group hover:bg-white/10 hover:border-white/10 transition-all duration-300 active:scale-95 shadow-sm" 
        @click="cropper.cropActiveObject()"
      >
        <Crop :size="16" class="text-white/40 group-hover:text-white transition-colors" />
        <span class="text-[10px] font-bold uppercase tracking-widest text-white/70 group-hover:text-white">Crop</span>
      </button>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0 mx-0.5" />
    
    <ToolbarStrokeOption />
    
    <div class="w-px h-6 bg-white/10 shrink-0 mx-0.5" />
    
    <ToolbarOpacityOption />
    
    <div class="w-px h-6 bg-white/10 shrink-0 mx-0.5" />
    
    <div class="flex items-center gap-2">
      <button
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'filters' ? null : 'filters')"
        class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 flex items-center gap-2.5 group transition-all duration-300"
        :class="[
          editor.sidebarRight === 'filters' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
          !selected?.filters?.length ? '' : '!text-brand-primary !border-brand-primary/20 !bg-brand-primary/10'
        ]"
      >
        <Wand :size="16" :class="selected?.filters?.length ? 'text-brand-primary' : ''" />
        <span class="text-[10px] font-bold uppercase tracking-widest">Filters</span>
      </button>

      <button
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'clip' ? null : 'clip')"
        class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 flex items-center gap-2.5 group transition-all duration-300"
        :class="[
           editor.sidebarRight === 'clip' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
           !selected?.clipPath ? '' : '!text-brand-primary !border-brand-primary/20 !bg-brand-primary/10'
        ]"
      >
        <Blend :size="16" :class="selected?.clipPath ? 'text-brand-primary' : ''" />
        <span class="text-[10px] font-bold uppercase tracking-widest">Mask</span>
      </button>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0 mx-1" />
    
    <ToolbarTimelineOption />
  </div>
</template>
