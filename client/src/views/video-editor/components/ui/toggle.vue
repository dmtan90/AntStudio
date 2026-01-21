<script setup lang="ts">
import { watch, type PropType } from "vue";
import { ElButton } from 'element-plus';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  size: {
    type: String as PropType<"" | "default" | "small" | "large">,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
});

const emit = defineEmits(['toggle']);

const handleChange = () => {
  let value = !props.modelValue;
  emit('toggle', value);
};

watch(props, (value) => {
  console.log(props);
});
</script>

<template>
  <el-button :type="props.modelValue ? 'primary' : ''" :size="props.size" :disabled="props.disabled" @click="handleChange()">
    <slot />
  </el-button>
</template>