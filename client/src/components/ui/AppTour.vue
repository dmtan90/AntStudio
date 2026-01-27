<template>
  <el-tour v-model="visible" :mask="true" :type="tourType">
    <el-tour-step 
      v-for="(step, index) in steps" 
      :key="index"
      :target="step.target"
      :title="step.title"
      :description="step.description"
      :placement="step.placement || 'bottom'"
    />
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
const tourType = ref(props.type || 'primary')

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
  --el-tour-bg-color: rgba(20, 20, 25, 0.95);
  --el-tour-border-radius: 20px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

  .el-tour-step__title {
    color: #fff;
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.5px;
  }

  .el-tour-step__description {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.6;
  }

  .el-tour-step__content {
    padding: 24px;
  }

  .el-tour-step__footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    
    .el-button {
        border-radius: 10px;
        text-transform: none;
        font-weight: 700;
    }
  }
}
</style>
