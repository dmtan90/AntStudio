<template>
  <el-rate
    v-bind="attrs"
    :class="['g-rate', $attrs.class]"
  />
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-rate {
  height: auto !important;
  
  :deep(.el-rate__item) {
    .el-rate__icon {
      font-size: 20px !important;
      margin-right: 4px !important;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
      
      &.hover {
        transform: scale(1.15) !important;
      }
    }
  }

  :deep(.el-rate__text) {
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 14px !important;
    vertical-align: middle !important;
  }
}
</style>
