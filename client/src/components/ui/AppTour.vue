<template>
  <el-tour v-model="visible" :mask="true" type="default">
    <el-tour-step v-for="(step, index) in steps" :key="index" :target="step.target" :title="step.title"
      :description="step.description" :placement="step.placement || 'bottom'" />
  </el-tour>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface TourStep {
  target: string | HTMLElement
  title: string
  description: string
  placement?: any
}

const props = defineProps<{
  modelValue: boolean
  steps: TourStep[]
  type?: 'default' | 'primary'
}>()

const emit = defineEmits(['update:modelValue', 'finish'])

const visible = ref(props.modelValue)
// const tourType = ref(props.type || 'primary') // Removing purple default

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) emit('finish')
})
</script>

<style lang="scss">
.el-tour {
  --el-tour-bg-color: rgba(10, 10, 10, 0.9);
  --el-tour-border-radius: 28px;
  --el-text-color-primary: #fff;
  --el-text-color-regular: rgba(255, 255, 255, 0.7);
  position: absolute;
  
  background-color: rgba(10, 10, 10, 0.9) !important;
  backdrop-filter: blur(50px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 40px 100px -20px rgba(0, 0, 0, 0.95),
    0 0 120px -30px rgba(59, 130, 246, 0.2);
  z-index: 10001 !important;

  .el-tour-step__header {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .el-tour-step__title {
    font-family: 'Outfit', 'Inter', sans-serif;
    color: #fff;
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.03em;
  }

  .el-tour-step__description {
    font-family: 'Inter', sans-serif;
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    line-height: 1.7;
    font-weight: 500;
  }

  .el-tour-step__content {
    padding: 24px;
  }

  .el-tour-step__footer {
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.02);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    .el-button {
      height: 36px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      padding: 0 16px;
      transition: all 0.2s ease;
      
      &--default {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
      }

      &--primary {
        background: #f97316; /* Brand Orange */
        border: none;
        color: #fff;
        box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);

        &:hover {
          background: #fb923c;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
        }
        
        &:active {
          transform: translateY(0);
        }
      }
    }
  }
  
  /* Target highlight/mask styles if supported by element-plus version or via custom class */
  &.is-dark {
      --el-bg-color-overlay: rgba(0,0,0,0.8);
  }
}
</style>
