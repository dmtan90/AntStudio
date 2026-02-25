<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Close as X } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";

import AIPluginItems from './AIPluginItems.vue';
import AIPluginItem from './AIPluginItem.vue';

export interface AISelectPluginProps {
  plugin: string;
  onSelectPlugin: (plugin: string, label: string) => void;
}

const pluginState = (selection?: any) => {
  if (selection?.type === "textbox" && selection.meta?.placeholder && selection.meta?.label) return { label: `Magic Write`, value: "magic-write" };
  return { label: "", value: "" };
};

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const label = ref(pluginState(selected.value).label);
const plugin = ref(pluginState(selected.value).value);

watch(selected, (newSelected) => {
  const state = pluginState(newSelected);
  label.value = state.label;
  plugin.value = state.value;
});

const handleSelectPlugin = (selectedPlugin: string, selectedLabel: string) => {
  label.value = selectedLabel;
  plugin.value = selectedPlugin;
};

const handleClosePlugin = () => {
  plugin.value = "";
  label.value = "";
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <template v-if="!plugin">
      <!-- Header -->
      <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header shrink-0">
        <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700"></div>
        <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">AI Magic</h2>
        <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10" @click="editor.setActiveSidebarRight(null)">
          <X :size="14" />
        </button>
      </div>
      <!-- Content -->
      <section class="flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20">
        <div class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50"></div>
        <AIPluginItems :on-select-plugin="handleSelectPlugin" />
        <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-80"></div>
      </section>
    </template>
    <template v-else>
      <!-- Plugin Header -->
      <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header">
        <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700"></div>
        <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">{{ label }}</h2>
        <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 relative z-10" @click="handleClosePlugin">
          <X :size="14" />
        </button>
      </div>
      <!-- Plugin Content -->
      <section class="flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20">
         <div class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50"></div>
        <AIPluginItem :plugin="plugin" :on-select-plugin="handleSelectPlugin" />
        <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-80"></div>
      </section>
    </template>
  </div>
</template>
