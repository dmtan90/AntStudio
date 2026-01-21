<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  glass: {
    type: Boolean,
    default: true
  },
  size: {
    type: String as () => "" | "default" | "small" | "large" | "sm" | "lg",
    default: ""
  }
})

const attrs = useAttrs()

const elementSize = computed(() => {
  if (props.size === 'lg') return 'large'
  if (props.size === 'sm') return 'small'
  return props.size || 'default'
})
</script>

<template>
  <el-button
    v-bind="attrs"
    :size="elementSize"
    :class="[
      'g-button',
      { 'is-glass': glass },
      $attrs.class
    ]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-button>
</template>

<style lang="scss" scoped>
.g-button {
  &.is-glass {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: #fff !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    height: auto !important;
    padding: 10px 24px !important;
    border-radius: 8px !important;

    &:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4) !important;
    }

    &:active {
      transform: translateY(0) !important;
    }

    &.is-disabled {
      opacity: 0.5 !important;
      transform: none !important;
      background: rgba(255, 255, 255, 0.02) !important;
    }
    
    // Size variants
    &.el-button--large {
      padding: 12px 32px !important;
      font-size: 16px !important;
    }
    
    &.el-button--small {
      padding: 6px 16px !important;
      font-size: 12px !important;
    }
  }

  // Primary variant
  &.el-button--primary:not(.is-glass) {
    background: #fff !important;
    border-color: #fff !important;
    color: #000 !important;
    
    &:hover {
      background: rgba(255, 255, 255, 0.9) !important;
      transform: translateY(-2px) !important;
    }
  }
}

// Global overrides for Element Plus button inside GButton
:deep(.el-icon) {
  color: inherit !important;
}
</style>
