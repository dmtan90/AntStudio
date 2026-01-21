<script setup lang="ts">

import ToolbarFillOption from '../common/fill.vue';
import ToolbarStrokeOption from '../common/stroke.vue';
import ToolbarTimelineOption from '../common/timeline.vue';
import ToolbarOpacityOption from '../common/opacity.vue';

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden">
    <ToolbarFillOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarStrokeOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarOpacityOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarTimelineOption />
  </div>
</template>