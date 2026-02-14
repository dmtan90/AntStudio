<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from 'pinia';
import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { Sort } from '@icon-park/vue-next';
import EditorPlayback from './components/playback.vue';
import EditorTimeline from './components/timeline.vue';
import EditorFooter2 from './EditorFooter2.vue';
import SplitLine from './components/SplitLine.vue';

// Toggle to test new Google Vids timeline
const useGoogleVidsTimeline = ref(true); // Set to true to use EditorFooter2

const editor = useEditorStore();
const isTablet = useIsTablet();
const MAX_HEIGHT = 500;

const collapsed = computed(() => (isTablet ? 64 : 56));
const expanded = ref(collapsed.value);
const { timelineOpen, canvas } = storeToRefs(editor);
// const footerHeight = computed(() =>
//   editor.timelineOpen ? `${expanded}px` : `${collapsed.value}px`
// );
watch(timelineOpen, (value) => {
  expanded.value = value ? 400 : collapsed.value // Use a reasonable default expanded height
})

const footerHeight = computed({
  get() {
    return expanded.value
  },

  set(value) {
    let height = value;
    if (height > MAX_HEIGHT) {
      height = MAX_HEIGHT
    }
    else if (height < collapsed.value) {
      height = collapsed.value;
    }
    expanded.value = height;
    // console.log("height", height);
  }
});

</script>

<template>
  <footer v-if="editor?.canvas?.timeline" :style="{ height: footerHeight + 'px' }"
    class="footer flex flex-col relative bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
    <SplitLine v-model:newHeight="footerHeight" class="top-0 left-0 right-0 z-10" direction="horizontal"
      :limitSize="{ minHeight: collapsed, maxHeight: MAX_HEIGHT }" />

    <!-- Toggle between timeline versions -->
    <EditorFooter2 v-if="useGoogleVidsTimeline" />
    <template v-else>
      <EditorPlayback />
      <EditorTimeline />
    </template>
  </footer>

</template>
