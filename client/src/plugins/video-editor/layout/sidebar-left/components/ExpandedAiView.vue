<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';

// Legacy / Specialized Plugins
import StoryboardPlugin from 'video-editor/components/ai/storyboard.vue';
import AvatarsPlugin from 'video-editor/components/ai/avatars.vue';
import DubbingPlugin from 'video-editor/components/ai/dubbing.vue';
import HighlightsPlugin from 'video-editor/components/ai/highlights.vue';
import TypographyPlugin from 'video-editor/components/ai/typography.vue';
import EnrichmentPlugin from 'video-editor/components/ai/enrichment.vue';
import AnalyticsPlugin from 'video-editor/components/ai/analytics.vue';
import BrandPlugin from 'video-editor/components/ai/brand.vue';
import SocialMetaPlugin from 'video-editor/components/ai/social-meta.vue';
import VisionAnalysisPlugin from 'video-editor/components/ai/vision-analysis.vue';

// Refactored Component Plugins
import VoicePlugin from 'video-editor/components/ai/voice.vue';
import ImagePlugin from 'video-editor/components/ai/image.vue';
import VideoPlugin from 'video-editor/components/ai/video.vue';
import CaptionsPlugin from 'video-editor/components/ai/captions.vue';
import SceneDetectionPlugin from 'video-editor/components/ai/scene-detection.vue';
import BeatSyncPlugin from 'video-editor/components/ai/beat-sync.vue';
import SmartTrimPlugin from 'video-editor/components/ai/smart-trim.vue';
import BgRemovalPlugin from 'video-editor/components/ai/bg-removal.vue';
import VideoBgRemovalPlugin from 'video-editor/components/ai/video-bg-removal.vue';
import UpscalePlugin from 'video-editor/components/ai/upscale.vue';
import DenoisePlugin from 'video-editor/components/ai/denoise.vue';
import VectorizerPlugin from 'video-editor/components/ai/vectorizer.vue';
import AutoReframePlugin from 'video-editor/components/ai/auto-reframe.vue';
import MusicPlugin from 'video-editor/components/ai/music.vue';

const props = defineProps<{ match: string }>();
const editor = useEditorStore();
const canvasStore = useCanvasStore();

const effectiveMatch = computed(() => {
  if ((editor as any)._match_override) {
    return (editor as any)._match_override;
  }
  return props.match;
});

onMounted(() => {
  // Clear override when viewing
  setTimeout(() => {
    if ((editor as any)._match_override) (editor as any)._match_override = null;
  }, 500);
});


</script>

<template>
  <div class="h-full flex flex-col p-5 gap-6">

    <!-- STORYBOARD / CREATIVE DIRECTOR -->
    <template v-if="effectiveMatch === 'storyboard'">
      <StoryboardPlugin />
    </template>

    <!-- AI AVATARS / TALKING HEADS -->
    <template v-else-if="effectiveMatch === 'avatars'">
      <AvatarsPlugin />
    </template>

    <!-- AI DUBBING / LOCALIZATION -->
    <template v-else-if="effectiveMatch === 'dubbing'">
      <div class="cinematic-scrollable">
        <DubbingPlugin />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'highlights'">
      <div class="cinematic-scrollable">
        <HighlightsPlugin />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'typography'">
      <div class="cinematic-scrollable">
        <TypographyPlugin />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'enrichment'">
      <div class="cinematic-scrollable">
        <EnrichmentPlugin />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'analytics'">
      <div class="cinematic-scrollable">
        <AnalyticsPlugin />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'brand'">
      <div class="cinematic-scrollable">
        <BrandPlugin />
      </div>
    </template>
    
    <template v-else-if="effectiveMatch === 'social-meta'">
      <div class="cinematic-scrollable">
        <SocialMetaPlugin />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'face-detection'">
      <div class="cinematic-scrollable">
        <VisionAnalysisPlugin type="face" />
      </div>
    </template>

    <template v-else-if="effectiveMatch === 'text-extraction'">
      <div class="cinematic-scrollable">
        <VisionAnalysisPlugin type="ocr" />
      </div>
    </template>

    <!-- VOICE GENERATION -->
    <template v-else-if="effectiveMatch === 'voice'">
      <VoicePlugin />
    </template>

    <!-- IMAGE GENERATION -->
    <template v-else-if="effectiveMatch === 'image'">
      <ImagePlugin />
    </template>

    <!-- VIDEO GENERATION -->
    <template v-else-if="effectiveMatch === 'video'">
      <VideoPlugin />
    </template>

    <!-- MUSIC GENERATION -->
    <template v-else-if="effectiveMatch === 'music'">
      <MusicPlugin />
    </template>

    <!-- CAPTION GENERATION -->
    <template v-else-if="effectiveMatch === 'caption'">
      <CaptionsPlugin />
    </template>

    <!-- SCENE DETECTION -->
    <template v-else-if="effectiveMatch === 'scene-detection'">
      <SceneDetectionPlugin />
    </template>

    <!-- AUTO-CUT TO BEAT -->
    <template v-else-if="effectiveMatch === 'auto-cut'">
      <BeatSyncPlugin />
    </template>

    <!-- SMART TRIM -->
    <template v-else-if="effectiveMatch === 'smart-trim'">
      <SmartTrimPlugin />
    </template>

    <!-- BACKGROUND REMOVAL -->
    <template v-else-if="effectiveMatch === 'background-removal'">
      <div class="flex flex-col gap-6">
        <BgRemovalPlugin />
        <div class="h-px bg-white/5 mx-2"></div>
        <VideoBgRemovalPlugin />
      </div>
    </template>

    <!-- VISION ANALYSIS (OBJECT/FACE/OCR) -->
    <template v-else-if="effectiveMatch === 'object-detection'">
      <VisionAnalysisPlugin type="object" />
    </template>

    <template v-else-if="effectiveMatch === 'face-detection'">
      <VisionAnalysisPlugin type="face" />
    </template>

    <template v-else-if="effectiveMatch === 'text-recognition'">
      <VisionAnalysisPlugin type="ocr" />
    </template>

    <!-- UPSCALE & DENOISE -->
    <template v-else-if="effectiveMatch === 'upscale'">
      <UpscalePlugin />
    </template>

    <template v-else-if="effectiveMatch === 'denoise'">
      <DenoisePlugin />
    </template>

    <!-- VECTORIZER -->
    <template v-else-if="effectiveMatch === 'vectorizer'">
      <VectorizerPlugin />
    </template>

    <!-- AUTO-REFRAME -->
    <template v-else-if="effectiveMatch === 'auto-reframe'">
      <AutoReframePlugin />
    </template>

    <!-- ANALYTICS (COLOR/MOTION) -->
    <template v-else-if="effectiveMatch === 'color-analysis' || effectiveMatch === 'motion-analysis'">
      <AnalyticsPlugin />
    </template>
  </div>
</template>
