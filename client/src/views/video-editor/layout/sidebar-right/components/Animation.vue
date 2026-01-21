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

// const activeAnimations = ref('page');
const activeTab = ref('element');
onMounted(() => {
  activeTab.value = 'page';
  setTimeout(() => {
    activeTab.value = 'element';
  }, 100);
});

</script>

<template>
  <div class="flex flex-col h-full animation-container">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Animations</h2>
      <el-button circle :icon="X" class="ml-auto" @click="editor.setActiveSidebarRight(null)" />
    </div>
    <section class="flex flex-col sidebar-container px-4 py-4 overflow-hidden">
      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="Page" name="page">
          <PageAnimation />
        </el-tab-pane>
        <el-tab-pane label="Element" name="element">
          <ElementAnimation />
        </el-tab-pane>
      </el-tabs>
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