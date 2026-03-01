<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { cn } from '@/utils/ui';
import { filterPlaceholder } from 'video-editor/constants/editor';
import Label from 'video-editor/components/ui/label.vue';

const { t } = useI18n();
const props = defineProps<{ filter: any; selected: any; onChange: (value: number) => void; onClick: () => void }>();

const active = computed(() => props.selected.effects?.name === props.filter.name);
const intensity = computed(() => props.selected.effects?.intensity || 50);
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
  <template v-if="!active">
    <button :class="cn('h-14 w-full relative rounded-md overflow-hidden group')" @click="onClick">
      <img :src="filterPlaceholder" class="h-full w-full object-cover object-center group-hover:scale-105 transition-transform" />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card-foreground" />
      <span class="absolute bottom-1.5 left-2.5 text-card text-xs font-medium">{{ filterLabel }}</span>
    </button>
  </template>

  <template v-else>
    <div class="flex flex-col gap-3">
      <button :class="cn('h-14 w-full relative rounded-md overflow-hidden group ring ring-blue-500')" @click="onClick">
        <img :src="filterPlaceholder" class="h-full w-full object-cover object-center group-hover:scale-105 transition-transform" />
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card-foreground" />
        <span class="absolute bottom-1 left-2 text-card text-xs font-medium">{{ filterLabel }}</span>
      </button>
      <div class="flex items-center justify-between gap-10" v-if="filter.name != 'None'">
        <Label class="text-xs font-medium">{{ t('videoEditor.filters.intensity') }}</Label>
        <el-slider :min="1" :max="100" :step="1" v-model="filterValue" />
      </div>
    </div>
  </template>
</template>