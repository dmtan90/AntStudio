<script setup lang="ts">
import { computed } from 'vue';
import { ElDialog, ElButton } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';

import PreviewModalContent from './PreviewModalContent.vue';

const editor = useEditorStore();

const preview = computed(() => editor.preview);

const handleClose = () => {
  editor.onTogglePreviewModal('close');
};

</script>

<template>
  <el-dialog
    :model-value="preview"
    title="Preview Modal"
    @close="handleClose"
    width="80%"
  >
    <PreviewModalContent />
  </el-dialog>
</template>
