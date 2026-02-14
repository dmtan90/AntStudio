import { ref, onUnmounted } from 'vue';

export interface AudioVisualizerOptions {
    fftSize?: number;
    smoothingTimeConstant?: number;
}

export function useAudioVisualizer(options: AudioVisualizerOptions = {}) {
    const audioCtx = ref<AudioContext | null>(null);
    const analyser = ref<AnalyserNode | null>(null);
    const source = ref<MediaElementAudioSourceNode | null>(null);
    const speakingVol = ref(0);
    const pitchFactor = ref(0); // 0 = low, 1 = high
    const emphasis = ref(0); // Spikes on sudden volume increase
    const isPlaying = ref(false);
    let animationFrameId: number | null = null;
    let prevVol = 0;

    const initAudioContext = () => {
        if (!audioCtx.value) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx.value = new AudioContextClass();
        }
        if (audioCtx.value.state === 'suspended') {
            audioCtx.value.resume();
        }
    };

    const connectSource = (audioElement: HTMLAudioElement) => {
        initAudioContext();
        if (!audioCtx.value) return;

        if (!analyser.value) {
            analyser.value = audioCtx.value.createAnalyser();
            analyser.value.fftSize = options.fftSize || 512;
            analyser.value.smoothingTimeConstant = options.smoothingTimeConstant || 0.8;
            analyser.value.connect(audioCtx.value.destination);
        }

        // CRITICAL FIX: Always disconnect old source and create new one
        // Each HTMLAudioElement can only have ONE source node
        try {
            // Disconnect old source if exists
            if (source.value) {
                source.value.disconnect();
                source.value = null;
            }
            
            // Create new source for this audio element
            source.value = audioCtx.value.createMediaElementSource(audioElement);
            source.value.connect(analyser.value);
            console.log('[AudioVisualizer] Connected new audio source');
        } catch (e) {
            console.error('[AudioVisualizer] Failed to connect source:', e);
        }
    };

    const startAnalysis = () => {
        if (!analyser.value) return;

        const bufferLength = analyser.value.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const freqArray = new Uint8Array(bufferLength);

        const update = () => {
            if (!analyser.value) return;
            
            analyser.value.getByteTimeDomainData(dataArray);
            
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) {
                const amplitude = (dataArray[i] - 128) / 128.0; 
                sum += amplitude * amplitude;
            }
            
            const rms = Math.sqrt(sum / dataArray.length);
            // Boost low volumes
            const currentVol = Math.min(1.0, rms * 3.0);
            speakingVol.value = currentVol;

            // Emphasis detection (sudden change)
            const diff = Math.max(0, currentVol - prevVol);
            emphasis.value = emphasis.value * 0.8 + diff * 2.0; // Decay effect
            if (emphasis.value > 1) emphasis.value = 1;
            prevVol = currentVol;

            // Pitch factor detection (frequency balance)
            analyser.value.getByteFrequencyData(freqArray);
            let lowFreqSum = 0;
            let highFreqSum = 0;
            const midIndex = Math.floor(freqArray.length / 2);
            
            for (let i = 0; i < midIndex; i++) lowFreqSum += freqArray[i];
            for (let i = midIndex; i < freqArray.length; i++) highFreqSum += freqArray[i];
            
            const totalFreq = (lowFreqSum + highFreqSum) || 1;
            // Normalize pitch factor (usually speech is lower focused)
            pitchFactor.value = (highFreqSum / totalFreq) * 2.0; 
            if (pitchFactor.value > 1) pitchFactor.value = 1;

            if (isPlaying.value) {
                animationFrameId = requestAnimationFrame(update);
            } else {
                speakingVol.value = 0;
            }
        };
        
        isPlaying.value = true;
        update();
    };

    const stopAnalysis = () => {
        isPlaying.value = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        speakingVol.value = 0;
        emphasis.value = 0;
        pitchFactor.value = 0;
        prevVol = 0;
    };

    // Helper to handle play/ended events
    const attachToAudioElement = (audioElement: HTMLAudioElement) => {
        connectSource(audioElement);
        
        const onPlay = () => {
            initAudioContext();
            startAnalysis();
        };

        const onEnded = () => {
            stopAnalysis();
        };
        
        const onPause = () => {
            stopAnalysis();
        }

        audioElement.addEventListener('play', onPlay);
        audioElement.addEventListener('ended', onEnded);
        audioElement.addEventListener('pause', onPause);

        return () => {
            audioElement.removeEventListener('play', onPlay);
            audioElement.removeEventListener('ended', onEnded);
            audioElement.removeEventListener('pause', onPause);
            stopAnalysis();
        };
    };

    /**
     * Analyze music audio for better lip-sync
     * Music has different frequency characteristics than speech
     * Focuses on vocal frequencies (300Hz - 3000Hz)
     */
    const analyzeMusicAudio = (audioElement: HTMLAudioElement) => {
        initAudioContext();
        if (!audioCtx.value) return () => {};

        // Create dedicated analyser for music with higher resolution
        const musicAnalyser = audioCtx.value.createAnalyser();
        musicAnalyser.fftSize = 2048; // Higher resolution for music
        musicAnalyser.smoothingTimeConstant = 0.7;

        let musicSource: MediaElementAudioSourceNode | null = null;
        
        try {
            musicSource = audioCtx.value.createMediaElementSource(audioElement);
            musicSource.connect(musicAnalyser);
            musicAnalyser.connect(audioCtx.value.destination);
        } catch (e) {
            console.error('[AudioVisualizer] Failed to connect music source:', e);
            return () => {};
        }

        const dataArray = new Uint8Array(musicAnalyser.frequencyBinCount);
        let musicAnimationId: number | null = null;

        const updateMusicLipSync = () => {
            if (!musicAnalyser) return;

            musicAnalyser.getByteFrequencyData(dataArray);

            // Detect vocal frequencies (approximately 300Hz - 3000Hz)
            // Assuming sample rate of 44100Hz, each bin represents ~21.5Hz (44100 / 2048)
            // Bin 14-140 covers roughly 300Hz-3000Hz
            const vocalStartBin = 14;
            const vocalEndBin = 140;
            
            let vocalSum = 0;
            for (let i = vocalStartBin; i < vocalEndBin; i++) {
                vocalSum += dataArray[i];
            }
            
            const vocalIntensity = vocalSum / (vocalEndBin - vocalStartBin);
            
            // Map to mouth opening (0-1), with boost for music
            speakingVol.value = Math.min(1, vocalIntensity / 120);

            // Detect emphasis from high-frequency peaks (consonants, breath)
            let highFreqSum = 0;
            for (let i = vocalEndBin; i < Math.min(vocalEndBin + 50, dataArray.length); i++) {
                highFreqSum += dataArray[i];
            }
            const highFreqIntensity = highFreqSum / 50;
            emphasis.value = Math.min(1, highFreqIntensity / 100);

            musicAnimationId = requestAnimationFrame(updateMusicLipSync);
        };

        updateMusicLipSync();

        // Return cleanup function
        return () => {
            if (musicAnimationId) {
                cancelAnimationFrame(musicAnimationId);
                musicAnimationId = null;
            }
            if (musicSource) {
                try {
                    musicSource.disconnect();
                } catch (e) {
                    console.warn('[AudioVisualizer] Error disconnecting music source:', e);
                }
            }
            speakingVol.value = 0;
            emphasis.value = 0;
        };
    };

    onUnmounted(() => {
        stopAnalysis();
        if (audioCtx.value && audioCtx.value.state !== 'closed') {
            audioCtx.value.close();
        }
    });

    return {
        speakingVol,
        pitchFactor,
        emphasis,
        initAudioContext,
        connectSource,
        startAnalysis,
        stopAnalysis,
        attachToAudioElement,
        analyzeMusicAudio
    };
}
