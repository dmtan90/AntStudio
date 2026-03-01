<template>
   <div class="guest-room dark-theme min-h-screen flex flex-col items-center p-6 sm:p-12 overflow-y-auto">
      <!-- Site Logo for Guests -->
      <div class="brand-header mt-4 mb-12 animate-fade-in">
         <span class="text-2xl font-black tracking-tighter text-white">{{ useUIStore().appName }}</span>
      </div>

      <div v-if="loading" class="text-center animate-pulse flex-1 flex flex-col justify-center">
         <div class="icon-orb mb-6 mx-auto bg-white/10">
            <connection theme="outline" size="32" />
         </div>
         <p class="opacity-50 font-bold uppercase tracking-widest text-xs">{{ t('guestRoom.loading') }}</p>
      </div>

      <div v-else-if="error" class="error-box text-center glass-card p-10 max-w-md my-auto">
         <div class="icon-orb mb-6 mx-auto bg-red-500/20 text-red-500">
            <close theme="outline" size="32" />
         </div>
         <h2 class="text-2xl font-black mb-4">{{ t('guestRoom.error.title') }}</h2>
         <p class="opacity-50 mb-8">{{ error }}</p>
         <router-link to="/" class="primary-btn px-8 inline-block">{{ t('common.returnHome') }}</router-link>
      </div>

      <div v-else class="onboarding-flow max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10">
         <!-- Preview Area -->
         <div class="preview-section glass-card p-6 flex flex-col gap-6">
            <div
               class="preview-video aspect-video bg-black rounded-2xl overflow-hidden relative border border-white/10">
               <video ref="localVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>
               <div class="audio-visualizer absolute bottom-4 left-4 right-4 h-1 flex gap-1">
                  <div v-for="i in 20" :key="i" class="flex-1 bg-blue-500/30 rounded-full"
                     :style="{ height: '100%', opacity: Math.random() }"></div>
               </div>
            </div>
            <div class="media-controls flex justify-center gap-4">
               <button class="ctrl-btn" :class="{ active: micOn }" @click="micOn = !micOn" :title="micOn ? t('common.mute') : t('common.unmute')">
                  <microphone v-if="micOn" theme="filled" />
                  <microphone v-else theme="outline" class="opacity-30" />
               </button>
               <button class="ctrl-btn" :class="{ active: camOn }" @click="camOn = !camOn" :title="camOn ? t('common.stopCamera') : t('common.startCamera')">
                  <camera v-if="camOn" theme="filled" />
                  <camera-five v-else theme="outline" class="opacity-30" />
               </button>
            </div>
         </div>

         <!-- Join Form / Live Status -->
         <div class="form-section flex flex-col justify-center">
            <template v-if="!isApproved">
               <div class="mb-8">
                  <h1 class="text-4xl font-black text-white mb-2 leading-tight">{{ t('guestRoom.join.title') }}</h1>
                  <p class="text-gray-400">{{ t('guestRoom.join.subtitle') }}</p>
               </div>

               <div class="join-info mb-10">
                  <div class="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                     <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <broadcast theme="filled" class="text-white" />
                     </div>
                     <div>
                        <p class="text-[10px] font-black uppercase opacity-50">{{ t('guestRoom.join.activeSession') }}</p>
                        <p class="font-bold">{{ t('guestRoom.join.hostStudio', { name: hostName }) }}</p>
                     </div>
                  </div>
               </div>

               <div class="form-group mb-8">
                  <label class="block text-[10px] font-black uppercase opacity-30 mb-2 tracking-widest">{{ t('guestRoom.join.displayName') }}</label>
                  <el-input v-model="displayName" :placeholder="t('guestRoom.join.placeholder')"
                     class="glass-input h-14" />
               </div>

               <button class="primary-btn h-14 text-lg font-black relative overflow-hidden"
                  :disabled="!displayName || joining" @click="handleJoin">
                  <template v-if="joining">
                     <div class="flex items-center justify-center gap-2">
                        <div class="loading-spinner"></div>
                        <span>{{ t('common.connecting').toUpperCase() }}</span>
                     </div>
                  </template>
                  <span v-else>{{ t('guestRoom.join.action') }}</span>
               </button>
            </template>

            <template v-else>
               <div class="mb-8 animate-fade-in">
                  <div
                     class="w-16 h-16 rounded-3xl bg-green-500/20 text-green-500 flex items-center justify-center mb-6">
                     <broadcast theme="filled" size="32" />
                  </div>
                  <h1 class="text-4xl font-black text-white mb-2 leading-tight">{{ t('guestRoom.live.title') }}</h1>
                  <p class="text-gray-400">{{ t('guestRoom.live.subtitle', { name: hostName }) }}</p>
               </div>

               <div class="p-6 rounded-3xl bg-white/5 border border-white/10 mb-10">
                  <div class="flex items-center gap-4 mb-4">
                     <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     <span class="text-xs font-black uppercase text-green-500">{{ t('guestRoom.live.status') }}</span>
                  </div>
                  <p class="text-sm opacity-50 leading-relaxed">{{ t('guestRoom.live.desc') }}</p>
               </div>

               <button
                  class="h-14 rounded-2xl border border-red-500/30 hover:bg-red-500/10 text-red-500 bg-transparent flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-widest"
                  @click="handleLeave">
                  <close theme="outline" />
                  <span>{{ t('common.disconnect') }}</span>
               </button>
            </template>

            <p class="text-center text-[10px] opacity-20 uppercase font-black mt-6 tracking-widest">{{ t('guestRoom.poweredBy') }}</p>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
   Connection, Close, Camera, CameraFive,
   Microphone, Broadcast
} from '@icon-park/vue-next';
import api from '@/utils/api';
import { toast } from 'vue-sonner';
import { useUserStore } from '@/stores/user';
import { useStreamingStore } from '@/stores/streaming';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { useI18n } from 'vue-i18n';
import { useUIStore } from '@/stores/ui';

const { t } = useI18n()
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const streamingStore = useStreamingStore();
const loading = ref(true);
const error = ref<string | null>(null);
const hostName = ref('Alpha Production');
const displayName = ref(userStore.user?.name || localStorage.getItem('guest-name') || '');
const micOn = ref(true);
const camOn = ref(true);

watch(micOn, (val) => {
   if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = val);
   }
});

watch(camOn, (val) => {
   if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = val);
   }
});
const localVideo = ref<HTMLVideoElement | null>(null);
const joining = ref(false);
const isApproved = ref(false);
const sessionId = ref<string | null>(null);
let localStream: MediaStream | null = null;
let p2pConnection: RTCPeerConnection | null = null;
const currentWebRTCUrl = ref<string | null>(null); // Keep for host-to-viewer stream info if needed

const validateToken = async () => {
   const token = route.query.token as string;
   if (!token) {
      error.value = t('guestRoom.error.noToken');
      loading.value = false;
      return;
   }

   try {
      const data = await streamingStore.validateGuestToken(token);
      if (data?.sessionId) {
         sessionId.value = data.sessionId;
         if (data.hostName) {
            hostName.value = data.hostName;
         }
         // webrtcConfig is no longer needed for guest publishing
         initMedia();
      }
      else {
         error.value = data?.error || t('guestRoom.error.invalidOrExpired');
      }
   } catch (e: any) {
      error.value = e.response?.data?.error || t('guestRoom.error.invalidOrExpired');
   } finally {
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
      toast.error(t('guestRoom.toasts.mediaPermissionDenied'));
   }
};

const handleJoin = () => {
   if (!displayName.value || joining.value || !sessionId.value) return;
   joining.value = true;

   const token = route.query.token as string;

   // 1. Connect to signaling server
   ActionSyncService.connect(sessionId.value, token, { displayName: displayName.value });

   const socket = ActionSyncService.getSocket();
   if (socket) {
      // 2. Request to join
      socket.emit('guest:join', {
         displayName: displayName.value
      });

      // 3. Listen for approval
      socket.on('guest:approved', async (data: any) => {
         joining.value = false;
         isApproved.value = true;
         toast.success(t('guestRoom.toasts.hostApproved'));

         // Instead of staying in GuestRoom, we move to the professional Studio view
         setTimeout(() => {
            router.push({
               path: '/live/studio',
               query: {
                  ...route.query,
                  sessionId: sessionId.value,
                  role: 'guest',
                  guestName: displayName.value,
                  hostId: data.hostId
               }
            });
         }, 1500);
      });

      socket.on('guest:signal', async (payload: { from: string, signal: any }) => {
         const { signal } = payload;
         if (!p2pConnection) return;

         try {
            if (signal.type === 'answer') {
               await p2pConnection.setRemoteDescription(new RTCSessionDescription({
                  type: 'answer',
                  sdp: signal.sdp
               }));
            } else if (signal.type === 'candidate') {
               await p2pConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
         } catch (e) {
            console.error("[P2P] Signaling error:", e);
         }
      });

      socket.on('guest:rejected', () => {
         joining.value = false;
         toast.error(t('guestRoom.toasts.hostDeclined'));
         ActionSyncService.disconnect();
      });

      socket.on('disconnect', () => {
         joining.value = false;
      });
   }

   window.addEventListener('guest:control', (e: any) => {
      const { action, value } = e.detail;
      console.log(`[Guest] Host command: ${action} = ${value}`);

      if (action === 'audio') {
         micOn.value = value;
         toast.info(value ? t('guestRoom.toasts.hostUnmutedMic') : t('guestRoom.toasts.hostMutedMic'));
      } else if (action === 'video') {
         camOn.value = value;
         toast.info(value ? t('guestRoom.toasts.hostEnabledCam') : t('guestRoom.toasts.hostDisabledCam'));
      } else if (action === 'kick') {
         toast.error(t('guestRoom.toasts.kicked'));
         handleLeave();
         setTimeout(() => router.push('/'), 3000);
      }
   });

   // Sync to potential storage if needed
   if (!userStore.isAuthenticated) {
      localStorage.setItem('guest-name', displayName.value);
   }

   toast.info(t('guestRoom.toasts.requestSent', { name: hostName.value }));
};

const startP2P = async (hostId: string) => {
   console.log("[P2P] Initiating connection to host:", hostId);

   p2pConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
   });

   localStream?.getTracks().forEach(track => {
      p2pConnection?.addTrack(track, localStream!);
   });

   p2pConnection.onicecandidate = (event) => {
      if (event.candidate) {
         ActionSyncService.sendGuestSignal(hostId, {
            type: 'candidate',
            candidate: event.candidate
         });
      }
   };

   p2pConnection.onconnectionstatechange = () => {
      console.log("[P2P] Connection state:", p2pConnection?.connectionState);
      if (p2pConnection?.connectionState === 'failed') {
         toast.error(t('guestRoom.toasts.p2pFailed'));
      }
   };

   p2pConnection.ontrack = (event) => {
      console.log("[P2P] Received track from host:", event.track.kind);
      // Create a hidden video/audio element to play the host's audio/video
      const remoteMedia = document.createElement('video');
      remoteMedia.autoplay = true;
      remoteMedia.playsInline = true;
      remoteMedia.srcObject = event.streams[0];
      // Hide but append to DOM to ensure audio plays
      remoteMedia.style.display = 'none';
      document.body.appendChild(remoteMedia);
   };

   try {
      const offer = await p2pConnection.createOffer();
      await p2pConnection.setLocalDescription(offer);

      ActionSyncService.sendGuestSignal(hostId, {
         type: 'offer',
         sdp: offer.sdp
      });
   } catch (e) {
      console.error("[P2P] Failed to create offer:", e);
   }
};

const handleLeave = () => {
   if (p2pConnection) {
      p2pConnection.close();
      p2pConnection = null;
   }
   isApproved.value = false;
   ActionSyncService.disconnect();
   toast.info(t('guestRoom.toasts.disconnected'));
};

onMounted(validateToken);
onUnmounted(() => {
   localStream?.getTracks().forEach(t => t.stop());
   if (p2pConnection) {
      p2pConnection.close();
      p2pConnection = null;
   }
});
</script>

<style lang="scss" scoped>
.guest-room {
   background: #0a0a0a;
   background-image: 
       radial-gradient(circle at 50% 10%, rgba(59, 130, 246, 0.1), transparent 500px),
       radial-gradient(circle at 10% 90%, rgba(168, 85, 247, 0.05), transparent 500px);
   font-family: 'Outfit', sans-serif;
}

.brand-header {
   opacity: 0.6;
   transition: opacity 0.3s;

   &:hover {
      opacity: 1;
   }
}

.icon-orb {
   width: 80px;
   height: 80px;
   border-radius: 50%;
   display: flex;
   align-items: center;
   justify-content: center;
   background: rgba(255, 255, 255, 0.03);
   border: 1px solid rgba(255, 255, 255, 0.05);
}

.glass-card {
   background: rgba(20, 20, 25, 0.6);
   border: 1px solid rgba(255, 255, 255, 0.08);
   border-radius: 24px;
   backdrop-filter: blur(24px) saturate(180%);
   box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}

.ctrl-btn {
   width: 56px;
   height: 56px;
   border-radius: 50%;
   background: rgba(255, 255, 255, 0.03);
   color: #fff;
   border: 1px solid rgba(255, 255, 255, 0.08);
   cursor: pointer;
   transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
   display: flex;
   align-items: center;
   justify-content: center;

   &:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
   }

   &.active {
      background: #3b82f6;
      border-color: #3b82f6;
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
   }
}

.primary-btn {
   background: #3b82f6;
   color: white;
   font-weight: 800;
   border-radius: 16px;
   transition: all 0.2s;
   border: none;
   cursor: pointer;
   font-size: 14px;
   letter-spacing: 0.05em;
   box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
   
   &:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
   }
   
   &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
   }
}

.glass-input :deep(.el-input__wrapper) {
   background: rgba(0, 0, 0, 0.3) !important;
   box-shadow: none !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 12px !important;
   color: white !important;
   font-weight: 600;
   
   &:hover {
       border-color: rgba(255, 255, 255, 0.2) !important;
       background: rgba(0, 0, 0, 0.4) !important;
   }
   
   &.is-focus {
       border-color: #3b82f6 !important;
       background: rgba(0, 0, 0, 0.5) !important;
       box-shadow: 0 0 0 1px #3b82f6 !important;
   }
}

.onboarding-flow {
   animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
   padding-bottom: 80px;
}

.loading-spinner {
   width: 20px;
   height: 20px;
   border: 2px solid rgba(255, 255, 255, 0.1);
   border-top-color: #fff;
   border-radius: 50%;
   animation: spin 1s linear infinite;
}

.animate-fade-in {
   animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
   from { opacity: 0; }
   to { opacity: 0.6; }
}

@keyframes spin {
   to { transform: rotate(360deg); }
}

@keyframes slideUp {
   from {
      opacity: 0;
      transform: translateY(20px);
   }
   to {
      opacity: 1;
      transform: translateY(0);
   }
}

.ctrl-btn {
   width: 56px;
   height: 56px;
   border-radius: 50%;
   background: rgba(255, 255, 255, 0.05);
   color: #fff;
   border: 1px solid rgba(255, 255, 255, 0.1);
   cursor: pointer;
   transition: 0.3s;
   @include flex-center;

   &:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
   }

   &.active {
      background: #3b82f6;
      border-color: #3b82f6;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
   }
}

.onboarding-flow {
   animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
   padding-bottom: 80px;
}

.loading-spinner {
   width: 20px;
   height: 20px;
   border: 2px solid rgba(255, 255, 255, 0.3);
   border-top-color: #fff;
   border-radius: 50%;
   animation: spin 1s linear infinite;
}

.animate-fade-in {
   animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
   from {
      opacity: 0;
   }

   to {
      opacity: 0.4;
   }
}

@keyframes spin {
   to {
      transform: rotate(360deg);
   }
}

@keyframes slideUp {
   from {
      opacity: 0;
      transform: translateY(20px);
   }

   to {
      opacity: 1;
      transform: translateY(0);
   }
}
</style>
