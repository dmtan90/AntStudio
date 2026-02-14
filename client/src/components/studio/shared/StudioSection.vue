<template>
  <section class="space-y-4">
    <div v-if="title || $slots.header" class="flex justify-between items-center mb-4">
      <h4 v-if="title" class="text-[10px] font-black uppercase tracking-widest opacity-40">
        {{ title }}
      </h4>
      <slot name="header" />
    </div>
    <div :class="[innerClass, { 'p-4 bg-white/5 border border-white/5 rounded-2xl': padded }]">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  padded?: boolean;
  innerClass?: string;
}>();
</script>
