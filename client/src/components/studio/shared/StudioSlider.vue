<template>
  <div class="space-y-1">
    <div class="flex justify-between items-center px-1">
      <label class="text-[8px] uppercase font-black opacity-30">{{ label }}</label>
      <span class="text-[8px] font-bold text-blue-400">
        {{ formattedValue }}{{ suffix }}
      </span>
    </div>
    <el-slider
      :modelValue="modelValue"
      @update:modelValue="$emit('update:modelValue', $event)"
      :min="min"
      :max="max"
      :step="step"
      size="small"
      class="studio-slider"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  displayMultiplier?: number;
  suffix?: string;
}>();

defineEmits(['update:modelValue']);

const formattedValue = computed(() => {
  const val = props.displayMultiplier ? props.modelValue * props.displayMultiplier : props.modelValue;
  return props.precision !== undefined ? val.toFixed(props.precision) : Math.round(val);
});
</script>

<style scoped>
.studio-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.05);
}
.studio-slider :deep(.el-slider__bar) {
  background-color: #3b82f6;
}
.studio-slider :deep(.el-slider__button) {
  border-color: #3b82f6;
  background-color: #000;
  width: 12px;
  height: 12px;
}
</style>
