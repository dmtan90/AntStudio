<script setup lang="ts">

import ToolbarStrokeOption from '../common/stroke.vue';
import ToolbarTimelineOption from '../common/timeline.vue';
import ToolbarOpacityOption from '../common/opacity.vue';

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap gap-3.5 px-1 py-1">
    <ToolbarStrokeOption />
    <div class="w-px h-6 bg-white/10 shrink-0 mx-1" />
    <ToolbarOpacityOption />
    <div class="w-px h-6 bg-white/10 shrink-0 mx-1" />
    <ToolbarTimelineOption />
  </div>
</template>