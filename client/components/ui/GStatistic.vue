<template>
  <el-statistic
    v-bind="attrs"
    :class="['g-statistic', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-statistic>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-statistic {
  padding: 16px !important;

  :deep(.el-statistic__head) {
    font-size: 13px !important;
    color: rgba(255, 255, 255, 0.5) !important;
    margin-bottom: 8px !important;
    line-height: 1.2 !important;
  }

  :deep(.el-statistic__content) {
    color: #fff !important;
    font-size: 28px !important;
    font-weight: 800 !important;
    @include text-glow;
  }
}
</style>
