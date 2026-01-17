<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <el-switch
    v-bind="attrs"
    :class="['g-switch', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-switch>
</template>

<style lang="scss" scoped>
.g-switch {
  --el-switch-on-color: #4ade80 !important;
  --el-switch-off-color: rgba(255, 255, 255, 0.1) !important;
  
  :deep(.el-switch__core) {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    
    .el-switch__action {
      background-color: #fff !important;
    }
  }

  &.is-checked {
    :deep(.el-switch__core) {
      background-color: var(--el-switch-on-color) !important;
      border-color: var(--el-switch-on-color) !important;
    }
  }
}
</style>
