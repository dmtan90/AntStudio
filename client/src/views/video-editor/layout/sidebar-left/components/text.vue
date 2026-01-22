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
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Text</h2>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="px-5 pt-4 pb-4 border-b border-white/5">
        <el-input placeholder="Search typography..." class="cinematic-input">
          <template #prefix>
            <Search :size="15" class="text-white/40" />
          </template>
        </el-input>
      </div>
      <div class="px-5 flex flex-col gap-6 pt-6">
        <div class="flex flex-col gap-4">
          <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Basic Texts</h4>
          <div class="flex flex-col gap-3">
            <button @click="handleAddTitle" class="h-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl px-3 text-2xl font-bold text-white/90 transition-all duration-300 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/5 active:scale-[0.98]">
              <span class="line-clamp-1">Add a Title</span>
            </button>
            <button @click="handleAddHeading" class="h-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl px-3 text-lg font-bold text-white/70 transition-all duration-300 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/5 active:scale-[0.98]">
              <span class="line-clamp-1">Add a Heading</span>
            </button>
            <button @click="handleAddParagraph" class="h-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl px-3 text-sm font-bold text-white/40 transition-all duration-300 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/5 active:scale-[0.98]">
              <span class="line-clamp-1">Add a Paragraph</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

