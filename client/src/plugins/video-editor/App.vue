<script setup lang="ts">
import { provide } from 'vue';
import Editor from './views/Editor.vue';
// import Tooltip from './components/ui/tooltip.vue';
import { useThemeProvider, type ThemeProviderState } from './context/theme';

const themeProvider = useThemeProvider() as ThemeProviderState;
provide('theme', themeProvider);
</script>

<template>
  <Editor />
</template>