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
    :class="[
      'group relative w-full flex items-center h-12 px-4 rounded-xl border transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-wait',
      selected 
        ? 'bg-brand-primary/10 border-brand-primary/50 text-brand-primary shadow-lg shadow-brand-primary/10' 
        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'
    ]"
    :style="{ fontFamily: font.family }"
  >
    <!-- Font Name -->
    <span class="text-[13px] font-medium tracking-wide flex-1 text-left truncate">
      {{ font.family }}
    </span>

    <!-- Status Icons -->
    <div class="flex items-center gap-2">
        <div v-if="!isLoaded" class="w-3 h-3 border-2 border-white/20 border-t-brand-primary rounded-full animate-spin"></div>
        <div v-else-if="selected" class="w-5 h-5 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/40">
            <Check :size="10" :stroke-width="5" />
        </div>
    </div>

    <!-- Active Indicator Line -->
    <div v-if="selected" class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-primary rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
  </button>
</template>