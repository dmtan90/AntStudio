<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import VueDraggable from 'vue-draggable-resizable';
import { cn } from 'video-editor/lib/utils';
import Label from 'video-editor/components/ui/label.vue';
import { Refresh as RotateCw } from '@icon-park/vue-next';
import { FabricUtils } from 'video-editor/fabric/utils';

const props = defineProps({
  width: { type: Number, required: true },
  colors: { type: Array as () => Array<{ color: string; offset: number }>, required: true },
  coords: { type: Object as () => { x1: number; y1: number; x2: number; y2: number }, required: true },
  selected: { type: Number, required: true },
});

const emit = defineEmits(['select', 'change', 'rotate']);

const handleWidth = 10;
const handleHeight = 32;
const containerWidth = 230;//computed(() => props.width);
const trackWidth = computed(() => containerWidth - handleWidth);
// console.log("props", props);

const angle = ref(FabricUtils.revertGradient(props.coords));

watch(() => props.coords, (newCoords) => {
  angle.value = FabricUtils.revertGradient(newCoords);
});

const stops = computed(() => {
  return props.colors.map(({ color, offset }) => ({
    color: color,
    x: trackWidth.value * offset,
  }));
});

const css = computed(() => {
  const gradient = stops.value
    .map((stop, index) => {
      const offset = index === 0 ? 0 : handleWidth;
      const percentage = ((stop.x + offset) / trackWidth.value) * 100;
      return `${stop.color} ${percentage}%`;
    })
    .join(", ");
  return `linear-gradient(90deg, ${gradient})`;
});

watch(props, (value) => {
  console.log("props", value);
  containerWidth; trackWidth; angle; stops; css
});

const handleDrag = (x: number) => {
  const index = props.selected;
  let newOffset = Math.max(0, Math.min(1, x / trackWidth.value));
  emit('change', index, newOffset);
};

const handleRotate = (newAngle: number) => {
  emit('rotate', newAngle);
  angle.value = newAngle;
};

</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="relative h-8">
      <div class="h-full w-full border rounded-md relative" :style="{ background: css }"></div>
      <div class="absolute h-full w-full top-0 left-0" :style="{ height: `${handleHeight}px` }">
        <VueDraggable
          v-for="(stop, index) in stops" :key="stop.color + index"
          :h="32"
          :w="10"
          :draggable="true"
          :resizable="false"
          axis="x"
          :x="stop.x"
          :min-width="0"
          :min-height="0"
          :max-width="10"
          :max-height="32"
          :parent="true"
          @dragging="(x, y) => handleDrag(x)"
          @activated="emit('select', index)"
          class="!bg-transparent !border-none absolute top-0 left-0"
          >
          <button
            :class="cn(
              'h-8 cursor-grab active:cursor-grabbing absolute rounded-md bg-card border border-foreground/25 grid place-items-center',
              selected === index ? 'ring-2 ring-primary' : 'ring-0'
            )"
          >
            <div class="h-6 w-1 rounded-md" :style="{ backgroundColor: stop.color }" />
          </button>
        </VueDraggable>
      </div>
    </div>
    <div class="flex items-center">
      <Label for="angle" class="text-xs shrink-0 text-foreground/50">
        Gradient Angle
      </Label>
      <div class="relative flex-1 ml-6 mr-2">
        <el-input-number v-model="angle" id="angle" size="small" class="h-8 text-xs w-full" controls-position="right" @change="(value) => handleRotate(+value)" >
          <template #suffix>
            <span class="text-sm">°</span>
          </template>
        </el-input-number>
      </div>
      <el-button plain circle size="small" variant="outline" class="shrink-0" @click="handleRotate(angle + 15)">
        <RotateCw :size="14" />
      </el-button>
    </div>
  </div>
</template>
