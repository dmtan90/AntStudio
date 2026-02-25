<script setup lang="ts">
import { computed, ref } from 'vue';

import { Search, Close as X } from '@icon-park/vue-next';

import { ElButton, ElInput } from 'element-plus';

import { formats } from 'video-editor/constants/editor';
import { useEditorStore } from 'video-editor/store/editor';

const editor = useEditorStore();

const resizeArtboard = (dimensions: { width: number; height: number }) => {
  editor.canvas.workspace.resizeArtboard(dimensions);
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 shrink-0">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Formats</h2>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container">
      <div class="px-5 pt-4 pb-4 border-b border-white/5">
        <el-input placeholder="Search formats..." class="cinematic-input">
          <template #prefix>
            <Search :size="15" class="text-white/40" />
          </template>
        </el-input>
      </div>
      <div class="px-5 grid grid-cols-2 gap-4 pt-6 pb-10">
        <div v-for="format in formats" :key="format.name" class="flex flex-col gap-2 group">
          <button
            @click="resizeArtboard(format.dimensions)"
            class="h-28 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/5 p-3"
          >
            <img :src="format.preview" class="object-contain h-full w-full opacity-60 group-hover:opacity-100 transition-all duration-300" />
          </button>
          <span class="text-[10px] font-bold text-white/40 text-center uppercase tracking-widest group-hover:text-white transition-colors">{{ format.name }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
