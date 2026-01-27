<template>
  <div class="guest-room dark-theme min-h-screen flex flex-col items-center justify-center p-6">
    <div v-if="loading" class="text-center animate-pulse">
       <div class="icon-orb mb-6 mx-auto bg-white/10"><connection theme="outline" size="32" /></div>
       <p class="opacity-50">Validating your invite...</p>
    </div>

    <div v-else-if="error" class="error-box text-center glass-card p-10 max-w-md">
       <div class="icon-orb mb-6 mx-auto bg-red-500/20 text-red-500"><close theme="outline" size="32" /></div>
       <h2 class="text-2xl font-black mb-4">Invite Invalid</h2>
       <p class="opacity-50 mb-8">{{ error }}</p>
       <router-link to="/" class="primary-btn px-8 inline-block">Return Home</router-link>
    </div>

    <div v-else class="onboarding-flow max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10">
       <!-- Preview Area -->
       <div class="preview-section glass-card p-6 flex flex-col gap-6">
          <div class="preview-video aspect-video bg-black rounded-2xl overflow-hidden relative border border-white/10">
             <video ref="localVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>
             <div class="audio-visualizer absolute bottom-4 left-4 right-4 h-1 flex gap-1">
                <div v-for="i in 20" :key="i" class="flex-1 bg-blue-500/30 rounded-full" :style="{ height: '100%', opacity: Math.random() }"></div>
             </div>
          </div>
          <div class="media-controls flex justify-center gap-4">
             <button class="ctrl-btn" :class="{ active: micOn }" @click="micOn = !micOn">
                <microphone v-if="micOn" theme="filled" />
                <microphone v-else theme="outline" class="opacity-30" />
             </button>
             <button class="ctrl-btn" :class="{ active: camOn }" @click="camOn = !camOn">
                <camera v-if="camOn" theme="filled" />
                <camera-five v-else theme="outline" class="opacity-30" />
             </button>
          </div>
       </div>

       <!-- Join Form -->
       <div class="form-section flex flex-col justify-center">
          <div class="mb-8">
             <h1 class="text-4xl font-black text-white mb-2 leading-tight">Ready to Join?</h1>
             <p class="text-gray-400">You've been invited to broadcast live on AntStudio.</p>
          </div>

          <div class="join-info mb-10">
             <div class="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div class="w-10 h-10 rounded-full bg-blue-500 @include flex-center">
                   <broadcast theme="filled" class="text-white" />
                </div>
                <div>
                   <p class="text-[10px] font-black uppercase opacity-50">Active Session</p>
                   <p class="font-bold">Alpha Production Studio</p>
                </div>
             </div>
          </div>

          <div class="form-group mb-8">
             <label class="block text-[10px] font-black uppercase opacity-30 mb-2 tracking-widest">Your Display Name</label>
             <el-input v-model="displayName" placeholder="Enter name for lower-thirds..." class="glass-input h-14" />
          </div>

          <button class="primary-btn h-14 text-lg font-black" :disabled="!displayName" @click="handleJoin">
             JOIN BROADCAST NOW
          </button>
          <p class="text-center text-[10px] opacity-20 uppercase font-black mt-6 tracking-widest">Powered by AntStudio WebRTC Bridge</p>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  Connection, Close, Camera, CameraFive, 
  Microphone, Broadcast 
} from '@icon-park/vue-next';
import axios from 'axios';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const displayName = ref('');
const micOn = ref(true);
const camOn = ref(true);
const localVideo = ref<HTMLVideoElement | null>(null);
let localStream: MediaStream | null = null;

const validateToken = async () => {
    const token = route.query.token as string;
    if (!token) {
        error.value = "No invite token provided.";
        loading.value = false;
        return;
    }

    try {
        const res = await axios.get(`/api/streaming/guest/validate/${token}`);
        if (res.data.success) {
            loading.value = false;
            initMedia();
        }
    } catch (e: any) {
        error.value = e.response?.data?.error || "Expired or invalid invite.";
        loading.value = false;
    }
};

const initMedia = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo.value) {
            localVideo.value.srcObject = localStream;
        }
    } catch (e) {
        toast.error("Media permission denied");
    }
};

const handleJoin = () => {
    toast.success("Connecting to Studio...");
    // Real P2P WebRTC handshake would happen here
    setTimeout(() => {
        toast.info("In the Green Room! Waiting for Host to bring you on-air.");
    }, 2000);
};

onMounted(validateToken);
onUnmounted(() => {
    localStream?.getTracks().forEach(t => t.stop());
});
</script>

<style lang="scss" scoped>
.guest-room { background: radial-gradient(circle at center, #111 0%, #080808 100%); }
.icon-orb { 
  width: 80px; height: 80px; border-radius: 50%; 
  @include flex-center;
}

.ctrl-btn {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(255,255,255,0.05); color: #fff;
  border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: 0.3s;
  &.active { background: #3b82f6; border-color: #3b82f6; }
}

.onboarding-flow {
  animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
