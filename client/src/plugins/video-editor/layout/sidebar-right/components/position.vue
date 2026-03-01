<script setup lang="ts">
import { computed, ref, watch, reactive, onMounted } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, ColorFilter as Pipette, Close as X } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

import GradientSlider from 'video-editor/components/slider/gradient.vue';
import { ChromePicker, ColorResult, tinycolor } from 'vue-color';

import { darkHexCodes, lightHexCodes, pastelHexCodes } from 'video-editor/constants/editor';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { defaultFill, defaultGradient } from 'video-editor/fabric/constants';
import { cn, createInstance } from 'video-editor/lib/utils';
import { useMeasure } from 'video-editor/hooks/use-measure';
import { FabricUtils } from 'video-editor/fabric/utils';
import Arrange from './arrange.vue';
import Layers from './layers.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

watch(canvas, (value) => {
  console.log("canvas", value);
  // forceUpdate();
});

// const [containerRef, measure] = useMeasure();

const activeTab = ref('arrange');
onMounted(() => {
  activeTab.value = 'arrange';
  setTimeout(() => {
    activeTab.value = 'arrange';
  }, 100);
});

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header shrink-0">
      <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700"></div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">{{ t('videoEditor.position.title') }}</h2>
      <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10" @click="editor.setActiveSidebarRight(null)">
        <X :size="14" />
      </button>
    </div>

    <!-- Content -->
    <section class="flex-1 overflow-y-auto custom-scrollbar relative">
      <el-tabs v-model="activeTab" stretch class="h-full cinematic-tabs">
        <el-tab-pane :label="t('videoEditor.position.arrange')" name="arrange" class="h-full">
          <Arrange />
        </el-tab-pane>
        <el-tab-pane :label="t('videoEditor.position.layers')" name="layers" class="h-full">
          <Layers />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<style>
.sidebar-container {
  .el-tabs {
    .el-tab-pane{
      height: 100%;
    }
  }
}
</style>
