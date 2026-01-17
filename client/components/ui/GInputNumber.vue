<template>
  <el-input-number
    v-bind="attrs"
    :class="['g-input-number', $attrs.class]"
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
.g-input-number {
  width: 100% !important;

  :deep(.el-input-number__decrease), :deep(.el-input-number__increase) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: none !important;
    color: #fff !important;
    transition: all 0.2s !important;
    
    &:hover:not(.is-disabled) {
      background: rgba(255, 255, 255, 0.1) !important;
    }
    
    &.is-disabled {
      opacity: 0.3 !important;
    }

    > i {
      font-size: 14px !important;
    }
  }

  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: none !important;
    padding-left: 40px !important;
    padding-right: 40px !important;

    &.is-focus {
      border-color: rgba(255, 255, 255, 0.3) !important;
    }
  }

  :deep(.el-input__inner) {
    color: #fff !important;
  }
}
</style>
