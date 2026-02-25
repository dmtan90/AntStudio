import { ref, watch, type Ref } from 'vue';
import { useVTuberStore } from '@/stores/vtuber';
import { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';

export function usePresentationDriver(options: {
    whiteboardPages: Ref<ImageBitmap[]>;
    whiteboardScripts: Ref<string[]>;
    whiteboardContent: Ref<MediaStream | ImageBitmap | null>;
    currentWhiteboardPage: Ref<number>;
    voiceConfig: Ref<{ provider: string; voiceId: string; language: string }>;
    onVisemeUpdate?: (volume: number) => void;
}) {
    const vtuberStore = useVTuberStore();
    const isAIPresenting = ref(false);
    const isSynthesizing = ref(false);
    const currentAudio = ref<HTMLAudioElement | null>(null);
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationId: number | null = null;
    
    // Watch for manual page changes to update canvas
    watch(options.currentWhiteboardPage, (newIdx) => {
        if (options.whiteboardPages.value[newIdx]) {
            options.whiteboardContent.value = options.whiteboardPages.value[newIdx];
        }
    });

    const stop = () => {
        isAIPresenting.value = false;
        isSynthesizing.value = false;
        if (currentAudio.value) {
            currentAudio.value.pause();
            currentAudio.value = null;
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
    };

    const playSlide = async (index: number) => {
        if (index >= options.whiteboardPages.value.length) {
            toast.success('Presentation completed!');
            stop();
            return;
        }

        const script = options.whiteboardScripts.value[index];
        if (!script) {
            toast.warning(`No script for slide ${index + 1}. Jumping to next.`);
            options.currentWhiteboardPage.value = index + 1;
            options.whiteboardContent.value = options.whiteboardPages.value[index + 1];
            playSlide(index + 1);
            return;
        }

        isSynthesizing.value = true;
        try {
            const voiceData = await vtuberStore.generateVoicePreview({
                text: script,
                provider: options.voiceConfig.value.provider,
                voiceId: options.voiceConfig.value.voiceId,
                language: options.voiceConfig.value.language
            });

            if (!voiceData || !voiceData.audioUrl) throw new Error('Speech synthesis failed');

            const audioUrl = getFileUrl(voiceData.audioUrl);
            const audio = new Audio(audioUrl);
            audio.crossOrigin = 'anonymous';
            currentAudio.value = audio;

            await new Promise((resolve) => {
                audio.onloadedmetadata = resolve;
            });

            // Setup Analysis
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const source = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(audioCtx.destination);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateSync = () => {
                if (!isAIPresenting.value || !analyser) return;

                analyser.getByteTimeDomainData(dataArray as any);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const amplitude = (dataArray[i] - 128) / 128.0;
                    sum += amplitude * amplitude;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                const volume = Math.min(1.0, rms * 2.5);
                
                if (options.onVisemeUpdate) {
                    options.onVisemeUpdate(volume);
                }

                if (!audio.paused && !audio.ended) {
                    animationId = requestAnimationFrame(updateSync);
                }
            };

            audio.onended = () => {
                cancelAnimationFrame(animationId!);
                if (options.onVisemeUpdate) options.onVisemeUpdate(0);
                
                // Advance to next slide
                const nextIdx = index + 1;
                if (nextIdx < options.whiteboardPages.value.length) {
                    options.currentWhiteboardPage.value = nextIdx;
                    options.whiteboardContent.value = options.whiteboardPages.value[nextIdx];
                    playSlide(nextIdx);
                } else {
                    toast.success('Presentation finished!');
                    stop();
                }
            };

            isSynthesizing.value = false;
            audio.play();
            updateSync();

        } catch (e: any) {
            console.error('[PresentationDriver] Error:', e);
            toast.error('Presentation error: ' + e.message);
            stop();
        }
    };

    const start = () => {
        if (options.whiteboardPages.value.length === 0) {
            toast.error('No slides loaded');
            return;
        }
        if (options.whiteboardScripts.value.length === 0) {
            toast.error('Please generate AI scripts first');
            return;
        }
        isAIPresenting.value = true;
        playSlide(options.currentWhiteboardPage.value);
    };

    const nextPage = () => {
        if (options.currentWhiteboardPage.value < options.whiteboardPages.value.length - 1) {
            options.currentWhiteboardPage.value++;
        }
    };

    const prevPage = () => {
        if (options.currentWhiteboardPage.value > 0) {
            options.currentWhiteboardPage.value--;
        }
    };

    const goToPage = (page: number) => {
        if (page >= 0 && page < options.whiteboardPages.value.length) {
            options.currentWhiteboardPage.value = page;
        }
    };

    return {
        isAIPresenting,
        isSynthesizing,
        start,
        stop,
        nextPage,
        prevPage,
        goToPage
    };
}
