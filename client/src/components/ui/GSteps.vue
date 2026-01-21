<template>
  <el-steps
    v-bind="attrs"
    :class="['g-steps', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>

    <!-- Support steps prop for backward compatibility -->
    <template v-if="steps && steps.length > 0">
      <el-step
        v-for="(step, idx) in steps"
        :key="idx"
        :title="step.title"
        :description="step.description"
      >
        <template #icon>
          <slot :name="`icon-${idx}`" :step="step" :active="active === idx">
            <!-- Default icon content if slot not provided -->
          </slot>
        </template>
      </el-step>
    </template>
  </el-steps>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  active: { type: Number, default: 0 },
  steps: {
    type: Array as () => Array<{ title: string, description?: string }>,
    default: () => []
  }
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-steps {
  :deep(.el-step__head) {
    .el-step__line {
      background-color: rgba(255, 255, 255, 0.1) !important;
      height: 2px !important;
      top: 15px !important; // Adjust alignment
    }

    .el-step__icon {
      width: 32px !important;
      height: 32px !important;
      border: 2px solid rgba(255, 255, 255, 0.2) !important;
      background: rgba(0, 0, 0, 0.3) !important;
      color: rgba(255, 255, 255, 0.5) !important;
      font-weight: 700 !important;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
      
      &.is-text {
        border-radius: 50% !important;
      }
    }

    &.is-process, &.is-finish {
      .el-step__icon {
        border-color: #fff !important;
        background: #fff !important;
        color: #000 !important;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.3) !important;
      }
      .el-step__line {
        background-color: #fff !important;
      }
    }
  }

  :deep(.el-step__main) {
    .el-step__title {
      font-size: 14px !important;
      color: rgba(255, 255, 255, 0.5) !important;
      font-weight: 500 !important;
      
      &.is-process, &.is-finish {
        color: #fff !important;
        font-weight: 700 !important;
      }
    }

    .el-step__description {
      font-size: 12px !important;
      color: rgba(255, 255, 255, 0.3) !important;
      margin-top: 4px !important;
    }
  }
}
</style>
