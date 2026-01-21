<script setup lang="ts">
import { computed } from 'vue';
import { cn } from 'video-editor/lib/utils';

const props = defineProps({
  class: { type: String, default: '' },
});

const computedClass = computed(() =>
  cn("text-sm font-medium text-gray-700 dark:text-gray-400 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", props.class)
);
</script>

<template>
  <label :class="computedClass">
    <slot />
  </label>
</template>