<template>
  <AnimatePresence mode="wait">
    <Motion v-if="status === 'pending' || status === 'uninitialized'" key="loading" :initial="{ opacity: 1 }"
      :exit="{ opacity: 0 }" :transition="{ duration: 0.5, ease: 'easeInOut' }"
      class="fixed inset-0 z-50 grid place-items-center bg-[#0a0a0a] select-none">
      <div class="flex flex-col gap-4 items-center">
        <Motion :initial="{ scale: 0.9, opacity: 0 }" :animate="{ scale: 1, opacity: 1 }"
          :transition="{ duration: 0.5, ease: 'easeOut' }" class="relative flex items-center justify-center">
          <div class="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Spinner size="lg" class="text-primary relative z-10" />
        </Motion>
        <Motion :initial="{ y: 10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ delay: 0.2, duration: 0.5 }" class="flex flex-col items-center gap-1">
          <span class="text-base font-medium text-foreground tracking-wide">Initializing Studio</span>
          <span class="text-xs text-muted-foreground">Preparing your workspace...</span>
        </Motion>
      </div>
    </Motion>

    <template v-else-if="status === 'complete'">
      <section key="editor" class="h-[100dvh] overflow-hidden flex flex-col select-none relative bg-[#0a0a0a]">
        <EditorMenubar />
        <main class="flex-1 flex w-full h-[calc(100dvh-56px)]">
          <EditorSidebarLeft />
          <section class="flex-1 flex flex-col relative w-0 pb-16 sm:pb-0">
            <EditorToolbar v-if="active" />
            <div class="flex-1 relative overflow-hidden" id="workspace">
              <template v-for="(page, index) in pages" :key="page.id">
                <EditorCanvas :id="page.id" />
              </template>
              <EditorControls />
              <EditorRecorder />
              <Toaster rich-colors :position="position" :offset="24" :visible-toasts="6" />
            </div>
            <EditorFooter />
          </section>
          <EditorSidebarRight />
        </main>
        <AIPromptModal />
        <EditorPreviewModal />
        <KeyboardShortcutsPanel />
        <ExportDialog ref="exportDialogRef" />
      </section>
    </template>

    <template v-else>
      <section key="error" class="h-[100dvh] grid place-items-center bg-[#0a0a0a]">
        <div class="flex flex-col items-center gap-2">
          <span class="text-base font-medium text-destructive">Unable to load editor</span>
          <span class="text-sm text-muted-foreground">Your browser might not be supported</span>
        </div>
      </section>
    </template>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { useInitializeEditor } from 'video-editor/hooks/use-initialize';
import { storeToRefs } from "pinia"
import { Motion, AnimatePresence } from 'motion-v'

import EditorFAB from 'video-editor/layout/fab/EditorFAB.vue';
import EditorFooter from 'video-editor/layout/footer/EditorFooter.vue';
import EditorMenubar from 'video-editor/layout/menubar/EditorMenubar.vue';
import EditorToolbar from 'video-editor/layout/toolbar/EditorToolbar.vue';

import EditorSidebarLeft from 'video-editor/layout/sidebar-left/EditorSidebarLeft.vue';
import EditorSidebarRight from 'video-editor/layout/sidebar-right/EditorSidebarRight.vue';
import EditorPreviewModal from 'video-editor/layout/modals/preview/EditorPreviewModal.vue';
import AIPromptModal from 'video-editor/layout/modals/prompter/AIPromptModal.vue';

import Toaster from 'video-editor/components/ui/sonner.vue';
import EditorCanvas from 'video-editor/components/editor/EditorCanvas.vue';
import EditorRecorder from 'video-editor/components/editor/EditorRecorder.vue';
import EditorControls from 'video-editor/layout/controls/EditorControls.vue';
import Spinner from 'video-editor/components/ui/spinner.vue';
import KeyboardShortcutsPanel from 'video-editor/layout/modals/KeyboardShortcutsPanel.vue';
import ExportDialog from 'video-editor/layout/modals/ExportDialog.vue';
import { useKeyboardShortcuts } from 'video-editor/composables/useKeyboardShortcuts';

const editor = useEditorStore();
const { status, pages, timelineOpen, sidebarRight } = storeToRefs(editor);
const canvasStore = useCanvasStore();
canvasStore.registerEvents();
const { selectionActive: active } = storeToRefs(canvasStore);
const isTablet = useIsTablet();
useInitializeEditor();

// Initialize keyboard shortcuts
const exportDialogRef = ref<InstanceType<typeof ExportDialog> | null>(null);
const { shortcuts, showShortcutsPanel } = useKeyboardShortcuts();

// Provide export dialog ref to keyboard shortcuts
watch(exportDialogRef, (dialog) => {
  if (dialog && (window as any).__exportDialog === undefined) {
    (window as any).__exportDialog = dialog;
  }
});

const pageSize = computed(() => pages.value?.length || 0);
// watch([status, pageSize, pages], (value) => {
//   console.log("status", value)
// }, { deep: true, immediate: true })
// const position = ref("bottom-right");

const position = computed(() => (isTablet ? 'bottom-right' : 'top-center'));
// const editorStatus = computed(() => status);

// watch(active, (value) => {
//   console.log("editorStatus", value);
// });
// console.log("editor", editor);
// editor.$subscribe((mutation, state) => {
//   console.log("editor", mutation, state);
// })
// watch(editor, (value) => {
//   console.log("editor", value);
// }, { immediate: true });
</script>
