<script setup lang="ts">
import { computed } from 'vue';
import { WavesLeft as AudioWaveform, Down as ChevronDown, Timeline as GanttChart, Delete as Trash2, VolumeNotice as Volume2, VolumeMute as VolumeX } from '@icon-park/vue-next';
import { floor } from 'lodash';
import { cn } from 'video-editor/lib/utils';

import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import Toggle from 'video-editor/components/ui/toggle.vue';

import ToolbarFillOption from '../common/fill.vue';
import ToolbarStrokeOption from '../common/stroke.vue';
import ToolbarTimelineOption from '../common/timeline.vue';
import ToolbarOpacityOption from '../common/opacity.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected, audio, timeline, trimmer } = storeToRefs(canvasStore);
const volume = computed({
  get(){
    return (selected.value?.volume ?? 1) * 100;
  },

  set(value){
    // audio.value.update(selected.value?.id, { volume: value / 100 });
    audio.value.update(selected.value?.name, { volume: value / 100 });
    canvas.value.onChangeActiveObjectProperty('volume', value / 100);
  }
});

const duration = computed({
  get(){
    return floor(selected.value?.timeline, 2);
    // return (selected.value?.timeline / 1000);
  },

  set(value){
    audio.value.update(selected.value?.id, { timeline: value })
    // audio.value.update(selected.value?.name, { timeline: value })
    // canvas.value.onChangeActiveObjectTimelineProperty('duration', value * 1000);
  }
});

const offset = computed({
  get(){
    return floor(selected.value?.offset, 2);
    // return (selected.value?.offset / 1000);
  },

  set(value){
    audio.value.update(selected.value?.id, { offset: value })
    // audio.value.update(selected.value?.name, { offset: value })
    // canvas.value.onChangeActiveObjectTimelineProperty('offset', value * 1000);
  }
});


const muted = computed({
  get(){
    return selected.value?.muted || selected.value?.volume == 0;
  },

  set(value){
    audio.value.update(selected.value.id, { muted: value })
    // audio.value.update(selected.value.name, { muted: value })
    // canvas.value.onChangeActiveObjectProperty('muted', value);
  }
});

const handleDelete = () => {
  audio.value.delete(selected.value.name);
}

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden">
    <div class="flex items-center">
      <el-button text bg round
        :type="!selected?.visible ? '' : 'primary'"
        :disabled="editor.sidebarRight === 'visual'" 
        :class="cn('px-2.5 relative')"
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'visual' ? null : 'visual')">
        <div class="relative">
          <AudioWaveform :size="15" />
          <div v-if="!selected?.visible" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-6 bg-card-foreground -rotate-45" />
        </div>
        <span>Visual</span>
      </el-button>
      <template v-if="selected.visible">
        <ToolbarFillOption class="mr-2.5"/>
        <ToolbarStrokeOption class="mr-2.5"/>
        <ToolbarOpacityOption />
      </template>
      <el-divider direction="vertical" class="h-8" />
      <el-popover placement="bottom-start" width="250px">
        <template #reference>
          <el-button class="px-2.5" :icon="Volume2" text bg round>
            <span>Volume</span>
          </el-button>
        </template>
        <Label class="text-xs font-medium">Volume (%)</Label>
        <div class="flex items-center justify-between gap-2">
          <SliderInput class="w-[calc(100% - 32px)]" :model-value="volume" :min="0" :max="100" :step="10" :disabled="muted" @update:model-value="(value) => volume = value"/>
          <Toggle v-model="muted" circle class="" @toggle="value => muted = value">
            <VolumeX :size="15" />
          </Toggle>
        </div>
      </el-popover>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <ToolbarTimelineOption />
  </div>
</template>
