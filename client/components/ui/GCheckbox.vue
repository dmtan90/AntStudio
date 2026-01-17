<template>
  <el-checkbox
    v-bind="attrs"
    :class="['g-checkbox', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-checkbox>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-checkbox {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: all 0.2s !important;

  &:hover {
    color: #fff !important;
    :deep(.el-checkbox__inner) {
      border-color: rgba(255, 255, 255, 0.5) !important;
    }
  }

  &.is-checked {
    color: #fff !important;
    :deep(.el-checkbox__inner) {
      background: #fff !important;
      border-color: #fff !important;
      
      &::after {
        border-color: #000 !important;
      }
    }
  }

  :deep(.el-checkbox__inner) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 4px !important;
    width: 18px !important;
    height: 18px !important;
    transition: all 0.2s !important;
  }

  :deep(.el-checkbox__label) {
    color: inherit !important;
    font-size: 14px !important;
    padding-left: 10px !important;
  }

  &.is-disabled {
    opacity: 0.5 !important;
  }
}
</style>
