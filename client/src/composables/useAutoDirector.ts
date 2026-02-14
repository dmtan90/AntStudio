import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/user';
import { vad } from '@/utils/audio/VoiceActivityDetector';
import { toast } from 'vue-sonner';

export function useAutoDirector() {
    const socket = ref<Socket | null>(null);
    const isAutoDirectorEnabled = ref(false);
    const activeCamera = ref<string>('host'); // 'host' | 'screen' | 'wide' | 'guest_ID'
    const authStore = useUserStore();

    // VAD Handlers (Hoisted or defined first)
    const handleVadLevel = (e: CustomEvent) => {
        if (socket.value && isAutoDirectorEnabled.value) {
            socket.value.emit('director:voice_activity', { level: e.detail.level });
        }
    };

    const stopVAD = () => {
        vad.stop();
        window.removeEventListener('vad:level', handleVadLevel as EventListener);
    };

    const startVAD = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            await vad.start(stream);
            window.addEventListener('vad:level', handleVadLevel as EventListener);
        } catch (e) {
            console.error('Failed to start VAD:', e);
            toast.error('Microphone access denied for AI Director');
            toggleDirector(false);
        }
    };

    const connect = () => {
        if (!authStore.token) return;
        const endpoint = window.location.origin;
        console.log(`[useAutoDirector] Connecting to ${endpoint} with path /api/socket.io`);
        socket.value = io(endpoint, {
			//allowEIO3: true, // Enables compatibility with Socket.IO v2 clients
			path: '/socket.io',
            auth: { token: authStore.token },
            transports: ['websocket']
        });

        socket.value.on('connect', () => {
            console.log('✅ Connected to Studio Director');
        });

        socket.value.on('director:cut', (data: { target: string, reason: string }) => {
            console.log(`🎬 Director Cut: ${data.target} (${data.reason})`);
            activeCamera.value = data.target;
            window.dispatchEvent(new CustomEvent('director:cut', { detail: data }));
        });
    };

    const toggleDirector = (enabled: boolean) => {
        isAutoDirectorEnabled.value = enabled;
        socket.value?.emit('director:toggle_mode', { enabled });
        
        if (enabled) {
            startVAD();
            toast.success('AI Director Enabled');
        } else {
            stopVAD();
            toast.info('AI Director Disabled');
        }
    };

    onMounted(() => {
        connect();
    });

    onUnmounted(() => {
        stopVAD();
        socket.value?.disconnect();
    });

    return {
        isAutoDirectorEnabled,
        activeCamera,
        toggleDirector
    };
}
