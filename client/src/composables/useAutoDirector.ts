import { ref, onUnmounted } from 'vue';
import { useAppSocket } from '@/utils/appSocket';
import { vad } from '@/utils/audio/VoiceActivityDetector';
import { toast } from 'vue-sonner';

export function useAutoDirector() {
    const isAutoDirectorEnabled = ref(false);
    const activeCamera = ref<string>('host'); // 'host' | 'screen' | 'wide' | 'guest_ID'

    // VAD Handlers (Hoisted or defined first)
    const handleVadLevel = (e: CustomEvent) => {
        if (socket && isAutoDirectorEnabled.value) {
            socket.emit('director:voice_activity', { level: e.detail.level });
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

    const onDirectorCut = (data: { target: string, reason: string }) => {
        console.log(`🎬 Director Cut: ${data.target} (${data.reason})`);
        activeCamera.value = data.target;
        window.dispatchEvent(new CustomEvent('director:cut', { detail: data }));
    };

    // Shared app connection; handlers are removed automatically on unmount
    const { socket } = useAppSocket({ 'director:cut': onDirectorCut });

    const toggleDirector = (enabled: boolean) => {
        isAutoDirectorEnabled.value = enabled;
        socket?.emit('director:toggle_mode', { enabled });
        
        if (enabled) {
            startVAD();
            toast.success('AI Director Enabled');
        } else {
            stopVAD();
            toast.info('AI Director Disabled');
        }
    };

    onUnmounted(() => {
        stopVAD();
        // The shared socket outlives this component, so explicitly turn the director off
        if (isAutoDirectorEnabled.value) socket?.emit('director:toggle_mode', { enabled: false });
    });

    return {
        isAutoDirectorEnabled,
        activeCamera,
        toggleDirector
    };
}
