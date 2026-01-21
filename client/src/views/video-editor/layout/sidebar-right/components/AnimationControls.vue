<script setup lang="ts">
import { computed, watch } from 'vue';
import { upperFirst } from 'lodash';
import { Up as ChevronUp } from '@icon-park/vue-next';

import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import { useAnimationControls } from 'video-editor/layout/sidebar-right/hooks/use-animation-controls';

import { cn } from 'video-editor/lib/utils';
import { EditorAnimation, defaultSpringConfig, easings } from 'video-editor/constants/animations';
import { FabricUtils } from 'video-editor/fabric/utils';
import { calculateSpringAnimationDuration, visualizeSpringAnimation } from 'video-editor/lib/animations';

const props = defineProps<{ selected: fabric.Object; type: "in" | "out" | "scene"; animations: EditorAnimation[] }>();

const controls = useAnimationControls(props.selected, props.type);
const animation = computed(() => props.animations.find((anim) => anim.value === props.selected.anim?.[props.type]?.name));

const spring = computed(() => {
  const config = props.selected.anim?.[props.type]?.config || defaultSpringConfig;
  return { graph: visualizeSpringAnimation(config), duration: calculateSpringAnimationDuration(config) };
});

const text = computed({
  get: () => {
    return props.selected.anim?.[props.type]?.text || "letter";
  },

  set: (value) => {
    console.log(value);
    controls.changeTextAnimate(value);
  }
});
const easing = computed({
  get: () => {
    return props.selected.anim?.[props.type]?.easing || "linear";
  },

  set: (value) => {
    console.log(value);
    controls.changeEasing(value);
  }
});

const duration = computed({
  get: () => {
    return (props.selected.anim?.[props.type]?.duration || 0) / 1000;
  },

  set: (value) => {
    console.log(value);
    controls.changeDuration(value);
  }
});
const physics = computed(() => props.selected.anim?.[props.type]?.config || defaultSpringConfig);
const disabled = computed(() => !props.selected.anim?.[props.type]?.name || props.selected.anim?.[props.type]?.name === "none");

watch(props, () => {
  console.log("props", props);
  animation; spring; text; easing; duration; physics; disabled;
});

</script>

<template>
  <div class="flex flex-col animation-controls">
    <div class="flex items-center justify-between gap-6">
      <Label :class="cn('text-xs shrink-0', disabled || animation?.disabled?.easing ? 'opacity-50' : 'opacity-100')">Easing</Label>
      <el-select v-model="easing" :disabled="disabled || animation?.disabled?.easing" class="h-8 text-xs w-[100px] rounded">
        <el-option v-for="e in easings" :key="e.value" :label="e.label" :value="e.value" />
      </el-select>
    </div>
    <template v-if="easing !== 'spring'">
      <div class="flex items-center justify-between gap-6 mt-3">
        <Label :class="cn('text-xs shrink-0', disabled || animation?.disabled?.duration ? 'opacity-50' : 'opacity-100')">Duration (s)</Label>
        <el-input-number v-model="duration" :disabled="disabled || animation?.disabled?.duration" controls-position="right" :step="0.1" class="text-xs h-8 w-[100px] rounded" />
      </div>
    </template>
    <template v-else>
      <div class="flex items-center justify-between gap-6 mt-3">
        <Label :class="cn('text-xs shrink-0', disabled ? 'opacity-50' : 'opacity-100')">Physics</Label>
        <el-popover width="250px" trigger="click" placement="bottom-end">
          <template #reference>
            <el-button plain round class="h-8 w-[100px] justify-between items-center">
              <img :src="spring.graph" class="h-8 w-auto -scale-y-100" />
              <ChevronUp class="w-4 h-4 opacity-50 shrink-0" />
            </el-button>
          </template>
          <section class="sidebar-container px-2">
            <div class="bg-transparent-pattern rounded-sm overflow-hidden relative p-2">
              <span class="absolute bottom-2 right-2 text-center text-xxs w-fit font-medium">Approximate Duration: {{ (spring.duration / 1000).toFixed(2) }} seconds</span>
              <img :src="spring.graph" class="h-full w-auto -scale-y-100" />
            </div>
            <Label class="text-xs font-medium mt-6">Mass</Label>
            <div class="flex items-center justify-between gap-4">
              <SliderInput :min="1" :max="100" :step="1" :model-value="physics.mass" @update:model-value="(mass) => controls.changePhysics({ mass })" />
              <!--<el-slider :min="1" :max="100" :model-value="physics.mass" @update:model-value="(mass) => controls.changePhysics({ mass })" />
              <el-input-number
                :min="1"
                :max="100"
                v-model="physics.mass"
                @update:model-value="(value) => (+value < 1 || +value > 100 ? null : controls.changePhysics({ mass: +value }))"
                class="h-8 w-20 text-xs"
              />-->
            </div>
            <Label class="text-xs font-medium mt-4">Stiffness</Label>
            <div class="flex items-center justify-between gap-4">
              <SliderInput :min="1" :max="100" :step="1" :model-value="physics.stiffness" @update:model-value="(stiffness) => controls.changePhysics({ stiffness })" />
              <!--<el-slider :min="1" :max="100" :model-value="physics.stiffness" @update:model-value="(stiffness) => controls.changePhysics({ stiffness })" />
              <el-input-number
                :min="1"
                :max="100"
                v-model="physics.stiffness"
                @update:model-value="(value) => (+value < 1 || +value > 100 ? null : controls.changePhysics({ stiffness: +value }))"
                class="h-8 w-20 text-xs"
              />-->
            </div>
            <Label class="text-xs font-medium mt-4">Damping</Label>
            <div class="flex items-center justify-between gap-4">
              <SliderInput :min="1" :max="100" :step="1" :model-value="physics.damping" @update:model-value="(damping) => controls.changePhysics({ damping })" />
              <!--<el-slider :min="1" :max="100" :model-value="physics.damping" @update:model-value="(damping) => controls.changePhysics({ damping })" />
              <el-input-number
                :min="1"
                :max="100"
                v-model="physics.damping"
                @update:model-value="(value) => (+value < 1 || +value > 100 ? null : controls.changePhysics({ damping: +value }))"
                class="h-8 w-20 text-xs"
              />-->
            </div>
            <Label class="text-xs font-medium mt-4">Velocity</Label>
            <div class="flex items-center justify-between gap-4">
              <SliderInput :min="0" :max="100" :step="1" :model-value="physics.velocity" @update:model-value="(velocity) => controls.changePhysics({ velocity })" />
              <!--<el-slider :min="0" :max="100" :model-value="physics.velocity" @update:model-value="(velocity) => controls.changePhysics({ velocity })" />
              <el-input-number
                :min="0"
                :max="100"
                v-model="physics.velocity"
                @update:model-value="(value) => (+value < 0 || +value > 100 ? null : controls.changePhysics({ velocity: +value }))"
                class="h-8 w-20 text-xs"
              />-->
            </div>
          </section>
        </el-popover>
      </div>
    </template>
    <div v-if="FabricUtils.isTextboxElement(selected)" class="flex items-center justify-between gap-6 mt-3">
      <Label :class="cn('text-xs shrink-0', disabled || animation?.disabled?.text ? 'opacity-50' : 'opacity-100')">Text Animate</Label>
      <el-select v-model="text" :disabled="disabled || animation?.disabled?.text || animation?.type !== 'textbox'" class="h-8 text-xs w-[100px] rounded">
        <el-option v-for="type in ['letter', 'word', 'line']" :key="type" :label="upperFirst(type)" :value="type" />
      </el-select>
    </div>
  </div>
</template>

<style>
  .animation-controls {
    .rounded {
      --el-border-radius-base: 16px;
    }
  }
</style>