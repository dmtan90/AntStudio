<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { upperFirst } from 'lodash';
import { Close as X } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";

import { defaultSpringConfig, easings, entry, exit, scene } from 'video-editor/constants/animations';

import Animations from './Animations.vue';
import PageAnimation from './PageAnimation.vue';
import ElementAnimation from './ElementAnimation.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);
// const animations = computed(() => );
watch(selected, (value) => {
  console.log("selected", value);
})

const activeAnimations = ref('page');
const activeTab = ref('in');
const tabOptions = [
  {
    label: 'On Enter',
    value: 'in'
  },
  {
    label: 'On Display',
    value: 'scene'
  },
  {
    label: 'On Exit',
    value: 'out'
  },
];


onMounted(() => {
  let active = "in";
  const animations = selected.value?.animations || null;
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

  nextTick(() => {
    activeTab.value = active;
  })
});

</script>

<template>
  <div class="h-full w-full @container animation-container">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Animations</h2>
      <el-button plain circle class="bg-card h-7 w-7 ml-auto" @click="editor.setActiveSidebarRight(null)">
        <X :size="15" />
      </el-button>
    </div>
    <section class="sidebar-container">
      <div class="px-4 py-4">
        <el-segmented v-model="activeTab" :options="tabOptions" size="small" class="w-full" />
      </div>
      <div class="px-4 flex flex-col divide-y">
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
    </section>
  </div>
</template>

<style>
.animation-container {
  .el-segmented {
    height: 32px;
    --el-border-radius-base: 16px;
  }
}
</style>