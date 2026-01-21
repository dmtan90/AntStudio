<script setup lang="ts">
import { computed } from 'vue';
import { ElDialog } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';

const editor = useEditorStore();

const prompterModal = computed(() => editor.prompter.modal);

const handleClose = () => {
  (editor.prompter as any).onToggleModal(false);
};

</script>

<template>
  <el-dialog
    :model-value="prompterModal"
    title="AI Prompter"
    @close="handleClose"
    width="80%"
  >
    <!-- Content for the AI Prompt Modal will go here -->
  </el-dialog>
</template>
