<script setup lang="ts">
import { computed, watch, shallowRef, ref } from 'vue';

import DrawerRoot from 'video-editor/components/ui/drawer.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { useIsTablet } from 'video-editor/hooks/use-media-query';

import AnimationSidebar from './components/animation.vue';
import ClipMaskSidebar from './components/clip.vue';
import FillSidebar from './components/fill.vue';
import FilterSidebar from './components/filters.vue';
import FontSidebar from './components/fonts.vue';
import StrokeSidebar from './components/stroke.vue';
import AISidebar from './components/ai.vue';
import VisualSidebar from './components/visual.vue';
import PositionSidebar from './components/position.vue';

const rightSidebarWidth = '280px';

interface SidebarMapValue {
  Component: any; // Vue component
  close: (selected?: fabric.Object | null) => boolean;
}

const sidebarComponentMap: Record<string, SidebarMapValue> = {
  fill: {
    Component: FillSidebar,
    close: (selected) => !selected,
  },
  stroke: {
    Component: StrokeSidebar,
    close: (selected) => !selected,
  },
  clip: {
    Component: ClipMaskSidebar,
    close: (selected) => !selected || !(selected.type === "image" || selected.type === "gif" || selected.type === "video"),
  },
  filters: {
    Component: FilterSidebar,
    close: (selected) => !selected || !(selected.type === "image" || selected.type === "gif" || selected.type === "video"),
  },
  animation: {
    Component: AnimationSidebar,
    close: (selected) => !selected,
  },
  fonts: {
    Component: FontSidebar,
    close: (selected) => !selected || selected.type !== "textbox",
  },
  ai: {
    Component: AISidebar,
    close: (selected) => !selected || !(selected.type === "video" || selected.type === "image" || selected.type === "textbox"),
  },
  visual: {
    Component: VisualSidebar,
    close: (selected) => !selected,
  },
  position: {
    Component: PositionSidebar,
    close: (selected) => !selected,
  },
};

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);
const isTablet = useIsTablet();
// const canvas = editor.canvas;
// const selected = ref(editor.canvas.selection?.active ?? null);
// watch(canvas, () => {
//   selected.value = editor.canvas.selection?.active ?? null;
// });

// const selected = computed(() => editor.canvas.selection.active);
const sidebar = computed(() =>
  editor.sidebarRight ? sidebarComponentMap[editor.sidebarRight] : null
);

const shouldClose = computed(() => (sidebar.value ? sidebar.value.close(selected.value) : false));

watch(shouldClose, (newVal) => {
  if (newVal) {
    editor.setActiveSidebarRight(null);
  }
});

const handleDrawerClose = () => {
  editor.setActiveSidebarRight(null);
};

</script>

<template>
  <template v-if="!shouldClose">
    <template v-if="!isTablet">
      <DrawerRoot v-model="sidebar" :with-header="false" @update:open="handleDrawerClose">
        <component :is="sidebar.Component" v-if="sidebar" />
      </DrawerRoot>
    </template>

    <template v-else-if="sidebar">
      <aside :style="{ width: rightSidebarWidth }" class="overflow-hidden bg-card/75 dark:bg-gray-900/30 border-l shrink-0">
        <component :is="sidebar.Component" :key="editor.sidebarRight" />
      </aside>
    </template>
  </template>
</template>
