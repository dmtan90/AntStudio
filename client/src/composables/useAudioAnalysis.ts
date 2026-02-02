import { ref, onMounted, onUnmounted } from 'vue';

export interface AudioStats {
    level: number;       // Current RMS level (0-1)
    peak: number;        // Peak level in last frame
    isSpeaking: boolean; // Threshold-based detection
}

/**
 * Composable for real-time audio analysis using the Web Audio API.
 * Detects voice activity and volume levels from a MediaStream.
 */
export function useAudioAnalysis(stream: MediaStream | null, options = { threshold: 0.05, smoothing: 0.8 }) {
    const audioLevel = ref(0);
    const peakLevel = ref(0);
    const isSpeaking = ref(false);

    let audioContext: AudioContext | null = null;
    let analyzer: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationId: number | null = null;

    const startAnalysis = () => {
        if (!stream || !stream.getAudioTracks().length) return;

        try {
            audioContext = new AudioContext();
            source = audioContext.createMediaStreamSource(stream);
            analyzer = audioContext.createAnalyser();

            // Configuration for voice detection
            analyzer.fftSize = 512;
            analyzer.smoothingTimeConstant = options.smoothing;

            source.connect(analyzer);

            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const analyze = () => {
                if (!analyzer) return;

                analyzer.getByteTimeDomainData(dataArray);

                // Calculate RMS (Root Mean Square) for volume level
                let sum = 0;
                let peak = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const sample = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
                    sum += sample * sample;
                    if (Math.abs(sample) > peak) peak = Math.abs(sample);
                }

                const rms = Math.sqrt(sum / bufferLength);

                // Update reactive refs
                audioLevel.value = rms;
                peakLevel.value = peak;
                isSpeaking.value = rms > options.threshold;

                animationId = requestAnimationFrame(analyze);
            };

            analyze();
            console.log("[AudioAnalysis] Started real-time analysis");
        } catch (error) {
            console.error("[AudioAnalysis] Failed to start:", error);
        }
    };

    const stopAnalysis = () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (audioContext) audioContext.close();

        audioLevel.value = 0;
        peakLevel.value = 0;
        isSpeaking.value = false;

        console.log("[AudioAnalysis] Stopped analysis");
    };

    onMounted(() => {
        if (stream) startAnalysis();
    });

    onUnmounted(() => {
        stopAnalysis();
    });

    // Handle stream changes
    const updateStream = (newStream: MediaStream | null) => {
        stopAnalysis();
        if (newStream) {
            // Need to wait for new stream to be ready
            setTimeout(startAnalysis, 100);
        }
    };

    return {
        audioLevel,
        peakLevel,
        isSpeaking,
        stopAnalysis,
        startAnalysis,
        updateStream
    };
}
