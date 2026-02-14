<template>
    <div
        class="remote-cam glass-dark min-h-screen flex flex-col items-center justify-between p-6 bg-black text-white font-sans">
        <!-- Logo & Header -->
        <div class="w-full flex justify-between items-center py-4">
            <span class="text-2xl font-black tracking-tighter">Ant<span class="text-blue-500">Flow</span></span>
            <div
                class="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60">
                Mobile Camera
            </div>
        </div>

        <!-- Initial Permissions State -->
        <div v-if="!localStream"
            class="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div
                class="w-24 h-24 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center text-blue-500 shadow-2xl shadow-blue-500/20">
                <camera theme="outline" size="48" />
            </div>
            <div class="space-y-3">
                <h1 class="text-3xl font-black tracking-tight">Sync your device</h1>
                <p class="opacity-40 text-sm max-w-xs mx-auto leading-relaxed">Transform this phone into a
                    high-performance wireless camera for your live studio.</p>
            </div>
            <button @click="initMedia"
                class="w-full max-w-xs py-5 bg-blue-600 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95">
                Enable Camera
            </button>
        </div>

        <!-- Camera Active State -->
        <div v-else
            class="flex-1 w-full max-w-md flex flex-col gap-6 py-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <!-- Preview Section -->
            <div class="relative w-full bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl group transition-all duration-500"
                :class="isPortrait ? 'aspect-[9/16]' : 'aspect-[16/9]'">
                <video ref="localVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>

                <!-- Overlay Info -->
                <div class="absolute top-8 left-8 right-8 flex justify-between items-start pointer-events-none">
                    <div class="flex flex-col gap-2">
                        <div
                            class="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5">
                            <div class="w-2 h-2 rounded-full"
                                :class="isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'"></div>
                            <span class="text-[10px] font-black uppercase tracking-widest opacity-80">{{ isConnected ?
                                'Live' : 'Ready' }}</span>
                        </div>
                        <div v-if="isApproved"
                            class="inline-flex items-center bg-blue-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-wider">
                            ON AIR
                        </div>
                    </div>

                    <button @click="flipCamera"
                        class="w-12 h-12 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/5 pointer-events-auto active:scale-90 transition-transform">
                        <refresh theme="outline" size="24" />
                    </button>
                </div>

                <!-- Waiting Message -->
                <div v-if="isConnected && !isApproved"
                    class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm px-10 text-center animate-in fade-in">
                    <div class="space-y-4">
                        <div class="loading-spinner border-blue-500 mx-auto w-8 h-8"></div>
                        <p class="text-sm font-bold">Awaiting Host Approval...</p>
                        <p class="text-[10px] opacity-40 uppercase tracking-widest">{{ name }}</p>
                    </div>
                </div>
            </div>

            <!-- Controls Panel -->
            <div class="grid grid-cols-1 gap-4 mt-auto">
                <button v-if="!isConnected" @click="connectToStudio"
                    class="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-[0.24em] shadow-xl shadow-white/5 hover:bg-zinc-200 transition-all active:scale-95">
                    Start Broadcasting
                </button>
                <button v-else @click="disconnect"
                    class="w-full py-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl font-black uppercase tracking-[0.24em] hover:bg-red-500/20 transition-all active:scale-95">
                    Disconnect
                </button>
            </div>
        </div>

        <!-- Footer -->
        <div class="py-4 text-center">
            <p class="text-[9px] font-black opacity-20 uppercase tracking-[0.4em]">Integrated Secure P2P Bridge</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Camera, Refresh, Close } from '@icon-park/vue-next';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { useStudioP2P } from '@/composables/studio/useStudioP2P';
import { toast } from 'vue-sonner';

const route = useRoute();
const sessionId = computed(() => route.query.session as string);
const name = computed(() => route.query.name as string || 'MobileCam');
const token = computed(() => route.query.token as string || '');

const localVideo = ref<HTMLVideoElement | null>(null);
const localStream = ref<MediaStream | null>(null);
const isConnected = ref(false);
const isApproved = ref(false);
const facingMode = ref<'user' | 'environment'>('environment');
const isPortrait = ref(window.innerHeight > window.innerWidth);

// Role: Guest but specialized for camera
const isGuestMode = ref(true);

const handleOrientationChange = () => {
    isPortrait.value = window.innerHeight > window.innerWidth;
    if (localStream.value) {
        initMedia(); // Refresh with new constraints
    }
};

// Use Professional P2P Composable
const { initiateAsGuest } = useStudioP2P(localStream, undefined, isGuestMode);

watch(localStream, async (stream) => {
    if (stream) {
        await nextTick();
        if (localVideo.value) {
            localVideo.value.srcObject = stream;
            localVideo.value.play().catch(e => console.error("Video play failed:", e));
        }
    }
});

const initMedia = async () => {
    try {
        if (localStream.value) {
            localStream.value.getTracks().forEach(t => t.stop());
        }

        const constraints = {
            video: {
                facingMode: facingMode.value,
                width: { ideal: isPortrait.value ? 720 : 1280 },
                height: { ideal: isPortrait.value ? 1280 : 720 },
                aspectRatio: isPortrait.value ? 0.5625 : 1.777
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        };

        localStream.value = await navigator.mediaDevices.getUserMedia(constraints);

        await nextTick();
        if (localVideo.value) {
            localVideo.value.srcObject = localStream.value;
            localVideo.value.play().catch(e => console.error("Video auto-play failed:", e));
        }

        toast.success(`Camera active: ${facingMode.value === 'user' ? 'Front' : 'Back'}`);
    } catch (e) {
        console.error(e);
        toast.error("Camera access required. Please check your browser permissions.");
    }
};

const flipCamera = () => {
    facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
    initMedia();
};

const connectToStudio = () => {
    if (!sessionId.value) return toast.error("Invalid session link");

    // Connect to signaling (Uses Guest Join flow)
    ActionSyncService.connect(sessionId.value, token.value, { displayName: name.value });
    const socket = ActionSyncService.getSocket();

    if (socket) {
        // Request to join the room
        socket.emit('guest:join', { displayName: name.value });
        isConnected.value = true;

        // Listen for approvals
        socket.on('guest:approved', async (data: any) => {
            isApproved.value = true;
            toast.success("Broadcast live!");

            // Apply initial permissions
            if (data.permissions) {
                if (localStream.value) {
                    localStream.value.getAudioTracks().forEach(t => t.enabled = data.permissions.micEnabled);
                    localStream.value.getVideoTracks().forEach(t => t.enabled = data.permissions.camEnabled);
                }
            }

            // Start low-latency WebRTC connection back to Host
            await initiateAsGuest(data.hostId);
        });

        socket.on('guest:rejected', () => {
            isConnected.value = false;
            toast.error("Host declined the connection");
        });

        socket.on('disconnect', () => {
            isConnected.value = false;
            isApproved.value = false;
            toast.info("Signaling disconnected");
        });

        // Handle remote controls (Mute/Unmute/Kick) from Host
        window.addEventListener('guest:control', (e: any) => {
            const { action, value } = e.detail;
            console.log(`[RemoteCam] Remote Control: ${action} = ${value}`);

            if (action === 'audio') {
                if (localStream.value) {
                    localStream.value.getAudioTracks().forEach(t => t.enabled = value);
                    toast.info(value ? "Host unmuted your mic" : "Host muted your mic");
                }
            } else if (action === 'video') {
                if (localStream.value) {
                    localStream.value.getVideoTracks().forEach(t => t.enabled = value);
                    toast.info(value ? "Host enabled your camera" : "Host disabled your camera");
                }
            } else if (action === 'kick') {
                toast.error("Removed by host");
                disconnect();
            }
        });
    }
};

const disconnect = () => {
    ActionSyncService.disconnect();
    isConnected.value = false;
    isApproved.value = false;
    toast.info("Session stopped");
};

onMounted(() => {
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    // Attempt auto-start for convenience
    if (navigator.mediaDevices) {
        initMedia();
    }
});

onUnmounted(() => {
    window.removeEventListener('resize', handleOrientationChange);
    window.removeEventListener('orientationchange', handleOrientationChange);
    localStream.value?.getTracks().forEach(t => t.stop());
    ActionSyncService.disconnect();
});
</script>

<style scoped lang="scss">
.remote-cam {
    background: #0a0a0a;
    background-image: 
        radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15), transparent 500px),
        radial-gradient(circle at 50% 100%, rgba(0, 0, 0, 0.8), transparent 500px);
    overflow: hidden;
    user-select: none;
    touch-action: manipulation;
    font-family: 'Outfit', sans-serif;
}

.loading-spinner {
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.shadow-3xl {
    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.9);
}
</style>
