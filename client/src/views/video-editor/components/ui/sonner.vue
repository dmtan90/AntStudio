<script setup lang="ts">
import { Toaster as Sonner } from 'vue-sonner';

</script>

<template>
  <Sonner
    class="toaster group"
    :toastOptions="{
      classes: {
        toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
      },
    }"
    v-bind="$attrs"
  />
</template>