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
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Prompts</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="handleClose">
        <X :size="16" />
      </el-button>
    </div>
    <template v-if="!editor.prompter.hasSessions || mode === 'add'">
      <CreatePrompt />
    </template>
    <template v-else>
      <PromptSessions @create-session="mode = 'add'" />
    </template>
  </div>
</template>
