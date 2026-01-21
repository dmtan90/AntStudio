<script setup lang="ts">
import { ElDrawer } from 'element-plus';
import { useAttrs, type PropType } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  direction: {
    type: String as PropType<'rtl' | 'ltr' | 'ttb' | 'btt'>,
    default: 'rtl',
  },
  size: {
    type: [String, Number] as PropType<string | number>,
    default: '30%',
  },
  modal: {
    type: Boolean,
    default: true,
  },
  appendToBody: {
    type: Boolean,
    default: false,
  },
  lockScroll: {
    type: Boolean,
    default: true,
  },
  closeOnPressEscape: {
    type: Boolean,
    default: true,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
  beforeClose: {
    type: [Function, Object] as PropType<any>,
  },
  destroyOnClose: {
    type: Boolean,
    default: false,
  },
});

const attrs = useAttrs();

const emit = defineEmits(['update:modelValue']);

const onUpdate = (value: boolean) => {
  emit('update:modelValue', value);
};

</script>
<template>
  <el-drawer
    :model-value="modelValue"
    @update:modelValue="onUpdate"
    :title="title"
    :direction="direction"
    :size="size"
    :modal="modal"
    :append-to-body="appendToBody"
    :lock-scroll="lockScroll"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :before-close="beforeClose"
    :destroy-on-close="destroyOnClose"
    v-bind="attrs"
  >
    <template #header v-if="$slots.header">
      <slot name="header"></slot>
    </template>
    <slot />
    <template #footer v-if="$slots.footer">
      <slot name="footer"></slot>
    </template>
  </el-drawer>
</template>
