<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { upperFirst } from 'lodash';
import { Close as X } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";

import { defaultSpringConfig, easings, entry, exit, scene } from 'video-editor/constants/animations';

import Animations from './Animations.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);
// const animations = computed(() => );
// watch(selected, (value) => {
//   console.log("selected", value);
// })

const activeTab = ref('in');
const tabOptions = [
  {
    label: 'On Enter',
    value: 'in'
  },
  {
    label: 'Display',
    value: 'scene'
  },
  {
    label: 'On Exit',
    value: 'out'
  },
];


onMounted(() => {
  let active = "in";
  const animations = canvas.value?.anim || null;
  if(!animations){
    active = "in";
  }
  else if(animations.scene && animations.scene?.name != "none"){
    active = "scene";
  }
  else if(animations.out && animations.out?.name != "none"){
    active = "out";
  }
  else{
    active = "in";
  }

  activeTab.value = active;
});

</script>

<template>
  <div class="flex flex-col h-full">
    <section class="sidebar-container flex flex-col">
      <div class="relative pb-4">
        <el-segmented v-model="activeTab" :options="tabOptions" class="w-full" />
      </div>
      <div class="relative overflow-x-scroll scrollbar-hidden">
        <div class="flex flex-col divide-y">
          <template v-if="activeTab == 'in'">
            <Animations :animations="entry" :selected="selected" type="in" />
          </template>
          <template v-else-if="activeTab == 'out'">
            <Animations :animations="exit" :selected="selected" type="out" />
          </template>
          <template v-else>
            <Animations :animations="scene" :selected="selected" type="scene" />
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
.animation-container {
  /*.el-segmented {
    height: 32px;
    --el-border-radius-base: 16px;
  }*/
}
</style>