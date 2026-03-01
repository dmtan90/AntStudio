<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Brightness as Eclipse } from '@icon-park/vue-next';

import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
// import Popover from 'video-editor/components/ui/popover.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const opacity = computed({
  get(){
    return (selected.value?.opacity * 100);
  },

  set(value){
    canvas.value.onChangeActiveObjectProperty('opacity', value / 100);
  }
});
</script>

<template>
  <div class="flex items-center">
    <el-popover placement="bottom-end" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
      <template #reference>
        <button class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group transition-all duration-300 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white shadow-sm">
          <Eclipse :size="16" class="text-white/40 group-hover:text-white transition-colors" />
          <span class="text-[10px] font-bold uppercase tracking-widest">Opacity</span>
        </button>
      </template>
      <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
          <div class="px-5 py-3 border-b border-white/5 bg-white/5">
              <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Object Transparency</span>
          </div>
          <div class="p-5 flex flex-col gap-4">
              <div class="flex justify-between mb-1">
                  <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Opacity</Label>
                  <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ opacity.toFixed(0) }}%</span>
              </div>
              <SliderInput :model-value="opacity" :min="0" :max="100" :step="1" @update:model-value="(value) => opacity = value"/>
          </div>
      </div>
    </el-popover>
  </div>
</template>