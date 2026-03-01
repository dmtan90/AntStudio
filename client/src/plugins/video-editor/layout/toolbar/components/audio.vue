<script setup lang="ts">
import { computed } from 'vue';
import { WavesLeft as AudioWaveform, Down as ChevronDown, Timeline as GanttChart, Delete as Trash2, VolumeNotice as Volume2, VolumeMute as VolumeX } from '@icon-park/vue-next';
import { floor } from 'lodash';
import { cn } from '@/utils/ui';

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
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap gap-3.5 px-1 py-1">
    <div class="flex items-center gap-2">
      <!-- <button 
        class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group transition-all duration-300 shadow-sm"
        :class="[
          editor.sidebarRight === 'visual' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/10',
          !selected?.visible ? 'opacity-40 grayscale pointer-events-none' : ''
        ]"
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'visual' ? null : 'visual')"
      >
        <div class="relative">
          <AudioWaveform :size="16" :class="editor.sidebarRight === 'visual' ? 'text-white' : 'text-white/40 group-hover:text-white'" />
          <div v-if="!selected?.visible" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-400/80 -rotate-45" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-widest">Visual</span>
      </button> -->

      <!-- <template v-if="selected.visible">
        <ToolbarFillOption />
        <ToolbarStrokeOption />
        <ToolbarOpacityOption />
      </template> -->

      <div class="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

      <el-popover placement="bottom-start" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10" trigger="click">
        <template #reference>
          <button class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group hover:bg-white/10 hover:border-white/10 transition-all duration-300 shadow-sm">
            <Volume2 :size="16" :class="muted ? 'text-white/20' : 'text-white/40 group-hover:text-white'" class="transition-colors" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-white/70 group-hover:text-white">Volume</span>
          </button>
        </template>
        <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
            <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Audio Controls</span>
            </div>
            <div class="p-5 flex flex-col gap-5">
              <div class="flex flex-col gap-3">
                <div class="flex justify-between items-center mb-1">
                    <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Output Volume</Label>
                    <span :class="cn('text-[10px] font-bold font-mono px-1.5 rounded transition-colors', muted ? 'text-white/20 bg-white/2' : 'text-white/60 bg-white/5')">{{ muted ? 'MUTED' : volume.toFixed(0) + '%' }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <SliderInput class="flex-1" :model-value="volume" :min="0" :max="100" :step="1" :disabled="muted" @update:model-value="(value) => volume = value"/>
                  <Toggle v-model="muted" circle class="cinematic-toggle" @toggle="value => muted = value">
                    <VolumeX :size="14" />
                  </Toggle>
                </div>
              </div>
            </div>
        </div>
      </el-popover>
    </div>
    <div class="w-px h-6 bg-white/10 shrink-0 mx-1" />
    <ToolbarTimelineOption />
  </div>
</template>
