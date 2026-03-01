<template>
  <div v-if="pending" class="absolute inset-0 z-10 grid place-items-center pointer-events-none">
    <Spinner class="h-12 w-12 stroke-card" />
  </div>
</template>

<script setup lang="ts">
import Spinner from 'video-editor/components/ui/spinner.vue';

const props = defineProps({
  pending: {
    type: Boolean,
    required: true,
  },
});
</script>

<style scoped>
/* Scoped styles for EditorActivityIndicator */
</style>
