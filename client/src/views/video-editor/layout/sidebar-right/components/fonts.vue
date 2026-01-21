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
  <div class="flex flex-col h-full">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Fonts</h2>
      <el-button circle :icon="X" class="ml-auto" @click="editor.setActiveSidebarRight(null)" />
    </div>
    <section class="sidebar-container flex flex-col px-4 py-4">
      <div class="relative pb-4">
        <el-input placeholder="Search..." class="text-xs" >
          <template #prefix>
            <Search :size="15" />
          </template>
        </el-input>
      </div>
      <div class="relative overflow-x-scroll scrollbar-hidden">
        <div class="flex flex-col gap-1">
          <FontItem v-for="font in fonts" :key="font.family" :font="font" :selected="isFontSelected(font)" @click="handleChangeFontFamily(font)" />
        </div>
      </div>
    </section>
  </div>
</template>
