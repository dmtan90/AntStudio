import { ref, watch, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';

export const useViralMomentDetector = (options: {
    audioLevel: any;
    chatVelocity: any;
    onViralMoment: () => void;
}) => {
    const isMonitoring = ref(false);
    const viralScore = ref(0);
    const lastTrigger = ref(0);
    const threshold = ref(70);
    
    // History for smoothing
    const audioHistory = ref<number[]>([]);
    const velocityHistory = ref<number[]>([]);

    const checkMoment = () => {
        if (!isMonitoring.value) return;

        // Calculate current score
        // Audio peaks (Sudden loud moments)
        const currentAudio = options.audioLevel.value;
        const avgAudio = audioHistory.value.reduce((a, b) => a + b, 0) / (audioHistory.value.length || 1);
        const audioSpike = currentAudio > avgAudio * 2 && currentAudio > 0.2 ? 40 : 0;

        // Chat velocity (Viral spike)
        const currentVelocity = options.chatVelocity.value;
        const avgVelocity = velocityHistory.value.reduce((a, b) => a + b, 0) / (velocityHistory.value.length || 1);
        const chatSpike = currentVelocity > avgVelocity * 1.5 && currentVelocity > 5 ? 50 : 0;

        const score = audioSpike + chatSpike;
        viralScore.value = score;

        if (score >= threshold.value && Date.now() - lastTrigger.value > 60000) {
            triggerViralMoment();
        }

        // Update history
        audioHistory.value.push(currentAudio);
        velocityHistory.value.push(currentVelocity);
        if (audioHistory.value.length > 60) audioHistory.value.shift();
        if (velocityHistory.value.length > 10) velocityHistory.value.shift();
    };

    const triggerViralMoment = () => {
        lastTrigger.value = Date.now();
        toast.info('🚀 VIRAL MOMENT DETECTED!', {
            description: 'AI is automatically capturing this highlight.',
            duration: 5000
        });
        options.onViralMoment();
    };

    const interval = setInterval(checkMoment, 1000);

    const startMonitoring = () => (isMonitoring.value = true);
    const stopMonitoring = () => (isMonitoring.value = false);

    onUnmounted(() => {
        clearInterval(interval);
    });

    return {
        viralScore,
        isMonitoring,
        startMonitoring,
        stopMonitoring,
        threshold
    };
};
