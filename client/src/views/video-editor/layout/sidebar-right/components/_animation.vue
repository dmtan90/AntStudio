<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { upperFirst } from 'lodash';
import { Close as X } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";

import { defaultSpringConfig, easings, entry, exit, scene } from 'video-editor/constants/animations';

import Animations from './Animations.vue';
import PageAnimation from './PageAnimation.vue';
import ElementAnimation from './ElementAnimation.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);
// const animations = computed(() => );
watch(selected, (value) => {
  console.log("selected", value);
})

const activeAnimations = ref('page');
const activeTab = ref('in');
const tabOptions = [
  {
    label: 'On Enter',
    value: 'in'
  },
  {
    label: 'On Display',
    value: 'scene'
  },
  {
    label: 'On Exit',
    value: 'out'
  },
];


onMounted(() => {
  let active = "in";
  const animations = selected.value?.animations || null;
  if(!animations){
    active = "in";
  }
  else if(animations.scene && animations.scene?.name != "none"){
    active = "scene";
  }
  else if(animations.out && animations.out?.name != "none"){
    active = "out";
  }
  else{
    active = "in";
  }

  nextTick(() => {
    activeTab.value = active;
  })
});

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Animations</h2>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors" @click="editor.setActiveSidebarRight(null)">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="px-5 py-4">
        <div class="bg-white/5 p-1 rounded-xl border border-white/5 flex mb-2">
           <button 
             v-for="opt in tabOptions" 
             :key="opt.value"
             @click="activeTab = opt.value"
             class="flex-1 py-1.5 flex items-center justify-center gap-2 text-xs font-bold rounded-lg transition-all"
             :class="[activeTab === opt.value ? 'bg-brand-primary text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5']"
           >
             {{ opt.label }}
           </button>
        </div>
      </div>
      <div class="px-5 flex flex-col divide-y divide-white/5">
        <template v-if="activeTab == 'in'">
          <Animations :animations="entry" :selected="selected" type="in" />
        </template>
        <template v-else-if="activeTab == 'out'">
          <Animations :animations="exit" :selected="selected" type="out" />
        </template>
        <template v-else>
          <Animations :animations="scene" :selected="selected" type="scene" />
        </template>
      </div>
    </section>
  </div>
</template>