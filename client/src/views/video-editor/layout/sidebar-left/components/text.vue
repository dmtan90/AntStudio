<script setup lang="ts">
import { Search, Close as X } from '@icon-park/vue-next';

import { ElButton, ElInput } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { defaultFont } from 'video-editor/constants/fonts';

const editor = useEditorStore();

const handleAddTitle = () => {
  editor.canvas.onAddText("Your title goes here", defaultFont, 64, 700);
};

const handleAddHeading = () => {
  editor.canvas.onAddText("Your heading goes here", defaultFont, 42, 700);
};

const handleAddParagraph = () => {
  editor.canvas.onAddText("Your paragraph goes here", defaultFont, 24, 400);
};
</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Text</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <section class="sidebar-container pb-4">
      <div class="px-3 pt-4 pb-6">
        <el-input placeholder="Search..." class="text-xs" >
          <template #prefix>
            <Search :size="15" class="text-foreground/60" />
          </template>
        </el-input>
      </div>
      <div class="px-3 flex flex-col gap-6">
        <div class="flex flex-col gap-4">
          <h4 class="text-xs font-semibold line-clamp-1">Basic Texts</h4>
          <div class="flex flex-col gap-3">
            <button @click="handleAddTitle" class="h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-2xl font-semibold text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Add a Title</span>
            </button>
            <button @click="handleAddHeading" class="ml-0 h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-lg font-semibold text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Add a Heading</span>
            </button>
            <button @click="handleAddParagraph" class="ml-0 h-16 border flex items-center justify-center overflow-hidden rounded-md px-3 text-sm font-normal text-center transition-colors shadow-sm hover:bg-card">
              <span class="line-clamp-1">Add a Paragraph</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
