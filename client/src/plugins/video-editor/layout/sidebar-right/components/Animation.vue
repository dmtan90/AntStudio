<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { upperFirst } from 'lodash';
import { Close as X } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";

import { defaultSpringConfig, easings, entry, exit, scene } from 'video-editor/constants/animations';

import Animations from './Animations.vue';
import PageAnimation from './PageAnimation.vue';
import ElementAnimation from './ElementAnimation.vue';

const { t } = useI18n();
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
  <div class="flex flex-col h-full cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group shrink-0">
      <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">{{ t('videoEditor.animation.title') }}</h2>
      <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10" @click="editor.setActiveSidebarRight(null)">
        <X :size="14" />
      </button>
    </div>

    <!-- Tabs Content -->
    <section class="flex-1 overflow-hidden">
      <el-tabs v-model="activeTab" stretch class="h-full cinematic-tabs">
        <el-tab-pane :label="t('videoEditor.animation.page')" name="page" class="h-full">
          <PageAnimation />
        </el-tab-pane>
        <el-tab-pane :label="t('videoEditor.animation.element')" name="element" class="h-full">
          <ElementAnimation />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>
<style scoped>
/* Scoped styles if needed */
</style>