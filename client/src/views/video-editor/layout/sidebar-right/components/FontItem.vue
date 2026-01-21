<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Right as ArrowRight, Check } from '@icon-park/vue-next';
import WebFont from 'webfontloader';
// import { ElButton } from 'element-plus';

const props = defineProps<{ font: any; selected: boolean; onClick: () => void }>();

const isLoaded = ref(false);

watch(() => props.font, (newFont) => {
  const loaded = Array.from(document.fonts).some(({ family }) => family === newFont.family);
  if (loaded) {
    isLoaded.value = true;
  } else {
    const styles = newFont.styles.map((style: any) => `${style.weight}`).join(",");
    const family = `${newFont.family}:${styles}`;
    WebFont.load({
      google: {
        families: [family],
      },
      fontactive: (activeFamily: string) => {
        if (activeFamily === newFont.family) isLoaded.value = true;
      },
    });
  }
}, { immediate: true });

</script>

<template>
  <button
    @click="onClick"
    :disabled="!isLoaded"
    class="inline-flex items-center text-sm text-start hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors p-2.5 gap-4 disabled:opacity-50 disabled:cursor-wait"
    :style="{ fontFamily: font.family }"
  >
    <ArrowRight :size="15" />
    <span>{{ font.family }}</span>
    <Check v-if="selected" :size="15" class="ml-auto" />
  </button>
</template>