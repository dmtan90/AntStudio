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
    // {
    //   icon: Bot,
    //   label: "GPT",
    //   value: "prompt",
    // },
    {
      icon: Bot,
      label: "Magic",
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
    <aside :class="cn('h-16 absolute bottom-0 left-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 flex items-center z-10 gap-2.5 w-screen overflow-x-scroll scrollbar-hidden px-1.5')">
      <button
        v-for="{ icon: Icon, label, value } in items"
        :key="value"
        :aria-label="value"
        :class="cn('min-w-16 h-14 flex flex-col items-center justify-center gap-1.5 transition-all duration-300', editor.sidebarLeft === value ? 'text-brand-primary' : 'text-white/40 hover:text-white')"
        @click="editor.setActiveSidebarLeft(editor.sidebarLeft === value ? null : value)"
      >
        <component :is="Icon" :size="20" :stroke-width="1.5" :class="editor.sidebarLeft === value ? 'scale-110' : ''" />
        <span class="text-[9px] font-bold uppercase tracking-wider">{{ label }}</span>
        <div v-if="editor.sidebarLeft === value" class="absolute bottom-0 w-8 h-0.5 bg-brand-primary rounded-t-full shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"></div>
      </button>
    </aside>
    <el-drawer :model-value="!!activeSidebarComponent" @update:model-value="handleDrawerClose" direction="ltr">
      <component :is="activeSidebarComponent.value" v-if="activeSidebarComponent" />
    </el-drawer>
  </template>

  <template v-else>
    <aside class="w-18 sidebar-wrapper scrollbar-hidden bg-[#050505] flex flex-col items-center py-4 border-r border-white/5 gap-3 shrink-0 z-50 shadow-xl">
      <button
        v-for="{ icon: Icon, label, value } in items"
        :key="value"
        :aria-label="value"
        class="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 group"
        :class="editor.sidebarLeft === value ? 'bg-brand-primary text-black shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]' : 'text-white/40 hover:bg-white/10 hover:text-white'"
        @click="editor.setActiveSidebarLeft(editor.sidebarLeft === value ? null : value)"
      >
        <component :is="Icon" :size="20" :stroke-width="1.5" :class="cn('transition-transform duration-300', editor.sidebarLeft === value ? 'scale-110' : 'group-hover:scale-110')" />
        <span class="text-[9px] font-bold mt-1.5 uppercase tracking-wide">{{ label }}</span>
        
        <!-- Active Indicator -->
        <div v-if="editor.sidebarLeft === value" class="absolute -right-[1px] top-1/2 -translate-y-1/2 w-[3px] h-8 bg-brand-primary rounded-l-full shadow-[-2px_0_10px_rgba(var(--brand-primary-rgb),0.5)]"></div>
      </button>
    </aside>
    <AnimatePresence>
      <Motion layout :style="{ width: activeSidebarComponent ? (leftSidebarWidth + 'px') : '0px' }" :transition="{ default: { ease: 'easeInOut' }, layout: { duration: 0.3 } }">
        <aside v-if="activeSidebarComponent" :style="{ width: leftSidebarWidth + 'px' }" class="overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/5 shrink-0 h-full relative z-40 shadow-2xl">
          <component :is="activeSidebarComponent.value" :key="editor.sidebarLeft" />
        </aside>
      </Motion>
    </AnimatePresence>
  </template>
</template>