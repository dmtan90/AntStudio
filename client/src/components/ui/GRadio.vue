<template>
  <el-radio
    v-bind="attrs"
    :class="['g-radio', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-radio>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-radio {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: all 0.2s !important;
  margin-right: 24px !important;

  &:hover {
    color: #fff !important;
    :deep(.el-radio__inner) {
      border-color: rgba(255, 255, 255, 0.5) !important;
    }
  }

  &.is-checked {
    color: #fff !important;
    :deep(.el-radio__inner) {
      border-color: #fff !important;
      background: transparent !important;
      
      &::after {
        background: #fff !important;
        width: 8px !important;
        height: 8px !important;
      }
    }
  }

  :deep(.el-radio__inner) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    width: 18px !important;
    height: 18px !important;
    transition: all 0.2s !important;
  }

  :deep(.el-radio__label) {
    color: inherit !important;
    font-size: 14px !important;
    padding-left: 10px !important;
  }

  &.is-disabled {
    opacity: 0.5 !important;
  }
}
</style>
