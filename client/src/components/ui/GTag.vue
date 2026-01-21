<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  size: {
    type: String as () => "" | "default" | "small" | "large" | "sm" | "lg",
    default: 'default'
  }
})

const attrs = useAttrs()

const mapSize = computed(() => {
  if (props.size === 'sm') return 'small'
  if (props.size === 'lg') return 'large'
  return props.size as any
})
</script>

<template>
  <el-tag
    v-bind="attrs"
    :size="mapSize"
    :class="['g-tag', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-tag>
</template>

<style lang="scss" scoped>
.g-tag {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border-radius: 4px !important;

  &.el-tag--primary {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
  }

  &.el-tag--success {
    background: rgba(0, 230, 118, 0.1) !important;
    border-color: rgba(0, 230, 118, 0.2) !important;
    color: #00e676 !important;
  }

  &.el-tag--warning {
    background: rgba(255, 171, 0, 0.1) !important;
    border-color: rgba(255, 171, 0, 0.2) !important;
    color: #ffab00 !important;
  }

  &.el-tag--danger {
    background: rgba(255, 82, 82, 0.1) !important;
    border-color: rgba(255, 82, 82, 0.2) !important;
    color: #ff5252 !important;
  }
}
</style>
