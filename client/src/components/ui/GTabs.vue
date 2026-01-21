<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <el-tabs
    v-bind="attrs"
    :class="['g-tabs', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-tabs>
</template>

<style lang="scss" scoped>
.g-tabs {
  --el-tabs-header-height: 50px !important;
  
  :deep(.el-tabs__header) {
    margin-bottom: 24px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  }

  :deep(.el-tabs__nav-wrap) {
    &::after { display: none !important; }
  }

  :deep(.el-tabs__active-bar) {
    background: #fff !important;
    height: 2px !important;
    border-radius: 2px !important;
  }

  :deep(.el-tabs__item) {
    color: rgba(255, 255, 255, 0.5) !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    transition: all 0.3s !important;
    height: var(--el-tabs-header-height) !important;
    line-height: var(--el-tabs-header-height) !important;

    &:hover {
      color: rgba(255, 255, 255, 0.8) !important;
    }

    &.is-active {
      color: #fff !important;
    }
  }
}
</style>
