<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster position="bottom-right" theme="dark" richColors />
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  background: #000;
  color: #fff;
}
</style>
