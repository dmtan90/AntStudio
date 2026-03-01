<script setup lang="ts">
import BGRemovalPlugin from 'video-editor/components/ai/bg-removal.vue';
import VideoBgRemovalPlugin from 'video-editor/components/ai/video-bg-removal.vue';
import MagicWritePlugin from 'video-editor/components/ai/magic-write.vue';
import MagicCaptionPlugin from 'video-editor/components/ai/captions.vue';
import UpscalePlugin from 'video-editor/components/ai/upscale.vue';
import VectorizerPlugin from 'video-editor/components/ai/vectorizer.vue';
import SmartTrimPlugin from 'video-editor/components/ai/smart-trim.vue';
import AutoReframePlugin from 'video-editor/components/ai/auto-reframe.vue';
import BeatSyncPlugin from 'video-editor/components/ai/beat-sync.vue';
import BulkCreativePlugin from 'video-editor/components/ai/bulk-creative.vue';
import StoryboardPlugin from 'video-editor/components/ai/storyboard.vue';
import HighlightsPlugin from 'video-editor/components/ai/highlights.vue';
import SocialMetaPlugin from 'video-editor/components/ai/social-meta.vue';
import DubbingPlugin from 'video-editor/components/ai/dubbing.vue';
import VisionAnalysisPlugin from 'video-editor/components/ai/vision-analysis.vue';

const props = defineProps<{ plugin: string }>();
</script>

<template>
  <template v-if="props.plugin === 'bg-removal'">
    <BGRemovalPlugin />
  </template>
  <template v-if="props.plugin === 'video-bg-removal'">
    <VideoBgRemovalPlugin />
  </template>
  <template v-else-if="props.plugin === 'magic-write'">
    <MagicWritePlugin />
  </template>
  <template v-else-if="props.plugin === 'magic-caption'">
    <MagicCaptionPlugin />
  </template>
  <template v-else-if="props.plugin === 'upscale'">
    <UpscalePlugin />
  </template>
  <template v-else-if="props.plugin === 'vectorize'">
    <VectorizerPlugin />
  </template>
  <template v-else-if="props.plugin === 'smart-trim'">
    <SmartTrimPlugin />
  </template>
  <template v-else-if="props.plugin === 'auto-reframe'">
    <AutoReframePlugin />
  </template>
  <template v-else-if="props.plugin === 'beat-sync'">
    <BeatSyncPlugin />
  </template>
  <template v-else-if="props.plugin === 'bulk-replace'">
    <BulkCreativePlugin />
  </template>
  <template v-else-if="props.plugin === 'storyboard'">
    <StoryboardPlugin />
  </template>
  <template v-else-if="props.plugin === 'highlights'">
    <HighlightsPlugin />
  </template>
  <template v-else-if="props.plugin === 'social-meta'">
    <SocialMetaPlugin />
  </template>
  <template v-else-if="props.plugin === 'translation'">
    <DubbingPlugin />
  </template>
  <template v-else-if="props.plugin === 'face-detect'">
    <VisionAnalysisPlugin type="face" />
  </template>
  <template v-else-if="props.plugin === 'ocr'">
    <VisionAnalysisPlugin type="ocr" />
  </template>
  <template v-else-if="props.plugin === 'object-detect'">
    <VisionAnalysisPlugin type="object" />
  </template>
  <template v-else>
    <!-- Render nothing -->
  </template>
</template>
