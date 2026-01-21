<script setup lang="ts">
import { computed } from 'vue';
import { ExcludeSelection as Blend, Movie as Clapperboard, Selected as Crop, MagicWand as Wand, Down as ChevronDown, Timeline as GanttChart, VolumeNotice as Volume2, VolumeMute as VolumeX } from '@icon-park/vue-next';

// import { ElButton, ElDivider } from 'element-plus';

import { cn } from 'video-editor/lib/utils';
import { FabricUtils } from 'video-editor/fabric/utils';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

import ToolbarStrokeOption from '../common/stroke.vue';
import ToolbarTimelineOption from '../common/timeline.vue';
import ToolbarOpacityOption from '../common/opacity.vue';
import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import Toggle from 'video-editor/components/ui/toggle.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected, trimmer, instance, cropper } = storeToRefs(canvasStore);
// const activeObject = computed(() => instance.value?.getActiveObject());

const handleTrimStart = () => {
  const video = instance.value?.getActiveObject();
  if (!FabricUtils.isVideoElement(video)) return;
  trimmer.value.start();
};

const volume = computed({
  get(){
    return selected.value?.volume! * 100;
  },

  set(value){
    canvas.value.onChangeActiveObjectProperty('volume', value / 100);
  }
});

const duration = computed({
  get(){
    return floor(selected.value?.meta?.duration! / 1000, 2);
  },

  set(value){
    // audio.value.update(selected.value?.id, { timeline: value })
    // audio.value.update(selected.value?.name, { timeline: value })
    canvas.value.onChangeActiveObjectTimelineProperty('duration', value * 1000);
  }
});

const offset = computed({
  get(){
    return floor(selected.value?.meta.offset/1000, 2);
    // return (selected.value?.meta.offset / 1000);
  },

  set(value){
    // audio.value.update(selected.value?.id, { offset: value })
    // audio.value.update(selected.value?.name, { offset: value })
    canvas.value.onChangeActiveObjectTimelineProperty('offset', value * 1000);
  }
});

const muted = computed({
  get(){
    return selected.value?.muted || selected.value?.volume == 0;
  },

  set(value){
    // audio.value.update(selected.value.id, { muted: value })
    // audio.value.update(selected.value.name, { muted: value })
    canvas.value.onChangeActiveObjectProperty('muted', value);
  }
});

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden">
    <div class="flex items-center">
      <el-button :icon="Crop" text bg round @click="cropper.cropActiveObject()">Crop</el-button>
      <template v-if="selected && selected.hasAudio">
        <el-popover placement="bottom-start" trigger="click" width="250px">
          <template #reference>
            <el-button :icon="Volume2" text bg round>Volume</el-button>
          </template>
          <Label class="text-xs font-medium">Volume (%)</Label>
          <div class="flex items-center justify-between">
            <SliderInput :model-value="volume" :min="0" :max="100" :step="10" :disabled="muted" @update:model-value="(value) => volume = value"/>
            <Toggle v-model="muted" circle class="ml-1" @toggle="value => muted = value">
              <VolumeX :size="15" />
            </Toggle>
          </div>
        </el-popover>
      </template>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <ToolbarStrokeOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarOpacityOption />
    <el-divider direction="vertical" class="h-8" />
    <div class="flex items-center">
      <el-button :icon="Wand"
          @click="editor.setActiveSidebarRight(editor.sidebarRight === 'filters' ? null : 'filters')"
          text bg round
          :type="!selected?.filters?.length ? '' : 'primary'"
          :disabled="editor.sidebarRight === 'filters'"
          :class="cn('')"
      >
        <span>Filter</span>
      </el-button>
      <el-button :icon="Blend" 
        text bg round 
        :type="!selected?.clipPath ? '' : 'primary'"
        :disabled="editor.sidebarRight === 'clip'"
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'clip' ? null : 'clip')" >
        <span>Mask</span>
      </el-button>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <ToolbarTimelineOption />
  </div>
</template>
