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
  <div class="flex flex-col h-full">
    <template v-if="!plugin">
      <div class="flex items-center h-14 border-b px-4 gap-2.5">
        <h2 class="font-semibold">AI Magic</h2>
        <el-button circle :icon="X" class="ml-auto" @click="editor.setActiveSidebarRight(null)" />
      </div>
      <section class="sidebar-container px-4 py-4">
        <AIPluginItems :on-select-plugin="handleSelectPlugin" />
      </section>
    </template>
    <template v-else>
      <div class="flex items-center h-14 border-b px-4 gap-2.5">
        <h2 class="font-semibold">{{ label }}</h2>
        <el-button circle :icon="X" class="ml-auto" @click="handleClosePlugin" />
      </div>
      <section class="sidebar-container px-4 py-4">
        <AIPluginItem :plugin="plugin" :on-select-plugin="handleSelectPlugin" />
      </section>
    </template>
  </div>
</template>
