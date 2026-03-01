<script setup lang="ts">
import { ElIcon, ElLoading } from 'element-plus';
import { LoadingFour } from "@icon-park/vue-next";

defineProps({
  size: {
    type: String,
    default: 'default',
  },
});
</script>

<template>
  <el-icon :size="size" class="is-loading">
    <LoadingFour />
  </el-icon>
</template>
