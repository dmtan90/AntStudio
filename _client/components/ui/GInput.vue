<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <el-input
    v-bind="attrs"
    :class="['g-input', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-input>
</template>

<style lang="scss" scoped>
.g-input {
  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: none !important;
    border-radius: 8px !important;
    padding: 2px 12px !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;

    &:hover {
      border-color: rgba(255, 255, 255, 0.2) !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }

    &.is-focus {
      border-color: rgba(255, 255, 255, 0.4) !important;
      background: rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.03) !important;
    }
  }

  :deep(.el-input__inner) {
    color: #fff !important;
    font-size: 14px !important;
    &::placeholder {
      color: rgba(255, 255, 255, 0.3) !important;
    }
  }

  :deep(.el-input__prefix-inner), :deep(.el-input__suffix-inner) {
    color: rgba(255, 255, 255, 0.5) !important;
    font-size: 16px !important;
  }

  &.is-disabled {
    :deep(.el-input__wrapper) {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }
  }
}
</style>
