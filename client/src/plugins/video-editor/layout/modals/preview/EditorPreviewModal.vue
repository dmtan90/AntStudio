<script setup lang="ts">
import { computed } from 'vue';
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
    class="cinematic-dialog preview-dialog !p-0 overflow-hidden"
    @close="handleClose"
    width="1000px"
    destroy-on-close
  >
    <PreviewModalContent />
  </el-dialog>
</template>
