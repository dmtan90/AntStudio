<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { cn } from '@/utils/ui';
import { filterPlaceholder } from 'video-editor/constants/editor';
import Label from 'video-editor/components/ui/label.vue';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";

const { t } = useI18n();
const canvasStore = useCanvasStore();
const { instance } = storeToRefs(canvasStore);

const props = defineProps<{ filter: any; selected: any; onChange: (value: number) => void; onClick: () => void }>();

const active = computed(() => props.selected.effects?.name === props.filter.name);
const intensity = computed(() => props.selected.effects?.intensity || 50);

const image = computed(() => {
  let url = (props.selected as any)?.src;
  let object = (props.selected as any);
  if (object.type == "video") {
    url = (props.selected as any)?.thumbnail;
    if (url) {
      return url;
    }
    const _object = (instance.value as any)?.getItemByName(object.name);
    if (_object) {
      url = (_object as any).getThumbnail();
    }
  }
  return url;
});

const filterValue = computed({
  get(){
    return props.selected.effects?.intensity || 50
  },

  set(value){
    if(props.onChange){
      props.onChange(value);
    }
  }
});

const filterLabel = computed(() => {
    const key = props.filter.value || props.filter.name.toLowerCase();
    const translated = t(`videoEditor.filters.${key}`);
    return translated.includes('videoEditor.filters') ? props.filter.name : translated;
});
</script>

<template>
  <button 
    @click="onClick"
    :class="cn(
      'group relative h-24 w-full rounded-xl overflow-hidden border transition-all duration-300 active:scale-95',
      active ? 'border-brand-primary shadow-lg shadow-brand-primary/20 scale-[1.02] z-10' : 'border-white/5 hover:border-white/20 hover:scale-[1.05]'
    )"
  >
    <div :class="cn('h-full w-full', filter.value ? filter.value : '')">
        <img :src="image" class="h-full w-full object-cover object-center opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
    
    <!-- Gradient Overlay for Label Readability -->
    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
    
    <!-- Label -->
    <span :class="cn(
        'absolute bottom-2.5 left-2.5 text-[9px] font-bold uppercase tracking-widest transition-colors duration-300',
        active ? 'text-brand-primary' : 'text-white/60 group-hover:text-white'
    )">
        {{ filterLabel }}
    </span>

    <!-- Selection Indicator Dot -->
    <div v-if="active" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-white/20"></div>
  </button>
</template>

<style scoped>
</style>