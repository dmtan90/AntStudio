<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { toast } from 'vue-sonner';
import { Loading } from '@element-plus/icons-vue';
import { getFileUrl } from '@/utils/api';
import { generateImage, generateVoice, generateVideo, generateCaptions } from 'video-editor/api/ai';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
const props = defineProps<{ match: string }>();
const editor = useEditorStore();

const isGenerating = ref(false);

// Voice State
const voiceText = ref('');
const selectedVoice = ref('en-US-Neural2-J');
const voices = [
  { value: 'en-US-Neural2-J', label: 'Male (Studio)' },
  { value: 'en-US-Neural2-F', label: 'Female (Studio)' },
  { value: 'en-US-News-K', label: 'Female (News)' },
  { value: 'en-US-News-N', label: 'Male (News)' },
];

// Image State
const imagePrompt = ref('');
const imageStyle = ref('Cinematic');
const imageAspectRatio = ref('16:9');

// Video State
const videoPrompt = ref('');
const videoDuration = ref(5);

// Caption State
const captionLanguage = ref('en');

const handleGenerate = async (type: string) => {
  isGenerating.value = true;
  try {
    const userMediaStore = useUserMediaStore();

    switch (type) {
      case 'voice': {
        const res = await generateVoice({ text: voiceText.value, voice: selectedVoice.value });
        if (res.success && res.data.media) {
          toast.success("Voice generated successfully!");
          userMediaStore.addLocalItem('audio', res.data.media);
          // Also optionally add to editor track if needed, but 'resource management' focus relies on store
        }
        break;
      }
      case 'image': {
        const res = await generateImage({
          prompt: imagePrompt.value,
          style: imageStyle.value,
          aspectRatio: imageAspectRatio.value
        });
        if (res.success && res.data.media) {
          toast.success("Image generated successfully!");
          userMediaStore.addLocalItem('image', res.data.media);
        }
        break;
      }
      case 'video': {
        // Advanced: Handle polling or background notification
        const res = await generateVideo({
          prompt: videoPrompt.value,
          duration: videoDuration.value
        });
        if (res.success) {
          toast.success("Video generation started! It will appear in your videos shortly.");
          // Trigger a background poll or just refresh after a delay
          setTimeout(() => { userMediaStore.refreshVideos() }, 5000);
          setTimeout(() => { userMediaStore.refreshVideos() }, 15000);
        }
        break;
      }
      case 'caption': {
        await generateCaptions({ language: captionLanguage.value });
        toast.success("Captions generated!");
        break;
      }
    }

  } catch (e: any) {
    console.error(e);
    toast.error(`Generation failed: ${e.message || 'Unknown error'}`);
  } finally {
    isGenerating.value = false;
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-5 gap-6">

    <!-- VOICE GENERATION -->
    <template v-if="match === 'voice'">
      <div class="flex flex-col gap-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Script</label>
        <el-input v-model="voiceText" type="textarea" :rows="6" placeholder="Enter text to speak..."
          class="cinematic-input" resize="none" />

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Voice Model</label>
        <el-select v-model="selectedVoice" class="cinematic-select" placeholder="Select Voice">
          <el-option v-for="v in voices" :key="v.value" :label="v.label" :value="v.value" />
        </el-select>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('voice')">
          <span class="text-xs font-bold uppercase tracking-widest">Generate Voice</span>
        </el-button>
      </div>
    </template>

    <!-- IMAGE GENERATION -->
    <template v-else-if="match === 'image'">
      <div class="flex flex-col gap-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Prompt</label>
        <el-input v-model="imagePrompt" type="textarea" :rows="4" placeholder="Describe the image..."
          class="cinematic-input" resize="none" />

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Style</label>
            <el-select v-model="imageStyle" class="cinematic-select">
              <el-option label="Cinematic" value="Cinematic" />
              <el-option label="Anime" value="Anime" />
              <el-option label="Photorealistic" value="Photorealistic" />
              <el-option label="3D Render" value="3D Render" />
            </el-select>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Ratio</label>
            <el-select v-model="imageAspectRatio" class="cinematic-select">
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
              <el-option label="1:1" value="1:1" />
            </el-select>
          </div>
        </div>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('image')">
          <span class="text-xs font-bold uppercase tracking-widest">Generate Image</span>
        </el-button>
      </div>
    </template>

    <!-- VIDEO GENERATION -->
    <template v-else-if="match === 'video'">
      <div class="flex flex-col gap-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Prompt</label>
        <el-input v-model="videoPrompt" type="textarea" :rows="4" placeholder="Describe the video movement and scene..."
          class="cinematic-input" resize="none" />

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Duration (sec)</label>
        <el-slider v-model="videoDuration" :min="3" :max="6" :step="1" show-stops />
        <div class="flex justify-between text-xs text-white/40 font-mono">
          <span>3s</span><span>6s</span>
        </div>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('video')">
          <span class="text-xs font-bold uppercase tracking-widest">Generate Video</span>
        </el-button>
      </div>
    </template>

    <!-- CAPTION GENERATION -->
    <template v-else-if="match === 'caption'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs leading-relaxed">
          <p>Automatically analyze the timeline audio and generate synchronized captions.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Source Language</label>
        <el-select v-model="captionLanguage" class="cinematic-select">
          <el-option label="English (US)" value="en" />
          <el-option label="Vietnamese" value="vi" />
          <el-option label="Japanese" value="ja" />
        </el-select>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('caption')">
          <span class="text-xs font-bold uppercase tracking-widest">Analyze & Generate</span>
        </el-button>
      </div>
    </template>
  </div>
</template>
