<script setup lang="ts">
import { computed } from 'vue';
import { cn } from 'video-editor/lib/utils';
import { filterPlaceholder } from 'video-editor/constants/editor';
import Label from 'video-editor/components/ui/label.vue';
// import { ElButton } from 'element-plus';

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
</script>

<template>
  <template v-if="!active">
    <button :class="cn('h-14 w-full relative rounded-md overflow-hidden group')" @click="onClick">
      <img :src="filterPlaceholder" class="h-full w-full object-cover object-center group-hover:scale-105 transition-transform" />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card-foreground" />
      <span class="absolute bottom-1.5 left-2.5 text-card text-xs font-medium">{{ filter.name }}</span>
    </button>
  </template>

  <template v-else>
    <div class="flex flex-col gap-3">
      <button :class="cn('h-14 w-full relative rounded-md overflow-hidden group ring ring-blue-500')" @click="onClick">
        <img :src="filterPlaceholder" class="h-full w-full object-cover object-center group-hover:scale-105 transition-transform" />
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card-foreground" />
        <span class="absolute bottom-1 left-2 text-card text-xs font-medium">{{ filter.name }}</span>
      </button>
      <div class="flex items-center justify-between gap-10" v-if="filter.name != 'None'">
        <Label class="text-xs font-medium">Intensity</Label>
        <el-slider :min="1" :max="100" :step="1" v-model="filterValue" />
      </div>
    </div>
  </template>
</template>