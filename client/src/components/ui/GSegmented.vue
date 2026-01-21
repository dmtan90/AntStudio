<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <el-segmented
    v-bind="attrs"
    :class="['g-segmented', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-segmented>
</template>

<style lang="scss" scoped>
.g-segmented {
  --el-segmented-height: 40px !important;
  --el-segmented-bg-color: rgba(255, 255, 255, 0.05) !important;
  --el-segmented-item-selected-bg-color: #fff !important;
  --el-segmented-item-selected-color: #000 !important;
  --el-segmented-item-hover-bg-color: rgba(255, 255, 255, 0.1) !important;
  --el-segmented-item-hover-color: #fff !important;
  --el-segmented-border-radius: 20px !important;

  background: var(--el-segmented-bg-color) !important;
  backdrop-filter: blur(10px) !important;
  padding: 4px !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  height: var(--el-segmented-height) !important;
  border-radius: var(--el-segmented-border-radius) !important;

  :deep(.el-segmented__item) {
    border-radius: var(--el-segmented-border-radius) !important;
    color: rgba(255, 255, 255, 0.6) !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    font-weight: 500 !important;

    &.is-selected {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      color: var(--el-segmented-item-selected-color) !important;
    }
  }

  :deep(.el-segmented__item-selected) {
    border-radius: var(--el-segmented-border-radius) !important;
  }
}
</style>
