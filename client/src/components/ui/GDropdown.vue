<template>
  <el-dropdown
    v-bind="attrs"
    :class="['g-dropdown', $attrs.class]"
    :popper-class="`g-dropdown-popper ${$attrs['popper-class'] || ''}`"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-dropdown {
  :deep(.el-dropdown-link) {
    cursor: pointer;
    display: flex;
    align-items: center;
    color: inherit;
  }
}
</style>

<style lang="scss">
.g-dropdown-popper {
  background: rgba(15, 15, 15, 0.9) !important;
  backdrop-filter: blur(30px) !important;
  // border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;
  padding: 6px !important;

  .el-dropdown-menu {
    background: transparent !important;
    padding: 0 !important;
    border: none !important;
  }

  .el-dropdown-menu__item {
    color: rgba(255, 255, 255, 0.7) !important;
    border-radius: 8px !important;
    padding: 10px 16px !important;
    font-size: 14px !important;
    transition: all 0.2s !important;
    margin-bottom: 2px !important;

    &:last-child { margin-bottom: 0; }

    &:hover, &:focus {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #fff !important;
    }

    &.is-disabled {
      opacity: 0.3 !important;
      background: transparent !important;
    }

    &.el-dropdown-menu__item--divided {
      margin: 6px 0 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
      &::before { display: none !important; }
    }

    &.is-danger{
      color: var(--el-color-danger) !important;
    }

    &.is-primary{
      color: var(--el-color-primary) !important;
    }

    &.is-warning{
      color: var(--el-color-warning) !important;
    }

    &.is-info{
      color: var(--el-color-info) !important;
    }
  }

  .el-popper__arrow {
    display: none !important;
  }
}
</style>
