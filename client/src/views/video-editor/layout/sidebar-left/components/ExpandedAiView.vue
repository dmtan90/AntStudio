<script setup lang="ts">
import { useEditorStore } from 'video-editor/store/editor';

const props = defineProps<{ match: string }>();

const editor = useEditorStore();


</script>

<template>
  <template v-if="match === 'voice'">
    
  </template>

  <template v-else-if="match === 'image'">
    
  </template>

  <template v-else-if="match === 'video'">
    
  </template>

  <template v-else-if="match === 'caption'">
    
  </template>
</template>
