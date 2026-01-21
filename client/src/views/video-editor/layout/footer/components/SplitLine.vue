<script setup lang="ts">
import { computed, ref } from 'vue';
import { Sort } from '@icon-park/vue-next';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  newWidth: {
    type: Number,
    default: 0
  },
  newHeight: {
    type: Number,
    default: 0
  },
  direction: {
    type: String,
    default: 'horizontal'
  },
  limitSize: {
    type: Object,
    default() {
      return {
        minHeight: 0,
        maxHeight: 999999,
        minWidth: 0,
        maxWidth: 999999
      };
    }
  }
});

const emit = defineEmits({
  'update:newWidth': val => {
    return val !== null;
  },
  'update:newHeight': val => {
    return val !== null;
  }
});

const newWidthValue = computed({
  get() {
    return props.newWidth;
  },
  set(newValue) {
    emit('update:newWidth', newValue);
  }
});
const newHeightValue = computed({
  get() {
    return props.newHeight;
  },
  set(newValue) {
    emit('update:newHeight', newValue);
  }
});

const lineElement = ref(null);
// const store = usePageState();
const isVertical = computed(() => props.direction === 'vertical');
// const iconColor = computed(() => {
//   return store.isDark ? '#E5E7EB' : '#1F2937';
// });

const positionState = {
  left: 0,
  top: 0
};

let enableMove = false;

function mouseDownHandler() {
  if (props.disabled) {
    return;
  }
  const { left, top } = lineElement.value?.$el?.getBoundingClientRect();
  positionState.left = parseInt(left);
  positionState.top = parseInt(top);
  enableMove = true;

  document.onmousemove = documentEvent => {
    if (!enableMove) return;
    const { pageX, pageY } = documentEvent;
    const { top: oldTop, left: oldLeft } = positionState;
    const { minHeight, maxHeight, minWidth, maxWidth } = props.limitSize;
    const offsetX = pageX - oldLeft;
    const offsetY = pageY - oldTop;
    positionState.left = pageX;
    positionState.top = pageY;
    if (isVertical.value) {
      const newWidth = newWidthValue.value - offsetX;
      newWidthValue.value = newWidth > maxWidth ? maxWidth : newWidth < minWidth ? minWidth : newWidth;
    } else {
      const newHeight = newHeightValue.value - offsetY;
      newHeightValue.value = newHeight > maxHeight ? maxHeight : newHeight < minHeight ? minHeight : newHeight;
    }

    // console.log(newHeightValue.value, newWidthValue.value);
  };

  document.onmouseup = () => {
    enableMove = false;
    document.onmouseup = null;
    document.onmousemove = null;
  };
}
</script>

<template>
  <el-divider ref="lineElement" 
    :direction="isVertical ? 'vertical' : 'horizontal'" 
    class="resize-handler cursor-row-resize" 
    @mousedown="mouseDownHandler">
    <el-button size="default" type="primary" text bg circle>
      <Sort :size="20" :class="isVertical ? 'rotate-90' : ''"/>
    </el-button>
  </el-divider>
</template>

<style>
.resize-handler {
  margin: 0px !important;
  border-color: var(--el-color-primary) !important;
  --el-border-color: var(--el-color-primary);
  border-color: var(--el-color-primary) !important;
  > .el-divider__text {
    background-color: transparent !important;
  }

  .el-button {
    opacity: 0;
  }

  &:hover {
    .el-button {
      opacity: 1;
    }
  }
}
</style>