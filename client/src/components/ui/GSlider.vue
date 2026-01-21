<template>
  <el-slider
    v-bind="attrs"
    :class="['g-slider', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-slider>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-slider {
  --el-slider-main-bg-color: #fff !important;
  --el-slider-runway-bg-color: rgba(255, 255, 255, 0.1) !important;
  --el-slider-stop-bg-color: rgba(255, 255, 255, 0.2) !important;
  --el-slider-button-size: 16px !important;
  --el-slider-button-wrapper-size: 36px !important;
  --el-slider-height: 6px !important;

  :deep(.el-slider__runway) {
    height: 6px !important;
    background-color: var(--el-slider-runway-bg-color) !important;
    border-radius: 3px !important;
  }

  :deep(.el-slider__bar) {
    height: 6px !important;
    background-color: var(--el-slider-main-bg-color) !important;
    border-radius: 3px !important;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.3) !important;
  }

  :deep(.el-slider__button) {
    border: 2px solid #fff !important;
    background-color: #000 !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5) !important;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    
    &:hover {
      transform: scale(1.2) !important;
    }
  }

  &.is-disabled {
    opacity: 0.5 !important;
  }
}
</style>
