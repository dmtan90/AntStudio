<script setup lang="ts">
import { computed, ref } from 'vue';

import { Search, Close as X } from '@icon-park/vue-next';

import { ElButton, ElInput, ElTabs, ElTabPane } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';

import CloudTemplateContent from './CloudTemplateContent.vue';
import LocalTemplateContent from './LocalTemplateContent.vue';

const editor = useEditorStore();

const activeTab = ref('cloud');

const options = [
  {
    value: 'cloud',
    label: 'Public'
  },
  {
    value: 'local',
    label: 'Private'
  }
];

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Templates</h2>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar">
      <template v-if="editor.mode === 'creator'">
        <div class="px-5 pt-4 pb-4">
          <el-input placeholder="Search templates..." class="cinematic-input">
            <template #prefix>
              <Search :size="15" class="text-white/40" />
            </template>
          </el-input>
        </div>

        <div class="px-5 pb-4">
          <div class="flex bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner backdrop-blur-sm">
            <button v-for="opt in options" :key="opt.value" @click="activeTab = opt.value"
              class="flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all duration-500 relative overflow-hidden group"
              :class="[activeTab === opt.value ? 'text-black/70' : 'text-white/40 hover:text-white/70']">
              <div v-if="activeTab === opt.value"
                class="absolute inset-0 bg-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)] animate-in fade-in zoom-in-95 duration-300">
              </div>
              <span class="relative z-10">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 px-5 pb-10">
          <CloudTemplateContent v-if="activeTab == 'cloud'" />
          <LocalTemplateContent v-else />
        </div>
      </template>

      <template v-else-if="editor.mode === 'adapter'">
        <div class="px-5 pt-4 pb-4">
          <el-input placeholder="Search templates..." class="cinematic-input">
            <template #prefix>
              <Search :size="15" class="text-white/40" />
            </template>
          </el-input>
        </div>
        <div class="px-5 pb-10">
          <CloudTemplateContent />
        </div>
      </template>

      <template v-else>
        <div class="p-10 flex flex-col items-center justify-center text-center gap-2">
          <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <Search :size="24" class="text-white/20" />
          </div>
          <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Unknown editor mode</span>
        </div>
      </template>
    </section>
  </div>
</template>
