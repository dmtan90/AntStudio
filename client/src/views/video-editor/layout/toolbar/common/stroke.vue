<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Down as ChevronDown } from '@icon-park/vue-next';

import Label from 'video-editor/components/ui/label.vue';
// import Popover from 'video-editor/components/ui/popover.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn } from 'video-editor/lib/utils';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const strokeWidth = computed({
  get(){
    return (selected.value?.strokeWidth);
  },

  set(value){
    canvas.value.onChangeActiveObjectProperty('strokeWidth', value);
  }
});

</script>

<template>
  <div class="flex items-center gap-1.5">
    <button
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'stroke' ? null : 'stroke')"
      class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 flex items-center gap-2.5 group transition-all duration-300 shadow-sm"
      :class="[
        editor.sidebarRight === 'stroke' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
      ]"
    >
      <div class="relative flex items-center">
        <div :class="cn('h-5 w-5 border border-white/20 rounded-full grid place-items-center shadow-inner transition-all', !selected?.stroke ? 'opacity-30' : 'opacity-100')" :style="{ backgroundColor: !selected?.stroke ? '#000000' : selected?.stroke }">
          <div class="h-2 w-2 rounded-full bg-white/80 ring-1 ring-black/20" />
        </div>
        <div v-if="!selected?.stroke" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-red-500/80 -rotate-45" />
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest">Stroke</span>
    </button>
    
    <template v-if="selected?.stroke">
      <el-popover placement="bottom-start" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
        <template #reference>
          <button class="cinematic-button !h-9 !px-3 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group hover:bg-white/10 hover:border-white/10 transition-all duration-300 shadow-sm">
             <div class="flex flex-col gap-[2.5px] w-4 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                <div class="h-[1px] w-full bg-current" />
                <div class="h-[2px] w-full bg-current" />
                <div class="h-[3px] w-full bg-current" />
             </div>
             <span class="text-[10px] font-bold font-mono tracking-tighter text-white/60 group-hover:text-white">{{ selected.strokeWidth }}PX</span>
          </button>
        </template>
        <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
            <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Stroke Appearance</span>
            </div>
            <div class="p-5 flex flex-col gap-4">
                <div class="flex justify-between mb-1">
                    <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Width</Label>
                    <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ strokeWidth }} PX</span>
                </div>
                <SliderInput :model-value="strokeWidth" :min="1" :max="100" :step="1" @update:model-value="(value) => strokeWidth = value"/>
            </div>
        </div>
      </el-popover>
    </template>
  </div>
</template>