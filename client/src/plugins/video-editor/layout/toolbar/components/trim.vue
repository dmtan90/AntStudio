<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

import TrimToolbarVideo from './TrimToolbarVideo.vue';
import TrimToolbarAudio from './TrimToolbarAudio.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, trimmerActive } = storeToRefs(canvasStore);
const trimType = computed(() => trimmerActive.value?.type);

</script>

<template>
  <template v-if="trimType === 'video'">
    <TrimToolbarVideo />
  </template>
  <template v-else-if="trimType === 'audio'">
    <TrimToolbarAudio />
  </template>
</template>