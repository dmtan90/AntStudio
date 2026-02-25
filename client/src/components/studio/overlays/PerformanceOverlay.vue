<template>
  <div class="performance-overlay absolute inset-0 pointer-events-none z-50">
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
    
    <!-- Performance Controls (Minimal) -->
    <div class="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <el-button
          @click="togglePlay"
          :icon="isPlaying ? PauseOne : Play"
          circle
          type="primary"
          size="small"
        />
        
        <div class="w-32">
          <el-slider
            v-model="currentTime"
            :max="duration"
            :show-tooltip="false"
            @change="seek"
            class="performance-slider-mini"
          />
        </div>
        
        <span class="text-[10px] text-white/80 font-mono">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

        <el-button
          @click="showLyrics = !showLyrics"
          :icon="showLyrics ? 'View' : 'PreviewClose'"
          circle
          text
          size="small"
          title="Toggle Lyrics"
        />
        
         <el-button
          @click="$emit('close')"
          :icon="Close"
          circle
          type="danger"
          size="small"
          title="Stop Performance"
        />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import { Play, PauseOne, Close } from '@icon-park/vue-next';
import { audioMixerService } from '@/utils/ai/AudioMixerService';

const props = defineProps<{
  audioUrl: string;
  lyrics?: any[];
  lyricsStyle?: 'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale';
  lyricsPosition?: 'top' | 'center' | 'bottom';
}>();

const emit = defineEmits<{
  ended: [];
  close: [];
  'audio-level': [number]; // Emit audio level for external lip-sync
  'lyrics-state': [{ currentTime: number; showLyrics: boolean }]; // Emit lyrics state
}>();

const audioPlayer = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
// const audioLevel = ref(0); // Managed via emit
const showLyrics = ref(true);

const { speakingVol, analyzeMusicAudio } = useAudioVisualizer();
let cleanup: (() => void) | null = null;

// Watch speakingVol and emit to parent (for lip-sync)
watch(speakingVol, (val) => {
  emit('audio-level', val);
});

// Emit lyrics state changes
watch([currentTime, showLyrics], () => {
  emit('lyrics-state', { currentTime: currentTime.value, showLyrics: showLyrics.value });
}, { immediate: true });

onMounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = 0.8;
    
    // Setup music-specific audio analysis
    cleanup = analyzeMusicAudio(audioPlayer.value);


    // Auto-play when ready
    audioPlayer.value.addEventListener('canplay', () => {
      // Route audio to master mixer for broadcast (Safe check)
      try {
        if (!audioPlayer.value) return; 
        const stream = (audioPlayer.value as any).captureStream ? 
            (audioPlayer.value as any).captureStream() : 
            (audioPlayer.value as any).mozCaptureStream();
            
        // Ensure stream has audio tracks before adding
        if (stream && stream.getAudioTracks().length > 0) {
            audioMixerService.addTrack('performance_audio', stream);
            console.log("[Performance] Routed audio to master mixer");
        } else {
             console.warn("[Performance] Stream captured but no audio tracks found yet.");
        }
      } catch (e) {
        console.error("[Performance] Failed to route audio to mixer:", e);
      }

      if (!isPlaying.value) {
        audioPlayer.value?.play()
          .then(() => { isPlaying.value = true; })
          .catch(e => console.error("Auto-play blocked:", e));
      }
    });

    audioPlayer.value.addEventListener('error', (e) => {
        console.error("Audio playback error:", e);
    });
  }
});

onBeforeUnmount(() => {
  if (cleanup) cleanup();
  audioMixerService.removeTrack('performance_audio');
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
  }
};

const seek = (time: number) => {
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = time;
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

<style scoped>
.performance-slider-mini {
    --el-slider-height: 4px;
    --el-slider-button-size: 12px;
    --el-slider-main-bg-color: #3b82f6;
}
</style>
