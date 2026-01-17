<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  options: {
    type: Array as () => Array<{ label: string, value: any }>,
    default: () => []
  }
})

const attrs = useAttrs()
</script>

<template>
  <el-select
    v-bind="attrs"
    :class="['g-select', $attrs.class]"
    :popper-class="`g-select-dropdown ${$attrs['popper-class'] || ''}`"
    :teleported="$attrs.teleported !== undefined ? !!$attrs.teleported : true"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
    <template v-if="options && options.length > 0">
      <el-option
        v-for="opt in options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </template>
  </el-select>
</template>

<style lang="scss" scoped>
.g-select {
  width: 100%;
  
  :deep(.el-select__wrapper) {
    background: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: none !important;
    border-radius: 8px !important;
    padding: 2px 12px !important;
    min-height: 40px !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;

    &:hover {
      border-color: rgba(255, 255, 255, 0.2) !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }

    &.is-focused {
      border-color: rgba(255, 255, 255, 0.4) !important;
      background: rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.03) !important;
    }
    
    .el-select__placeholder {
      color: rgba(255, 255, 255, 0.3) !important;
    }
    
    .el-select__selected-item {
      color: #fff !important;
    }
  }

  &.is-disabled {
    :deep(.el-select__wrapper) {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }
  }
}
</style>

<style lang="scss">
// Global styles for the dropdown popper
.g-select-dropdown {
  background: rgba(15, 15, 15, 0.95) !important;
  backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;
  padding: 6px !important;

  .el-select-dropdown__item {
    color: rgba(255, 255, 255, 0.7) !important;
    border-radius: 8px !important;
    padding: 10px 12px !important;
    margin-bottom: 2px !important;
    height: auto !important;
    line-height: 1.4 !important;
    font-size: 14px !important;
    transition: all 0.2s !important;

    &:hover, &.is-hovering {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #fff !important;
      padding-left: 16px !important;
    }

    &.is-selected {
      background: rgba(255, 255, 255, 0.12) !important;
      color: #fff !important;
      font-weight: 600 !important;
      
      &::after {
        display: none !important;
      }
    }
  }

  .el-popper__arrow {
    display: none !important;
  }
}
</style>
