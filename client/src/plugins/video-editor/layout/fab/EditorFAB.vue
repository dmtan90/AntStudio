<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Delete as Trash } from '@icon-park/vue-next';

import { ElButton, ElTabs, ElTabPane } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { cn } from '@/utils/ui';

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
  <div :class="cn('absolute bottom-4 left-4 sm:bottom-8 sm:left-8 flex items-center bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 rounded-2xl p-1.5 gap-2.5 z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ring-1 ring-white/5', isPlaying ? 'pointer-events-none opacity-50 translate-y-4' : 'pointer-events-auto opacity-100 translate-y-0')">
    <!-- Page Navigation Tabs -->
    <div class="flex items-center bg-black/40 rounded-xl p-1 gap-1">
      <button 
        v-for="(_, index) in editor.pages" :key="index"
        @click="handleChangeActivePage(String(index))"
        :class="cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap', 
          editor.page === index ? 'bg-brand-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-white/40 hover:text-white hover:bg-white/5')"
      >
        P{{ index + 1 }}
      </button>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-1.5 pr-1">
      <el-button 
        @click="handleAddPage"
        :disabled="editor.pages.length >= 4"
        class="cinematic-button !h-8 !px-3 !rounded-xl !bg-brand-primary !text-white !border-transparent hover:!bg-brand-primary/90 shadow-[0_4px_12px_rgba(59,130,246,0.3)] group"
      >
        <Plus :size="14" :stroke-width="5" class="group-hover:rotate-90 transition-transform" />
        <span class="text-[10px] font-black uppercase tracking-widest mr-0.5">Add</span>
      </el-button>

      <el-button 
        :disabled="editor.pages.length === 1"
        @click="handleDeleteActivePage"
        class="cinematic-button !h-8 !w-8 !p-0 !rounded-xl !border-red-500/20 !text-red-400 hover:!bg-red-500/20 hover:!text-red-200 hover:!border-red-500/40 group"
      >
        <Trash :size="14" :stroke-width="4" class="group-hover:scale-110 group-hover:rotate-6 transition-transform" />
      </el-button>
    </div>
  </div>
</template>