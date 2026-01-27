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
  const { left, top } = lineElement.value?.getBoundingClientRect() || { left: 0, top: 0 };
  positionState.left = parseInt(left.toString());
  positionState.top = parseInt(top.toString());
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
  <div ref="lineElement"
    :class="['resize-handler flex justify-center items-center relative z-50 group hover:bg-brand-primary/10 transition-all duration-300', isVertical ? 'cursor-col-resize w-1.5 h-full' : 'cursor-row-resize h-1.5 w-full']"
    @mousedown="mouseDownHandler">
    <div
      :class="['absolute bg-white/5 transition-colors duration-300 group-hover:bg-brand-primary/50', isVertical ? 'w-px h-full' : 'h-px w-full']">
    </div>

    <!-- Drag Handle Indicator -->
    <div
      :class="['absolute bg-white/10 rounded-full transition-all duration-300 group-hover:bg-brand-primary group-hover:scale-x-125 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]', isVertical ? 'h-8 w-1' : 'w-12 h-1']">
    </div>

    <button
      class="flex items-center justify-center h-6 w-6 rounded-full bg-brand-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-90 select-none pointer-events-none z-10">
      <Sort :size="12" :class="isVertical ? 'rotate-90' : ''" :stroke-width="5" />
    </button>
  </div>
</template>

<style scoped>
/* No more element-plus overrides needed */
</style>