<template>
  <div class="mobile-ingest min-h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
    <!-- Top Action Bar -->
    <header class="p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
      <div class="flex items-center gap-2">
         <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse" v-if="isLive"></div>
         <span class="text-[10px] font-black tracking-widest uppercase">{{ isLive ? t('mobileIngest.status.live') : t('mobileIngest.status.standby') }}</span>
      </div>
      <div class="flex items-center gap-4">
         <div class="text-right">
            <p class="text-[8px] opacity-40 uppercase font-black">{{ t('mobileIngest.stats.bitrate') }}</p>
            <p class="text-[10px] font-mono font-bold">{{ bitrate }} Mbps</p>
         </div>
         <button class="bg-white/10 rounded-full p-2" @click="toggleSettings">
            <setting-two size="18" />
         </button>
      </div>
    </header>

    <!-- Main Viewfinder -->
    <div class="flex-1 relative flex items-center justify-center bg-black/40">
       <video ref="cameraPreview" autoplay playsinline muted class="w-full h-full object-cover"></video>
       
       <!-- UI Overlays -->
       <div class="absolute inset-0 pointer-events-none border-[1px] border-white/10">
          <div class="absolute top-1/2 left-4 w-4 h-[1px] bg-white/20"></div>
          <div class="absolute top-1/2 right-4 w-4 h-[1px] bg-white/20"></div>
          <div class="absolute top-4 left-1/2 w-[1px] h-4 bg-white/20"></div>
          <div class="absolute bottom-4 left-1/2 w-[1px] h-4 bg-white/20"></div>
       </div>

       <!-- Overlay: Remote Instructions -->
       <div v-if="remoteCommand" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 px-6 py-3 rounded-2xl animate-bounce">
          <p class="text-[10px] font-black uppercase tracking-tighter">{{ remoteCommand }}</p>
       </div>
    </div>

    <!-- Bottom Controls -->
    <footer class="p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent z-10 flex flex-col gap-8">
       <div class="flex justify-between items-center">
          <button class="control-btn w-12 h-12 rounded-full bg-white/5 flex items-center justify-center" @click="toggleMic">
             <voice-one v-if="!micMuted" size="20" />
             <voice-off v-else size="20" class="text-red-500" />
          </button>

          <button class="shutter-btn w-20 h-20 rounded-full border-4 border-white flex items-center justify-center" @click="toggleBroadcast">
             <div class="w-16 h-16 rounded-full transition-all duration-300" :class="isBroadcasting ? 'bg-red-500 rounded-lg scale-75' : 'bg-white scale-100'"></div>
          </button>

          <button class="control-btn w-12 h-12 rounded-full bg-white/5 flex items-center justify-center" @click="switchCamera">
             <camera-two size="20" />
          </button>
       </div>

       <div class="flex justify-center gap-8">
          <div class="stat-pill text-center">
             <p class="text-[8px] opacity-30 font-black uppercase mb-1">{{ t('mobileIngest.stats.latency') }}</p>
             <p class="text-[10px] font-bold">142ms</p>
          </div>
          <div class="stat-pill text-center">
             <p class="text-[8px] opacity-30 font-black uppercase mb-1">{{ t('mobileIngest.stats.deviceTemp') }}</p>
             <p class="text-[10px] font-bold text-green-400">{{ t('mobileIngest.stats.tempNormal') }}</p>
          </div>
          <div class="stat-pill text-center">
             <p class="text-[8px] opacity-30 font-black uppercase mb-1">{{ t('mobileIngest.stats.resolution') }}</p>
             <p class="text-[10px] font-bold">1080p60</p>
          </div>
       </div>
    </footer>

    <!-- Pairing Overlay -->
    <div v-if="!paired" class="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center">
       <div class="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20">
          <connection-point size="40" class="text-blue-400" />
       </div>
       <h2 class="text-2xl font-black mb-4">{{ t('mobileIngest.pairing.title') }}</h2>
       <p class="text-gray-400 text-sm mb-10">{{ t('mobileIngest.pairing.desc') }}</p>
       <div class="animate-pulse w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div class="w-1/2 h-full bg-blue-500"></div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SettingTwo, VoiceOne, VoiceOff, CameraTwo, ConnectionPoint } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const isLive = ref(false);
const isBroadcasting = ref(false);
const bitrate = ref(4.2);
const micMuted = ref(false);
const paired = ref(false);
const remoteCommand = ref('');
const cameraPreview = ref<HTMLVideoElement | null>(null);

const initSession = () => {
    // Mock pairing from URL param
    if (window.location.search.includes('token=ant_')) {
        paired.value = true;
        startCamera();
    }
};

const startCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
        if (cameraPreview.value) cameraPreview.value.srcObject = stream;
    } catch (e) {
        toast.error(t('mobileIngest.toasts.cameraRequired'));
    }
};

const toggleBroadcast = () => {
    isBroadcasting.value = !isBroadcasting.value;
    if (isBroadcasting.value) {
        toast.success(t('mobileIngest.toasts.broadcastStarted'));
    }
};

const switchCamera = () => {
    toast.info(t('mobileIngest.toasts.switchingCamera'));
};

const toggleMic = () => {
    micMuted.value = !micMuted.value;
};

const toggleSettings = () => {
    toast(t('mobileIngest.toasts.settingsInfo'));
};

onMounted(() => {
    setTimeout(initSession, 1000);
});
</script>

<style lang="scss" scoped>
.mobile-ingest {
  background-color: #000;
  font-family: 'Outfit', sans-serif;
  touch-action: none;
}

.stat-pill {
  min-width: 60px;
  background: rgba(0,0,0,0.5);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
}

.control-btn {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    &:active { transform: scale(0.9); }
}

.shutter-btn {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    &:active { transform: scale(0.95); }
    box-shadow: 0 0 20px rgba(255,255,255,0.1);
}
</style>
