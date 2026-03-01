<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";
import { useI18n } from 'vue-i18n';

import { entry, exit, scene } from 'video-editor/constants/animations';

import Animations from './Animations.vue';

const editor = useEditorStore();
const { t } = useI18n();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const activeTab = ref('in');
const tabOptions = computed(() => [
  {
    label: t('videoEditor.animation.onEnter'),
    value: 'in'
  },
  {
    label: t('videoEditor.animation.display'),
    value: 'scene'
  },
  {
    label: t('videoEditor.animation.onExit'),
    value: 'out'
  },
]);


onMounted(() => {
  let active = "in";
  const animations = canvas.value?.anim || null;
  if (!animations) {
    active = "in";
  }
  else if (animations.scene && animations.scene?.name != "none") {
    active = "scene";
  }
  else if (animations.out && animations.out?.name != "none") {
    active = "out";
  }
  else {
    active = "in";
  }

  activeTab.value = active;
});

</script>

<template>
  <div class="h-full w-full flex flex-col relative overflow-hidden">
    <section class="flex flex-col h-full">
      <!-- Tab Switcher -->
      <div class="px-5 py-4 border-b border-white/5 bg-white/5">
        <el-segmented v-model="activeTab" :options="tabOptions" class="w-full cinematic-segmented" />
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20">
        <!-- Vertical Fade Masks -->
        <div
          class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-40">
        </div>

        <div class="flex flex-col gap-6 relative z-0">
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

        <div
          class="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-80">
        </div>
      </div>
    </section>
  </div>
</template>
