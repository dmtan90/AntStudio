<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, markRaw, nextTick } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import EditorActivityIndicator from './EditorActivityIndicator.vue';
import Ruler from './Ruler.vue';
import { cn } from '@/utils/ui';
import { useCanvasStore } from 'video-editor/store/canvas';
import { fabric } from 'fabric';
import { storeToRefs } from "pinia";
import { createInstance } from "video-editor/lib/utils";

// Singleton component, ID is irrelevant but kept for compatibility if needed
const props = defineProps({
  id: {
    type: String,
    required: false,
  },
});

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const refCanvas = ref<HTMLCanvasElement | null>(null);
const container = ref<HTMLDivElement | null>(null);

// We need to track the local Fabric instance that stays alive
let fabricInstance: fabric.Canvas | null = null;
const { page, pages } = storeToRefs(editor);

/* 
  Shared Canvas Logic:
  1. Initialize ONE fabric.Canvas on mount.
  2. When 'page' changes, unmount old scene, mount new scene.
*/

onMounted(() => {
  console.log("EditorCanvas: Mounted Shared Canvas");

  if (refCanvas.value && container.value) {
    // Initialize the shared Fabric instance
    const workspaceWidth = container.value.offsetWidth;
    const workspaceHeight = container.value.offsetHeight;

    const canvasOptions = {
      width: workspaceWidth,
      height: workspaceHeight,
      backgroundColor: "#F0F0F0",
      stateful: true,
      centeredRotation: true,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
      controlsAboveOverlay: true
    };

    fabricInstance = markRaw(createInstance(fabric.Canvas, refCanvas.value, canvasOptions));

    // Initial Mount of current page
    const activePage = editor.pages[editor.page];
    if (activePage) {
      activePage.mount(fabricInstance, container.value);
      // Ensure store refs updated
      canvasStore.updateRefs();
    }
  }
});

// Watch for Page Switching
watch(page, (newItem, oldItem) => {
  if (newItem === oldItem) return;
  console.log("Switching Scene:", oldItem, "->", newItem);

  // Unmount Old
  if (oldItem !== undefined && editor.pages[oldItem]) {
    editor.pages[oldItem].unmount();
  }

  // Mount New
  const newPage = editor.pages[newItem];
  if (newPage && fabricInstance && container.value) {
    newPage.mount(fabricInstance, container.value);
    canvasStore.updateRefs();
  }
});

const pending = computed(() => {
  // If we are switching, we might want to show loading
  const activeInfo = editor.pages[editor.page];
  return activeInfo?.template?.pending ?? false;
});

const resizeObserver = new ResizeObserver((entries) => {
  try {
    // Update layout on resize
    const activePage = editor.pages[editor.page];
    if (activePage && activePage.workspace) {
      const zoom = entries.length > 0 ? entries[0].contentRect.height / activePage.workspace.height : 1;
      activePage.workspace.changeZoom(zoom);
      // Also update dimensions of fabric instance to match container
      if (fabricInstance && container.value) {
        fabricInstance.setDimensions({ width: container.value.offsetWidth, height: container.value.offsetHeight });
      }
    }
  } catch (error) {
    console.warn("Resize error", error);
  }
});

watch(container, (el) => {
  if (el) {
    resizeObserver.observe(el);
  }
});

onUnmounted(() => {
  resizeObserver.disconnect();
  // Cleanup the shared instance
  if (fabricInstance) {
    fabricInstance.dispose();
    fabricInstance = null;
  }
});

</script>

<template>
  <div ref="container" class="absolute inset-0 w-full h-full z-10 opacity-100"
    :class="{ 'pl-5 pt-5': canvasStore.showRulers }">
    <canvas ref="refCanvas" />
    <EditorActivityIndicator :pending="pending" />

    <!-- Rulers Overlay (Global) -->
    <template v-if="canvasStore.showRulers">
      <!-- Corner Box -->
      <div
        class="absolute top-0 left-0 w-5 h-5 bg-[#18181b] border-r border-b border-white/10 z-20 pointer-events-auto">
      </div>

      <!-- Horizontal Ruler -->
      <div class="absolute top-0 left-5 right-0 h-5 z-20 bg-[#18181b] border-b border-white/10">
        <Ruler type="horizontal" />
      </div>

      <!-- Vertical Ruler -->
      <div class="absolute top-5 left-0 bottom-0 w-5 z-20 bg-[#18181b] border-r border-white/10">
        <Ruler type="vertical" />
      </div>
    </template>
  </div>
</template>