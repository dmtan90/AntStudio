<template>
  <el-card
    v-bind="attrs"
    :class="['g-card', $attrs.class]"
    :shadow="hoverable ? 'hover' : 'never'"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
    
    <template #header v-if="$slots.header || title">
      <slot name="header">
        <h3 class="g-card__title">{{ title }}</h3>
      </slot>
    </template>
    
    <slot />

    <template #footer v-if="$slots.footer">
      <slot name="footer" />
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  title: String,
  hoverable: { type: Boolean, default: true },
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-card {
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important; // $radius-lg
  overflow: hidden !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
  color: #fff !important;

  &:hover {
    transform: translateY(-4px) !important;
  }

  :deep(.el-card__header) {
    padding: 20px 24px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }


  :deep(.el-card__footer) {
    padding: 16px 24px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
  }
}
</style>
