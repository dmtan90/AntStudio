<template>
  <div class="vtuber-music-performance relative w-full h-full bg-black rounded-xl overflow-hidden">
    <!-- VTuber Viewer -->
    <div class="absolute inset-0">
      <VTuberViewer
        v-if="vtuber"
        :model-type="vtuber.visual?.modelType || 'vrm'"
        :model-url="vtuber.visual?.modelUrl"
        :speaking-vol="audioLevel"
        :aura-enabled="vtuber.performanceConfig?.auraEnabled"
        :aura-color="vtuber.performanceConfig?.auraColor"
        :particle-type="vtuber.performanceConfig?.particleType"
        :particle-density="vtuber.performanceConfig?.particleDensity"
        :lighting-preset="vtuber.performanceConfig?.lightingPreset || 'vocal_orange'"
        :active-camera-path="vtuber.performanceConfig?.activeCameraPath"
        :auto-director-enabled="true"
        :background-url="vtuber.visual?.backgroundUrl"
        :emotion="vtuber.currentEmotion || vtuber.emotion"
        :gesture="vtuber.currentGesture || vtuber.gesture"
        :animation-config="vtuber.animationConfig"
      />
    </div>
    
    <!-- Lyrics Overlay -->
    <LyricsOverlay
      v-if="lyrics && lyrics.length > 0 && showLyrics"
      :lyrics="lyrics"
      :current-time="currentTime"
      :style="lyricsStyle"
      :position="lyricsPosition"
    />
    
    <!-- Audio Player (hidden) -->
    <audio
      ref="audioPlayer"
      :src="audioUrl"
      @timeupdate="handleTimeUpdate"
      @ended="handleEnded"
      @loadedmetadata="handleLoaded"
      crossorigin="anonymous"
      hidden
    />
    
    <!-- Performance Controls -->
    <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <div class="flex items-center gap-3">
        <!-- Play/Pause Button -->
        <el-button
          @click="togglePlay"
          :icon="isPlaying ? PauseOne : Play"
          circle
          type="primary"
          size="large"
        />
        
        <!-- Progress Slider -->
        <div class="flex-1">
          <el-slider
            v-model="currentTime"
            :max="duration"
            :show-tooltip="false"
            @change="seek"
            class="performance-slider"
          />
          <div class="flex justify-between text-[10px] text-white/60 mt-1">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>
        
        <!-- Lyrics Toggle -->
        <el-button
          @click="showLyrics = !showLyrics"
          :icon="showLyrics ? 'View' : 'PreviewClose'"
          circle
          :type="showLyrics ? 'primary' : 'default'"
        />
        
        <!-- Volume Control -->
        <div class="flex items-center gap-2 w-32">
          <VolumeSmall theme="outline" size="16" class="text-white/60" />
          <el-slider v-model="volume" :max="100" @change="updateVolume" />
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span class="text-white/80 text-sm">Loading performance...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import VTuberViewer from './VTuberViewer.vue';
import LyricsOverlay from '../studio/overlays/LyricsOverlay.vue';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import { Play, PauseOne, VolumeSmall } from '@icon-park/vue-next';

const props = defineProps<{
  vtuber: any;
  audioUrl: string;
  lyrics?: any[];
  lyricsStyle?: 'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale';
  lyricsPosition?: 'top' | 'center' | 'bottom';
}>();

const emit = defineEmits<{
  ended: [];
}>();

const audioPlayer = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const audioLevel = ref(0);
const volume = ref(80);
const showLyrics = ref(true);
const loading = ref(true);

const { speakingVol, analyzeMusicAudio } = useAudioVisualizer();
let cleanup: (() => void) | null = null;

// Watch speakingVol from audio visualizer
watch(speakingVol, (val) => {
  audioLevel.value = val;
});

onMounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value / 100;
    
    // Setup music-specific audio analysis
    cleanup = analyzeMusicAudio(audioPlayer.value);
    
    // Auto-play when ready
    audioPlayer.value.addEventListener('canplay', () => {
      loading.value = false;
    });
  }
});

onBeforeUnmount(() => {
  if (cleanup) cleanup();
  if (audioPlayer.value) {
    audioPlayer.value.pause();
  }
});

const togglePlay = () => {
  if (!audioPlayer.value) return;
  
  if (isPlaying.value) {
    audioPlayer.value.pause();
  } else {
    audioPlayer.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

const handleTimeUpdate = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
  }
};

const handleLoaded = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration;
    loading.value = false;
  }
};

const seek = (time: number) => {
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = time;
  }
};

const updateVolume = (val: number) => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = val / 100;
  }
};

const handleEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  emit('ended');
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped lang="scss">
.vtuber-music-performance {
  min-height: 600px;
}

.performance-slider {
  :deep(.el-slider__runway) {
    background: rgba(255, 255, 255, 0.1);
    height: 4px;
  }
  
  :deep(.el-slider__bar) {
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  }
  
  :deep(.el-slider__button) {
    width: 12px;
    height: 12px;
    border: 2px solid #fff;
    background: #3b82f6;
  }
}
</style>
