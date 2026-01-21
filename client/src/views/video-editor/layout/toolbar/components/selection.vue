<script setup lang="ts">
import { Mask as Blend } from '@icon-park/vue-next';
import { ElButton } from 'element-plus';

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden">
    <el-button :icon="Blend" plain class="px-2.5">
      <span>Combine</span>
    </el-button>
  </div>
</template>