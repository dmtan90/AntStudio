<template>
  <el-popover
    v-bind="attrs"
    :class="['g-popover', $attrs.class]"
    :popper-class="`g-popover-popper ${$attrs['popper-class'] || ''}`"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-popover>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss">
.g-popover-popper {
  background: rgba(10, 10, 10, 0.9) !important;
  backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;
  color: #fff !important;
  padding: 16px !important;

  .el-popover__title {
    color: #fff !important;
    font-weight: 700 !important;
    margin-bottom: 8px !important;
  }

  .el-popper__arrow {
    &::before {
      background: rgba(10, 10, 10, 0.9) !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
  }
}
</style>
