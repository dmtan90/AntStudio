<script setup lang="ts">
import { Cube as Box, Round as Circle, ImageFiles as Image, Music, Rectangle as RectangleHorizontal, Triangle, Text as Type, VideoFile as Video, ChartLineArea as ChartArea } from '@icon-park/vue-next';

defineProps<{ 
  type?: string; 
  name?: string, 
  text?: boolean
}>();
// console.log(type, name);
</script>

<template>
  <div v-if="type === 'text' || type === 'textbox'" class="inline-flex items-center gap-1.5">
    <Type :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Text</span>
  </div>
  <div v-else-if="type === 'video'" class="inline-flex items-center gap-1.5">
    <Video :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Video</span>
  </div>
  <div v-else-if="type === 'image'" class="inline-flex items-center gap-1.5">
    <Image :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Image</span>
  </div>
  <div v-else-if="type === 'triangle'" class="inline-flex items-center gap-1.5">
    <Triangle :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Triangle</span>
  </div>
  <div v-else-if="type === 'rect'" class="inline-flex items-center gap-1.5">
    <RectangleHorizontal :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Rectangle</span>
  </div>
  <div v-else-if="type === 'ellipse' || type === 'circle'" class="inline-flex items-center gap-1.5">
    <Circle :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Ellipse</span>
  </div>
  <div v-else-if="type === 'path' || type === 'line' || type === 'polygon' || type === 'polyline'" class="inline-flex items-center gap-1.5">
    <Box :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">{{ name?.split("_").at(0) || "Shape" }}</span>
  </div>
  <div v-else-if="type === 'audio'" class="inline-flex items-center gap-1.5">
    <Music :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Audio</span>
  </div>
  <div v-else-if="type === 'chart'" class="inline-flex items-center gap-1.5">
    <ChartArea :size="12" class="opacity-70" />
    <span v-if="text" class="text-[10px] font-black uppercase tracking-tighter">Chart</span>
  </div>
</template>
