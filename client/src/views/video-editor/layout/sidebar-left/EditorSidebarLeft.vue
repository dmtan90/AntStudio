<script setup lang="ts">
import { computed, shallowRef, watch, ref } from 'vue';

import { CarouselVideo as Clapperboard, Play, Application as Grid2X2, ImageFiles as Image, Layers, Music, Scale as Scaling, Text as Type, Upload, VideoFile as Video, ChartLineArea as ChartArea, Robot as Bot } from '@icon-park/vue-next';

import { ElButton, ElDrawer } from 'element-plus';

import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";

import { leftSidebarWidth } from 'video-editor/constants/layout';
import { cn } from 'video-editor/lib/utils';
import { Motion, AnimatePresence } from 'motion-v'

import AudioMenu from './components/audio.vue';
import ElementMenu from './components/element.vue';
import FormatMenu from './components/format.vue';
import ImageMenu from './components/image.vue';
import SceneMenu from './components/scene.vue';
import TemplateMenu from './components/template.vue';
import TextMenu from './components/text.vue';
import UploadMenu from './components/upload.vue';
import VideoMenu from './components/video.vue';
import ChartMenu from './components/chart.vue';
import PromptMenu from './components/prompt.vue';
import AIMenu from './components/ai.vue';

const sidebarComponentMap: Record<string, any> = {
  scene: SceneMenu,
  template: TemplateMenu,
  text: TextMenu,
  upload: UploadMenu,
  image: ImageMenu,
  video: VideoMenu,
  audio: AudioMenu,
  chart: ChartMenu,
  element: ElementMenu,
  format: FormatMenu,
  prompt: PromptMenu,
  ai: AIMenu,
};

const editor = useEditorStore();
const isTablet = useIsTablet();
const { sidebarLeft } = storeToRefs(editor);

const items = computed(() => {
  return [
    {
      icon: Clapperboard,
      label: "Scene",
      value: "scene",
    },
    {
      icon: Grid2X2,
      label: "Template",
      value: "template",
    },
    {
      icon: Bot,
      label: "GPT",
      value: "prompt",
    },
    {
      icon: Bot,
      label: "Gemini",
      value: "ai",
    },
    {
      icon: Layers,
      label: "Element",
      value: "element",
    },
    {
      icon: Type,
      label: "Text",
      value: "text",
    },
    {
      icon: Image,
      label: "Image",
      value: "image",
    },
    {
      icon: Video,
      label: "Video",
      value: "video",
    },
    {
      icon: Music,
      label: "Audio",
      value: "audio",
    },
    {
      icon: Upload,
      label: "Upload",
      value: "upload",
    },
    // {
    //   icon: Bot,
    //   label: "AI",
    //   value: "prompt",
    // },
    // {
    //   icon: Scaling,
    //   label: "Formats",
    //   value: "formats",
    // },
  ];
});

const activeSidebarComponent = ref(null);
watch(sidebarLeft, (menu) => {
  if(menu){
    activeSidebarComponent.value = shallowRef(sidebarComponentMap[menu]);
  }
  else{
    activeSidebarComponent.value = null;
  }
});

const handleDrawerClose = () => {
  editor.setActiveSidebarLeft(null);
};

</script>

<template>
  <template v-if="!isTablet">
    <aside :class="cn('h-16 absolute bottom-0 left-0 bg-card dark:bg-gray-900/40 border-t border-t-border/25 flex items-center z-10 gap-2.5 w-screen overflow-x-scroll scrollbar-hidden px-1.5')">
      <button
        v-for="{ icon: Icon, label, value } in items"
        :key="value"
        :aria-label="value"
        :class="cn('min-w-16 h-14 flex flex-col gap-2', editor.sidebarLeft === value ? 'text-primary' : 'text-foreground')"
        @click="editor.setActiveSidebarLeft(editor.sidebarLeft === value ? null : value)"
      >
        <component :is="Icon" :size="20" :stroke-width="1.5" />
        <span class="text-xxs leading-none">{{ label }}</span>
      </button>
    </aside>
    <el-drawer :model-value="!!activeSidebarComponent" @update:model-value="handleDrawerClose" direction="ltr">
      <component :is="activeSidebarComponent.value" v-if="activeSidebarComponent" />
    </el-drawer>
  </template>

  <template v-else>
    <aside class="w-20 sidebar-wrapper scrollbar-hidden bg-card/75 dark:bg-gray-900/30 flex flex-col items-center py-2 border-r border-r-border/50 gap-2 shrink-0">
      <button
        v-for="{ icon: Icon, label, value } in items"
        :key="value"
        text
        :aria-label="value"
        :class="cn('inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 w-16 h-16 flex flex-col gap-2 shrink-0 bg-transparent hover:bg-accent w-16 h-16 flex flex-col gap-2 shrink-0 bg-transparent hover:bg-accent', editor.sidebarLeft === value ? 'bg-card shadow-sm border hover:bg-card' : 'bg-transparent hover:bg-accent')"
        @click="editor.setActiveSidebarLeft(editor.sidebarLeft === value ? null : value)"
      >
        <component :is="Icon" :size="20" :stroke-width="1.5" />
        <span class="text-xxs leading-none">{{ label }}</span>
      </button>
    </aside>
    <AnimatePresence>
      <Motion layout :style="{ width: activeSidebarComponent ? (leftSidebarWidth + 'px') : '0px' }" :transition="{ default: { ease: 'spring' }, layout: { duration: 0.3 } }">
        <aside v-if="activeSidebarComponent" :style="{ width: leftSidebarWidth + 'px' }" class="overflow-hidden bg-card/60 border-r shrink-0">
          <component :is="activeSidebarComponent.value" :key="editor.sidebarLeft" />
        </aside>
      </Motion>
    </AnimatePresence>
  </template>
</template>