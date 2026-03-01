<script setup lang="ts">
import { Toaster as Sonner } from 'vue-sonner';

</script>

<template>
  <Sonner class="toaster group" :toastOptions="{
    classes: {
      toast: 'group toast group-[.toaster]:bg-[#1a1a1a]/90 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] group-[.toaster]:font-sans group-[.toaster]:rounded-xl',
      description: 'group-[.toast]:text-white/60',
      actionButton: 'group-[.toast]:bg-brand-primary group-[.toast]:text-white group-[.toast]:font-bold group-[.toast]:shadow-lg',
      cancelButton: 'group-[.toast]:bg-white/10 group-[.toast]:text-white hover:group-[.toast]:bg-white/20 hover:group-[.toast]:text-white',
    },
  }" v-bind="$attrs" />
</template>