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
  <div class="flex items-center gap-4">
    <el-popover placement="bottom-end" trigger="click" width="200px">
      <template #reference>
        <el-button :icon="Eclipse" text bg round class="px-2.5">
          <span>Opacity</span>
        </el-button>
      </template>
      <span class="text-xs font-normal">Opacity (%)</span>
      <SliderInput :model-value="opacity" :min="0" :max="100" :step="10" @update:model-value="(value) => opacity = value"/>
    </el-popover>
  </div>
</template>