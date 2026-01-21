<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Delete as Trash } from '@icon-park/vue-next';

import { ElButton, ElTabs, ElTabPane } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { cn } from 'video-editor/lib/utils';

const editor = useEditorStore();

const handleAddPage = () => {
  editor.addPage();
};

const handleDeleteActivePage = () => {
  editor.deleteActivePage();
};

const handleChangeActivePage = (value: string) => {
  editor.onChangeActivePage(parseInt(value));
};

const isPlaying = computed(() => editor.canvas.timeline?.playing);

</script>

<template>
  <div :class="cn('absolute bottom-3 left-3 sm:bottom-6 sm:left-6 flex-row-reverse items-center gap-2.5 z-20', isPlaying ? 'pointer-events-none opacity-50' : 'pointer-events-auto opacity-100')">
    <el-tabs :model-value="String(editor.page)" @tab-change="handleChangeActivePage" type="card">
      <el-tab-pane v-for="(_, index) in editor.pages" :key="index" :name="String(index)" :label="`Page ${index + 1}`" />
    </el-tabs>
    <el-button type="primary" text bg round
      @click="handleAddPage"
      :disabled="editor.pages.length > 3"
      class="text-xs rounded-lg shadow-sm gap-1.5 border bg-card dark:bg-primary border-primary text-primary dark:text-black hover:bg-primary dark:hover:bg-blue-primary/90 hover:text-white"
    >
      <Plus :size="15" />
      <span class="font-medium">Add</span>
    </el-button>
    <el-button type="danger" text bg round
      :disabled="editor.pages.length === 1"
      @click="handleDeleteActivePage"
      class="h-9 w-9 shadow-sm border bg-card border-destructive dark:bg-destructive text-destructive dark:text-white hover:bg-destructive dark:hover:bg-blue-destructive/90 hover:text-white"
    >
      <Trash :size="15" />
    </el-button>
  </div>
</template>