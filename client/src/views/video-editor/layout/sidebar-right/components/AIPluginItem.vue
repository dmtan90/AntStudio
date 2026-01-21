<script setup lang="ts">
import BGRemovalPlugin from 'video-editor/components/ai/bg-removal.vue';
import VideoBgRemovalPlugin from 'video-editor/components/ai/video-bg-removal.vue';
import MagicWritePlugin from 'video-editor/components/ai/magic-write.vue';
import { type AISelectPluginProps } from './ai.vue';

// interface AISelectPluginProps {
//   plugin: string;
//   onSelectPlugin: (plugin: string, label: string) => void;
// }

const props = defineProps<AISelectPluginProps>();
</script>

<template>
  <template v-if="props.plugin === 'bg-removal'">
    <BGRemovalPlugin />
  </template>
  <template v-if="props.plugin === 'video-bg-removal'">
    <VideoBgRemovalPlugin />
  </template>
  <template v-else-if="props.plugin === 'magic-write'">
    <MagicWritePlugin />
  </template>
  <template v-else>
    <!-- Render nothing -->
  </template>
</template>
