<script setup lang="ts">
import { computed, watch } from 'vue';
import { upperFirst } from 'lodash';
import { Up as ChevronUp } from '@icon-park/vue-next';

import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import { useAnimationControls } from 'video-editor/layout/sidebar-right/hooks/use-animation-controls';

import { cn } from '@/utils/ui';
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
    // The original instruction provided a malformed snippet.
    // Assuming the intent was to ensure 'value' is correctly handled as a number
    // when passed to 'changeDuration', or to explicitly cast it.
    // For v-model with el-input-number, 'value' is typically already a number.
    // If there was a type error, casting to 'any' can resolve it.
    controls.changeDuration(value as any);
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
  <div class="flex flex-col animation-controls gap-5 bg-white/5 p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
    <!-- Background Glow -->
    <div class="absolute -top-10 -right-10 w-32 h-32 bg-brand-primary/5 blur-[50px] rounded-full group-hover:bg-brand-primary/10 transition-all duration-700"></div>

    <div class="flex items-center justify-between gap-4 relative z-10">
      <Label :class="cn('text-[10px] font-bold text-white/40 uppercase tracking-widest', disabled || animation?.disabled?.easing ? 'opacity-30' : 'opacity-100')">Easing Type</Label>
      <el-select v-model="easing" :disabled="disabled || animation?.disabled?.easing" class="cinematic-select w-[130px]" popper-class="cinematic-popover">
        <el-option v-for="e in easings" :key="e.value" :label="e.label" :value="e.value" />
      </el-select>
    </div>

    <template v-if="easing !== 'spring'">
      <div class="flex items-center justify-between gap-4 relative z-10">
        <Label :class="cn('text-[10px] font-bold text-white/40 uppercase tracking-widest', disabled || animation?.disabled?.duration ? 'opacity-30' : 'opacity-100')">Duration (s)</Label>
        <el-input-number v-model="duration" :disabled="disabled || animation?.disabled?.duration" controls-position="right" :step="0.1" :min="0" class="cinematic-input-number w-[130px]" />
      </div>
    </template>
    
    <template v-else>
      <div class="flex items-center justify-between gap-6 mt-1 relative z-10">
        <Label :class="cn('text-[10px] font-bold text-white/40 uppercase tracking-widest', disabled ? 'opacity-30' : 'opacity-100')">Spring Physics</Label>
        <el-popover width="300px" trigger="click" placement="bottom-end" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
          <template #reference>
             <button :disabled="disabled" class="h-9 flex items-center justify-between gap-2 px-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300 w-[130px] shadow-sm disabled:opacity-30">
               <img :src="spring.graph" class="h-5 w-auto -scale-y-100 opacity-60 group-hover:opacity-100" />
               <ChevronUp class="w-3.5 h-3.5 text-white/20" />
             </button>
          </template>
          
          <section class="flex flex-col bg-[#0d0d0d]/95 backdrop-blur-2xl">
            <!-- Popover Header -->
            <div class="px-5 py-4 border-b border-white/5 bg-white/5">
                <span class="text-[10px] font-bold text-white/60 uppercase tracking-widest">Adjust Physics</span>
            </div>

            <div class="p-5 flex flex-col gap-6">
                <!-- Graph Visualization -->
                <div class="bg-black/60 rounded-xl overflow-hidden relative p-4 border border-white/5 h-36 flex items-center justify-center shadow-inner">
                  <span class="absolute top-3 right-3 text-[9px] font-bold font-mono text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">{{ (spring.duration / 1000).toFixed(2) }}s</span>
                  <img :src="spring.graph" class="h-full w-full object-contain -scale-y-100 opacity-80" />
                </div>
                
                <div class="space-y-5">
                   <div>
                      <div class="flex justify-between mb-2">
                          <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mass</Label>
                          <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ physics.mass }}</span>
                      </div>
                       <SliderInput :min="1" :max="100" :step="1" :model-value="physics.mass" @update:model-value="(mass) => controls.changePhysics({ mass })" />
                   </div>
                   
                   <div>
                      <div class="flex justify-between mb-2">
                          <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stiffness</Label>
                           <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ physics.stiffness }}</span>
                      </div>
                      <SliderInput :min="1" :max="100" :step="1" :model-value="physics.stiffness" @update:model-value="(stiffness) => controls.changePhysics({ stiffness })" />
                   </div>
    
                    <div>
                      <div class="flex justify-between mb-2">
                          <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Damping</Label>
                           <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ physics.damping }}</span>
                      </div>
                      <SliderInput :min="1" :max="100" :step="1" :model-value="physics.damping" @update:model-value="(damping) => controls.changePhysics({ damping })" />
                   </div>
    
                   <div>
                      <div class="flex justify-between mb-2">
                          <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Velocity</Label>
                           <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ physics.velocity }}</span>
                      </div>
                      <SliderInput :min="0" :max="100" :step="1" :model-value="physics.velocity" @update:model-value="(velocity) => controls.changePhysics({ velocity })" />
                   </div>
                </div>
            </div>
          </section>
        </el-popover>
      </div>
    </template>
    
    <div v-if="FabricUtils.isTextboxElement(selected)" class="flex items-center justify-between gap-4 relative z-10">
      <Label :class="cn('text-[10px] font-bold text-white/40 uppercase tracking-widest', disabled || animation?.disabled?.text ? 'opacity-30' : 'opacity-100')">Text Style</Label>
      <el-select v-model="text" :disabled="disabled || animation?.disabled?.text || (selected as any)?.type !== 'textbox'" class="cinematic-select w-[130px]" popper-class="cinematic-popover">
        <el-option v-for="type in ['letter', 'word', 'line']" :key="type" :label="upperFirst(type)" :value="type" />
      </el-select>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles replaced global styles */
</style>