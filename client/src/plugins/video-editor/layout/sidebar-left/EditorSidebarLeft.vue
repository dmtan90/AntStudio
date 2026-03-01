<script setup lang="ts">
import { computed, shallowRef, watch, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { CarouselVideo as Clapperboard, Play, Application as Grid2X2, ImageFiles as Image, Layers, Music, Scale as Scaling, Text as Type, Upload, VideoFile as Video, ChartLineArea as ChartArea, Robot as Bot, Record as RecordIcon, MovieBoard } from '@icon-park/vue-next';

import { ElButton, ElDrawer } from 'element-plus';

import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";

import { leftSidebarWidth } from 'video-editor/constants/layout';
import { cn } from '@/utils/ui';
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
import CloudMenu from './components/cloud.vue';
import LayersMenu from './components/layers.vue';
import RecorderMenu from './components/recorder.vue';

const sidebarComponentMap: Record<string, any> = {
  scene: SceneMenu,
  template: TemplateMenu,
  record: RecorderMenu,
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
  cloud: CloudMenu,
  layers: LayersMenu,
  recorder: RecorderMenu,
};

const editor = useEditorStore();
const isTablet = useIsTablet();
const { t } = useI18n();
const { sidebarLeft } = storeToRefs(editor);

const items = computed(() => {
  return [
    {
      icon: Clapperboard,
      label: t('videoEditor.sidebar.scene'),
      value: "scene",
    },
    {
      icon: Grid2X2,
      label: t('videoEditor.sidebar.template'),
      value: "template",
    },
    {
      icon: Bot,
      label: t('videoEditor.sidebar.magic'),
      value: "ai",
    },
    {
      icon: Grid2X2,
      label: t('videoEditor.sidebar.element'),
      value: "element",
    },
    {
      icon: Type,
      label: t('videoEditor.sidebar.text'),
      value: "text",
    },
    {
      icon: Image,
      label: t('videoEditor.sidebar.image'),
      value: "image",
    },
    {
      icon: Video,
      label: t('videoEditor.sidebar.video'),
      value: "video",
    },
    {
      icon: Music,
      label: t('videoEditor.sidebar.audio'),
      value: "audio",
    },
    {
      icon: Upload,
      label: t('videoEditor.sidebar.upload'),
      value: "upload",
    },
    {
      icon: RecordIcon,
      label: t('videoEditor.sidebar.record'),
      value: "record",
    },
    {
      icon: Grid2X2, // Or find a better cloud/hub icon if available
      label: t('videoEditor.sidebar.cloud'),
      value: "cloud",
    },
    {
      icon: Layers,
      label: t('videoEditor.sidebar.layers'),
      value: "layers",
    },
    // {
    //   icon: Scaling,
    //   label: t('videoEditor.sidebar.formats'),
    //   value: "formats",
    // },
  ];
});

const activeSidebarComponent = shallowRef(null);
watch(sidebarLeft, (menu) => {
  activeSidebarComponent.value = menu ? sidebarComponentMap[menu] : null;
});

const handleDrawerClose = () => {
  editor.setActiveSidebarLeft(null);
};

</script>

<template>
  <template v-if="!isTablet">
    <aside
      :class="cn('h-16 absolute bottom-0 left-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 flex items-center z-10 gap-2.5 w-screen overflow-x-scroll scrollbar-hidden px-1.5')">
      <button v-for="{ icon: Icon, label, value } in items" :key="value" :aria-label="value"
        :class="cn('min-w-16 h-14 flex flex-col items-center justify-center gap-1.5 transition-all duration-300', editor.sidebarLeft === value ? 'text-brand-primary' : 'text-white/40 hover:text-white')"
        @click="editor.setActiveSidebarLeft(editor.sidebarLeft === value ? null : value)">
        <component :is="Icon" :size="20" :stroke-width="1.5" :class="editor.sidebarLeft === value ? 'scale-110' : ''" />
        <span class="text-[9px] font-bold uppercase tracking-wider">{{ label }}</span>
        <div v-if="editor.sidebarLeft === value"
          class="absolute bottom-0 w-8 h-0.5 bg-brand-primary rounded-t-full shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]">
        </div>
      </button>
    </aside>
    <el-drawer :model-value="!!activeSidebarComponent" @update:model-value="handleDrawerClose" direction="ltr">
      <component :is="activeSidebarComponent" v-if="activeSidebarComponent" />
    </el-drawer>
  </template>

  <template v-else>
    <aside
      class="w-18 sidebar-wrapper scrollbar-hidden bg-[#050505] flex flex-col items-center py-4 border-r border-white/5 gap-3 shrink-0 z-50 shadow-xl">
      <button v-for="{ icon: Icon, label, value } in items" :key="value" :aria-label="value"
        class="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 group"
        :class="editor.sidebarLeft === value ? 'bg-brand-primary text-black shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]' : 'text-white/40 hover:bg-white/10 hover:text-white'"
        @click="editor.setActiveSidebarLeft(editor.sidebarLeft === value ? null : value)">
        <component :is="Icon" :size="20" :stroke-width="1.5"
          :class="cn('transition-transform duration-300', editor.sidebarLeft === value ? 'scale-110' : 'group-hover:scale-110')" />
        <span class="text-[9px] font-bold mt-1.5 uppercase tracking-wide">{{ label }}</span>

        <!-- Active Indicator -->
        <div v-if="editor.sidebarLeft === value"
          class="absolute -right-[1px] top-1/2 -translate-y-1/2 w-[3px] h-8 bg-brand-primary rounded-l-full shadow-[-2px_0_10px_rgba(var(--brand-primary-rgb),0.5)]">
        </div>
      </button>
    </aside>
    <AnimatePresence>
      <Motion layout :style="{ width: activeSidebarComponent ? (leftSidebarWidth + 'px') : '0px' }"
        class="h-[calc(100vh-60px)]"
        :transition="{ default: { ease: 'easeInOut' }, layout: { duration: 0.3 } }">
        <aside v-if="activeSidebarComponent" :style="{ width: leftSidebarWidth + 'px' }"
          class="overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/5 shrink-0 h-full relative z-40 shadow-2xl">
          <component :is="activeSidebarComponent" :key="editor.sidebarLeft" />
        </aside>
      </Motion>
    </AnimatePresence>
  </template>
</template>