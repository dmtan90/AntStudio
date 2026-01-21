<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { Down as ChevronDown, Timeline as GanttChart, Layers, Send } from '@icon-park/vue-next';
import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { cn } from 'video-editor/lib/utils';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selection, selectionActive: active, timeline, audio } = storeToRefs(canvasStore);
const offsetMs = computed(() => active.value?.meta?.offset ?? active.value.offset*1000 ?? 0);
const durationMs = computed(() => active.value?.meta?.duration ?? active.value.timeline*1000 ?? 0);
const durationInSecond = computed({
  get(){
    return durationMs.value! / 1000;
  },

  set(value){
    if(!active.value?.type){
      audio.value.update(active.value?.id, { duration: value });
    }
    else{
      canvas.value.onChangeActiveObjectTimelineProperty('duration', value * 1000);  
    }
  }
});

const offsetInSecond = computed({
  get(){
    return offsetMs.value! / 1000;
  },

  set(value){
    if(!active.value?.type){
      audio.value.update(active.value?.id, { offset: value });
    }
    else{
      canvas.value.onChangeActiveObjectTimelineProperty('offset', value * 1000);  
    }
  }
});

const activeAnim = computed({
  get(){
    let state = false;
    if((active.value?.anim && active.value?.anim?.in?.name != "none" || active.value?.anim?.out?.name != "none" || active.value?.anim?.scene?.name != "none")){
      state = true;
    }
    return state;
  }
});

watch([selection,active], (value) => {
  console.log(value);
});

onMounted(() => {
  console.log(selection.value);
});
</script>

<template>
  <div class="flex items-center">
    <el-button v-if="active && active.type != 'audio'"
      :icon="Send" text bg round
      :type="!activeAnim ? '' : 'primary'"
      :disabled="editor.sidebarRight === 'animation'"
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'animation' ? null : 'animation')"
      :class="cn('px-2.5')"
    >
      <span>Animate</span>
    </el-button>
    <el-button
      :icon="Layers" text bg round
      :disabled="editor.sidebarRight === 'position'"
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'position' ? null : 'position')"
      :class="cn('px-2.5')"
    >
      <span>Position</span>
    </el-button>
    <el-popover placement="bottom-end" trigger="click" width="250px">
      <template #reference>
        <el-button :icon="GanttChart" text bg round class="px-2.5">
          <span>Timeline</span>
        </el-button>
      </template>
      <span class="text-xs font-normal">Duration (s)</span>
      <SliderInput :model-value="durationInSecond" :min="1" :max="timeline.duration / 1000" :step="0.25" @update:model-value="(value) => durationInSecond = value"/>
      <span class="text-xs font-normal">Offset (s)</span>
      <SliderInput :model-value="offsetInSecond" :min="0" :max="timeline.duration / 1000" :step="0.25" @update:model-value="(value) => offsetInSecond = value"/>
    </el-popover>
  </div>
</template>