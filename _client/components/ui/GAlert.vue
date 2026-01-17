<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: true
})

const attrs = useAttrs()
</script>

<template>
  <el-alert
    v-bind="attrs"
    :class="['g-alert', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-alert>
</template>

<style lang="scss" scoped>
.g-alert {
  border-radius: 12px !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid transparent !important;
  padding: 16px 20px !important;
  
  :deep(.el-alert__content) {
    .el-alert__title {
      font-weight: 700 !important;
      font-size: 15px !important;
      letter-spacing: -0.2px !important;
    }
    .el-alert__description {
      font-size: 14px !important;
      margin-top: 4px !important;
      opacity: 0.8 !important;
      color: inherit !important;
    }
  }

  :deep(.el-alert__close-btn) {
    color: inherit !important;
    opacity: 0.5 !important;
    &:hover { opacity: 1 !important; }
  }

  &.el-alert--info {
    background: rgba(102, 126, 234, 0.1) !important;
    border-color: rgba(102, 126, 234, 0.2) !important;
    color: #a5b4fc !important;
  }

  &.el-alert--success {
    background: rgba(0, 230, 118, 0.1) !important;
    border-color: rgba(0, 230, 118, 0.2) !important;
    color: #4ade80 !important;
  }

  &.el-alert--warning {
    background: rgba(255, 171, 0, 0.1) !important;
    border-color: rgba(255, 171, 0, 0.2) !important;
    color: #fbbf24 !important;
  }

  &.el-alert--error {
    background: rgba(255, 82, 82, 0.1) !important;
    border-color: rgba(255, 82, 82, 0.2) !important;
    color: #f87171 !important;
  }
}
</style>
