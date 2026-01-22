<script setup lang="ts">
import { computed } from 'vue';
import { Search, Close as X } from '@icon-park/vue-next';

import { fonts } from 'video-editor/constants/fonts';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

import FontItem from './FontItem.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const isFontSelected = (font: any) => {
  return selected.value?.fontFamily?.toLowerCase() === font.family.toLowerCase();
};

const handleChangeFontFamily = (font: any) => {
  canvas.value.onChangeActiveTextboxFontFamily(font.family, font);
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div
      class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header">
      <div
        class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700">
      </div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Fonts</h2>
      <button
        class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10"
        @click="editor.setActiveSidebarRight(null)">
        <X :size="14" />
      </button>
    </div>

    <!-- Content -->
    <section class="flex-1 flex flex-col relative overflow-hidden px-5 pt-6 pb-20">
      <div
        class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50">
      </div>

      <!-- Search -->
      <div class="relative mb-6">
        <el-input placeholder="SEARCH FONTS..." class="cinematic-input">
          <template #prefix>
            <Search :size="14" class="text-white/30" />
          </template>
        </el-input>
      </div>

      <!-- Font List -->
      <div class="flex-1 overflow-y-auto custom-scrollbar -mx-5 px-5">
        <div class="flex flex-col gap-1.5">
          <FontItem v-for="font in fonts" :key="font.family" :font="font" :selected="isFontSelected(font)"
            @click="handleChangeFontFamily(font)" />
        </div>
      </div>

      <!-- Bottom Fade -->
      <div
        class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-80">
      </div>
    </section>
  </div>
</template>
