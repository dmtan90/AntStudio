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

onMounted(async () => {
  if (props.audio.source) {
    options.value.url = await getFileUrl(props.audio.source, { cached: true });
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
  <div class="flex flex-col items-center gap-2">
    <button @click="onClick" v-loading="loading" class="group shrink-0 h-16 w-20 border overflow-hidden rounded-md shadow-sm relative">
      <!--<img :src="audio.thumbnail" crossOrigin="anonymous" class="h-8 w-full rounded-md transition-transform group-hover:scale-110 object-cover" />-->
      <WaveSurferPlayer class="h-8 w-full rounded-md transition-transform group-hover:scale-110 object-cover z-1" :options="options" @timeupdate="(time: number) => timeUpdateHandler(time)"
        @ready="(duration: number) => readyHandler(duration)" @play="isPlaying = true" @pause="isPlaying = false" @waveSurfer="(ws: WaveSurfer) => readyWaveSurferHandler(ws)" />
      <el-button :icon="isPlaying ? Pause : Play" size="default" text bg circle @click="handlePlay" class="text-[24px] absolute hidden group-hover:inline-flex left-[calc(50%-16px)] top-[calc(50%-16px)] z-3" />
      <el-tag size="small" :type="isPlaying ? 'danger' : 'info'" effect="light" round class="absolute inline-flex group-hover:hidden right-[5px] top-[5px] z-2"> {{ isPlaying ? currentTime : totalDuration }}</el-tag>
      <!--<div @click="handlePlay" class="absolute hidden group-hover:inline-flex items-center justify-between gap-2 bottom-1 left-1 right-1 text-card bg-foreground/50 pr-1.5 rounded-sm">
        <el-button size="small" text circle @click="handlePlay" class="px-1.5 py-1 transition-transform hover:scale-125">
          <template v-if="isPlaying">
            <Pause :size="14" class="fill-card" />
          </template>
          <template v-else>
            <Play :size="14" class="fill-card" />
          </template>
        </el-button>
        <span class="text-xxs font-small">{{ totalDuration }}</span>
        <div role="button" class="px-1.5 py-1 transition-transform hover:scale-125">
          <template v-if="isPlaying">
            <Pause :size="14" class="fill-card" />
          </template>
          <template v-else>
            <Play :size="14" class="fill-card" />
          </template>
        </div>
        <span class="text-xxs font-medium">{{ totalDuration }}</span>
        <audio ref="audioRef">
          <source :src="audio.source" />
        </audio>
      </div>-->
    </button>
    <el-tooltip :content="audio.name" placement="top">
      <span class="text-xxs font-medium w-20 px-1 mx-auto whitespace-nowrap overflow-hidden text-ellipsis text-center">{{ audio.name }}</span>
    </el-tooltip>
  </div>
</template>
