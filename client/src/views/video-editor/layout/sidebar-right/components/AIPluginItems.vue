<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
// import { ElButton } from 'element-plus';
import { type AISelectPluginProps } from './ai.vue';

// interface AISelectPluginProps {
//   plugin: string;
//   onSelectPlugin: (plugin: string, label: string) => void;
// }

interface AIPluginItem {
  label: string;
  value: string;
  title: string;
  thumbnail: string;
}

const pluginElementMap: Record<string, AIPluginItem[]> = {
  image: [
    {
      title: "Background Removal",
      value: "bg-removal",
      label: "BG Removal",
      thumbnail: "https://static.canva.com/web/images/555bf52f35233c8cc5de27c132755e4b.png",
    },
  ],
  video: [
    {
      title: "Background Removal",
      value: "video-bg-removal",
      label: "BG Removal",
      thumbnail: "https://static.canva.com/web/images/555bf52f35233c8cc5de27c132755e4b.png",
    },
    {
      title: "Magic Write",
      value: "magic-write",
      label: "Magic Caption",
      thumbnail: "https://cdn.dribbble.com/userupload/11988346/file/original-051279240ec4c2b4b644c51121e6afa4.jpg?resize=400x0",
    },
  ],
  textbox: [
    {
      title: "Magic Write",
      value: "magic-write",
      label: "Magic Write",
      thumbnail: "https://cdn.dribbble.com/userupload/11988346/file/original-051279240ec4c2b4b644c51121e6afa4.jpg?resize=400x0",
    },
  ],
};

const props = defineProps<{ onSelectPlugin: (plugin: string, label: string) => void }>();

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active);

const plugins = computed(() => {
  if (selected.value && selected.value.type && pluginElementMap[selected.value.type]) {
    return pluginElementMap[selected.value.type];
  }
  return [];
});
</script>

<template>
  <div class="grid grid-cols-2 gap-5">
    <div v-for="item in plugins" :key="item.value" class="flex flex-col items-center gap-3 group">
      <button 
        class="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 transition-all duration-300 hover:border-brand-primary/50 hover:shadow-lg hover:shadow-brand-primary/10 active:scale-95" 
        @click="props.onSelectPlugin!(item.value, item.title)"
      >
        <img :src="item.thumbnail" alt="" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
            <span class="text-[8px] font-black text-white uppercase tracking-[0.2em]">Launch</span>
        </div>
      </button>
      <span class="text-[10px] font-bold uppercase tracking-widest text-center text-white/40 group-hover:text-white transition-colors duration-300 w-11/12 truncate">
        {{ item.label }}
      </span>
    </div>
  </div>
</template>