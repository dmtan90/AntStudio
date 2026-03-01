<template>
  <AnimatePresence mode="wait">
    <Motion v-if="status === 'pending' || status === 'uninitialized'" key="loading" :initial="{ opacity: 1 }"
      :exit="{ opacity: 0 }" :transition="{ duration: 0.5, ease: 'easeInOut' }"
      class="fixed inset-0 z-50 grid place-items-center bg-[#0a0a0c] select-none">
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

    <Motion v-else-if="status === 'complete'" key="editor" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }">
      <section class="h-[100dvh] overflow-hidden flex flex-col select-none relative bg-[#0a0a0c]">
        <!-- Full Editor UI (Hidden in Headless) -->
        <template v-if="!editor.isHeadless">
          <EditorMenubar />
          <main class="flex-1 flex w-full h-[calc(100dvh-56px)] overflow-hidden">
            <EditorSidebarLeft />
            <section class="flex-1 flex flex-col relative w-0 pb-16 sm:pb-0">
              <EditorToolbar v-if="active" />
              <div class="flex-1 relative overflow-hidden" id="workspace">
                <EditorCanvas id="shared-canvas" />
                <EditorControls />
                <EditorRecorder />
                <Toaster rich-colors :position="position" :offset="24" :visible-toasts="6" />
              </div>
              <EditorFooter />
            </section>
            <EditorSidebarRight />
          </main>
        </template>

        <!-- Headless Render UI -->
        <template v-else>
          <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0c] p-10">
            <div class="w-full max-w-lg space-y-8 animate-in">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <lightning size="24" />
                  </div>
                  <div>
                    <h2 class="text-xl font-black text-white uppercase tracking-tight">Quick Render</h2>
                    <p class="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">Autonomous Marketing Engine</p>
                  </div>
                </div>
                <div class="text-right">
                   <span class="text-2xl font-black text-white">{{ Math.round(editor.progress * 100) }}%</span>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  class="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  :style="{ width: `${editor.progress * 100}%` }"
                ></div>
              </div>

              <div class="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">
                <span>{{ editor.exportStatusText }}</span>
                <span>Do not close this window</span>
              </div>

              <!-- Hidden Workspace for Rendering -->
              <div class="opacity-0 pointer-events-none absolute" 
                   :style="{ width: (editor.dimension?.width || 1920) + 'px', height: (editor.dimension?.height || 1080) + 'px' }">
                 <EditorCanvas id="shared-canvas" />
                 <EditorRecorder />
              </div>
            </div>
          </div>
        </template>
        <AIPromptModal />
        <EditorPreviewModal />
        <KeyboardShortcutsPanel />
        <ExportDialog ref="exportDialogRef" />
      </section>
    </Motion>

    <Motion v-else key="error" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }">
      <section class="h-[100dvh] grid place-items-center bg-[#0a0a0c]">
        <div class="flex flex-col items-center gap-2">
          <span class="text-base font-medium text-destructive">Unable to load editor</span>
          <span class="text-sm text-muted-foreground">Your browser might not be supported</span>
        </div>
      </section>
    </Motion>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { computed, watch, ref, onBeforeUnmount } from 'vue';
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
import { Lightning } from '@icon-park/vue-next';
import { useKeyboardShortcuts } from 'video-editor/composables/useKeyboardShortcuts';
import { useProjectNotifications } from '@/composables/useProjectNotifications';

const editor = useEditorStore();
const { status, pages, timelineOpen, sidebarRight, id: projectId } = storeToRefs(editor);
const canvasStore = useCanvasStore();
canvasStore.registerEvents();
const { selectionActive: active } = storeToRefs(canvasStore);
const isTablet = useIsTablet();
useInitializeEditor();

// Enable live notifications for the project
useProjectNotifications(projectId.value);

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

onBeforeUnmount(() => {
  console.log("Editor.vue: onBeforeUnmount - destroying editor and resetting stores");
  editor.destroy();
  editor.$reset();
  canvasStore.$reset();
});
</script>
