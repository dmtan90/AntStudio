<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePreviewAnimation } from 'video-editor/hooks/use-preview-animation';
import { useAnimationControls } from 'video-editor/layout/sidebar-right/hooks/use-animation-controls';
import { useAnimationList } from 'video-editor/layout/sidebar-right/hooks/use-animations';
import AnimationItem from './AnimationItem.vue';
import AnimationControls from './AnimationControls.vue';
import { Canvas } from "video-editor/plugins/canvas";

interface AnimationProps {
  animations: EditorAnimation[]
  type: 'in' | 'out' | 'scene'
  selected: fabric.Object | Canvas
}

const props = defineProps<AnimationProps>()
const controls = useAnimationControls(props.selected, props.type)
const animations = useAnimationList(props.selected, props.animations)
usePreviewAnimation(props.selected, props.type)

// watch(props, () => {
//   animations = useAnimationList(props.selected, props.animations)
//   usePreviewAnimation(props.selected, props.type)
// })

// console.log(animations, props);
</script>

<template>
  <div class="flex flex-col px-1">
    <AnimationControls :selected="selected" :type="type" :animations="animations" />
    <div class="pt-7 flex flex-col gap-7">
      <div v-for="animation in animations" :key="animation.title" class="flex flex-col gap-4">
        <h4 class="text-xs font-medium text-center">{{ animation.title }}</h4>
        <div class="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 gap-5">
          <AnimationItem
            v-for="item in animation.list"
            :key="item.label"
            :animation="item"
            :selected="selected.anim?.[type].name === item.value"
            @click="controls.selectAnimation(item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
