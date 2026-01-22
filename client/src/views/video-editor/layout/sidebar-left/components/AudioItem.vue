<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from 'vue';
import { Pause, Play } from '@icon-park/vue-next';
import { formatMediaDuration } from 'video-editor/lib/time';
import { getFileUrl } from '@/utils/api';
import type WaveSurfer from 'wavesurfer.js'
import { WaveSurferPlayer } from '@meersagor/wavesurfer-vue'
import { cn } from 'video-editor/lib/utils';

const props = defineProps<{ audio: any; onClick?: () => void }>();

const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const loading = ref(true);

// const handleEnd = () => {
//   isPlaying.value = false
// };

// watch(audioRef, (newAudioRef) => {
//   if (newAudioRef) {
//     newAudioRef.addEventListener("ended", handleEnd);
//   }
// });

// onUnmounted(() => {
//   if(audioRef.value){
//     audioRef.value?.removeEventListener("ended", handleEnd);
//   }
// });

const options = ref({
  height: 32,
  waveColor: "#6A24FF",
  progressColor: "#6A24FF",
  barGap: 3,
  barWidth: 3,
  barRadius: 2,
  cursorWidth: 0,
  duration: 78,
  url: '',
})

onMounted(() => {
  if (props.audio.source) {
    options.value.url = getFileUrl(props.audio.source);
  }
});

const currentTime = ref<string>('00:00')
const totalDuration = ref<string>('00:00')
const waveSurfer = ref<WaveSurfer | null>(null)

const formatTime = (seconds: number): string => [seconds / 60, seconds % 60].map((v) => `0${Math.floor(v)}`.slice(-2)).join(':')

const timeUpdateHandler = (time: number) => {
  currentTime.value = formatTime(time)
}

const readyHandler = (duration: any) => {
  totalDuration.value = formatTime(duration)
  loading.value = false;
}

const readyWaveSurferHandler = (ws: WaveSurfer) => {
  waveSurfer.value = ws
}

const handlePlay = (event: MouseEvent) => {
  event.stopPropagation();
  event.preventDefault();
  if (isPlaying.value) {
    isPlaying.value = false;
  } else {
    isPlaying.value = true;
  }
  waveSurfer.value?.playPause();
};

</script>

<template>
  <div class="flex flex-col items-center gap-2 w-full group/audio">
    <button @click="onClick" v-loading="loading" 
      class="group shrink-0 h-16 w-full border border-white/5 bg-white/5 overflow-hidden rounded-xl shadow-sm relative transition-all duration-300 hover:bg-white/10 hover:border-white/10 hover:shadow-lg hover:shadow-purple-500/5">
      
      <div class="opacity-50 group-hover:opacity-100 transition-opacity px-2 flex items-center h-full">
        <WaveSurferPlayer 
          class="h-8 w-full rounded-md z-1" 
          :options="options" 
          @timeupdate="(time: number) => timeUpdateHandler(time)"
          @ready="(duration: number) => readyHandler(duration)" 
          @play="isPlaying = true" 
          @pause="isPlaying = false" 
          @waveSurfer="(ws: WaveSurfer) => readyWaveSurferHandler(ws)" 
        />
      </div>

      <!-- Play Button Overlay -->
      <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
        <el-button 
          :icon="isPlaying ? Pause : Play" 
          size="large" 
          text 
          bg 
          circle 
          @click="handlePlay" 
          class="!bg-white/10 !backdrop-blur-md !border-white/20 !text-white hover:!bg-brand-primary hover:!border-brand-primary transition-all scale-90 group-hover:scale-100" 
        />
      </div>

      <!-- Time Indicator -->
      <div class="absolute right-2 top-2 z-20 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/5 text-[10px] font-mono text-white/40 group-hover:text-white/90 transition-colors">
          {{ isPlaying ? currentTime : totalDuration }}
      </div>
    </button>
    
    <el-tooltip :content="audio.name" placement="top" effect="dark">
      <span class="text-[10px] font-bold uppercase tracking-wider w-full px-1 mx-auto whitespace-nowrap overflow-hidden text-ellipsis text-center text-white/40 group-hover/audio:text-white/90 transition-colors">
        {{ audio.name }}
      </span>
    </el-tooltip>
  </div>
</template>
