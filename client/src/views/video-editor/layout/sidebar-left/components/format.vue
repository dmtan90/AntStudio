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
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Formats</h2>
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
      <div class="px-4 grid grid-cols-3 gap-4 relative">
        <div v-for="format in formats" :key="format.name" class="flex flex-col gap-2">
          <button
            @click="resizeArtboard(format.dimensions)"
            class="group shrink-0 border flex items-center justify-center overflow-hidden rounded-md shadow-sm transition-colors hover:bg-card p-1.5"
          >
            <img :src="format.preview" class="object-contain h-full w-full" />
          </button>
          <span class="text-xxs text-foreground/60 text-center">{{ format.name }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
