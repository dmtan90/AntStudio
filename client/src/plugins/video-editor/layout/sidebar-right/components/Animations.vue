<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePreviewAnimation } from 'video-editor/hooks/use-preview-animation';
import { EditorAnimation, defaultSpringConfig, easings } from 'video-editor/constants/animations';
import { useAnimationControls } from 'video-editor/layout/sidebar-right/hooks/use-animation-controls';
import { useAnimationList } from 'video-editor/layout/sidebar-right/hooks/use-animations';
import AnimationItem from './AnimationItem.vue';
import AnimationControls from './AnimationControls.vue';
import { Canvas } from "video-editor/plugins/canvas";
import { useI18n } from 'vue-i18n';

interface AnimationProps {
  animations: EditorAnimation[]
  type: 'in' | 'out' | 'scene'
  selected: fabric.Object | Canvas
}

const { t } = useI18n();
const props = defineProps<AnimationProps>()
const controls = useAnimationControls(props.selected as any, props.type)
const animations = useAnimationList(props.selected as any, props.animations)
usePreviewAnimation(props.selected as any, props.type)

</script>

<template>
  <div class="flex flex-col gap-8">
    <AnimationControls :selected="(selected as any)" :type="type" :animations="props.animations" />
    
    <div class="flex flex-col gap-10 pb-10">
      <div v-for="animation in animations" :key="animation.title" class="flex flex-col gap-5">
        <div class="flex items-center gap-4">
          <div class="h-px flex-1 bg-white/5"></div>
          <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">{{ t(animation.title) }}</h4>
          <div class="h-px flex-1 bg-white/5"></div>
        </div>
        
        <div class="grid grid-cols-3 gap-3.5 px-1">
          <AnimationItem
            v-for="item in animation.list"
            :key="item.label"
            :animation="item"
            :selected="(selected as any).anim?.[type]?.name === item.value"
            @click="controls.selectAnimation(item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
