<script setup lang="ts">
import { computed, ref } from 'vue';
import { Close as X } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import CreatePrompt from './CreatePrompt.vue';
import PromptSessions from './PromptSessions.vue';

const editor = useEditorStore();
const mode = ref("edit");
console.log(editor.prompter);

const handleClose = () => {
  if (mode.value === "add") {
    mode.value = "edit";
  } else {
    editor.setActiveSidebarLeft(null);
  }
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 shrink-0">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Prompts</h2>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors" @click="handleClose">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container">
      <template v-if="!editor.prompter.hasSessions || mode === 'add'">
        <CreatePrompt />
      </template>
      <template v-else>
        <PromptSessions @create-session="mode = 'add'" />
      </template>
    </section>
  </div>
</template>
