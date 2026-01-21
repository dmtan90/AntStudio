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
  <div class="flex items-center">
    <el-button
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'stroke' ? null : 'stroke')"
      text bg round
      :type="!selected?.stroke ? '' : 'primary'"
      :disabled="editor.sidebarRight === 'stroke'"
      :class="cn('px-2.5')"
    >
      <div class="relative">
        <div :class="cn('h-5 w-5 border rounded-full grid place-items-center', !selected?.stroke ? 'opacity-50' : 'opacity-100')" :style="{ backgroundColor: !selected?.stroke ? '#000000' : selected?.stroke }">
          <div class="h-2 w-2 rounded-full bg-white border" />
        </div>
        <div v-if="!selected?.stroke" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-card-foreground -rotate-45" />
      </div>
      <span>Stroke</span>
    </el-button>
    <template v-if="selected?.stroke">
      <el-popover placement="bottom-start" trigger="click" width="200px">
        <template #reference>
          <el-button text bg round class="px-2.5">
            <span class="flex flex-col gap-0.5">
              <span class="h-[1px] w-4 bg-foreground/40" />
              <span class="h-[2px] w-4 bg-foreground/60" />
              <span class="h-[3px] w-4 bg-foreground/80" />
              <span />
            </span>
            <span class="text-xs mx-2 text-start tabular-nums">{{ selected.strokeWidth }} px</span>
          </el-button>
        </template>
        <span class="text-xs font-normal">Stroke Width</span>
        <div class="flex items-center justify-between gap-4">
          <SliderInput :model-value="strokeWidth" :min="1" :max="100" :step="1" @update:model-value="(value) => strokeWidth = value"/>
        </div>
      </el-popover>
    </template>
  </div>
</template>