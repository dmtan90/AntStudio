import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { VoiceConverterNode } from '@/utils/audio/VoiceConverterNode'

export function useRecorderAudio() {
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let masterGain: GainNode | null = null
    let compressor: DynamicsCompressorNode | null = null
    let micSource: MediaStreamAudioSourceNode | null = null
    let micGainNode: GainNode | null = null
    let bgmGainNode: GainNode | null = null
    let bgmAudioEl: HTMLAudioElement | null = null
    let bgmSource: MediaElementAudioSourceNode | null = null
    let masterDestination: MediaStreamAudioDestinationNode | null = null

    const micEnabled = ref(true)
    const currentDb = ref(0)
    const audioLevels = ref<string[]>(Array(50).fill('20%'))
    const micVolume = ref(1.0)
    const bgmVolume = ref(0.3)
    const isDuckingEnabled = ref(true)
    const bgmUrl = ref<string | null>(null)
    const bgmLibrary = ref([
        { id: 'lofi', name: 'Lofi Study', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
        { id: 'jazz', name: 'Smooth Jazz', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
        { id: 'ambient', name: 'Deep Space', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
    ])

    const enableVoiceSwap = ref(false)
    const selectedVoice = ref('kore')
    let voiceConverter: VoiceConverterNode | null = null
    let voiceProcessor: BiquadFilterNode | null = null

    const setupAudioVisualizer = async (stream: MediaStream) => {
        if (!audioContext) {
            audioContext = new AudioContext()
            masterGain = audioContext.createGain()
            bgmGainNode = audioContext.createGain()
            masterDestination = audioContext.createMediaStreamDestination()
            analyser = audioContext.createAnalyser()
            compressor = audioContext.createDynamicsCompressor()
            
            masterGain.gain.value = micEnabled.value ? 1 : 0
            analyser.fftSize = 128
            
            masterGain.connect(compressor)
            bgmGainNode.connect(compressor)
            compressor.connect(analyser)
            compressor.connect(masterDestination)

            watch(micEnabled, (value) => {
                if (masterGain && audioContext) {
                    const target = value ? 1 : 0
                    masterGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.05)
                }
            })

            watch(enableVoiceSwap, async (enabled) => {
                if (enabled && !voiceConverter && audioContext) {
                    voiceConverter = new VoiceConverterNode(audioContext);
                    await voiceConverter.init();
                }

                if (voiceProcessor && voiceConverter && audioContext) {
                    if (enabled) {
                        // High-quality Pitch Shift based on persona
                        const pitchValue = selectedVoice.value === 'sarah' ? 1.2 : 0.8;
                        voiceConverter.setPitch(pitchValue);
                        
                        // Transparent filter when using worklet, or combine for "character" effect
                        voiceProcessor.type = 'lowpass';
                        voiceProcessor.frequency.setTargetAtTime(12000, audioContext.currentTime, 0.1);
                    } else {
                        voiceConverter.setPitch(1.0);
                        voiceProcessor.type = 'lowpass';
                        voiceProcessor.frequency.setTargetAtTime(12000, audioContext.currentTime, 0.1);
                    }
                }
            })
        }

        const updateLevels = () => {
            if (!analyser) return
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(dataArray)
            
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i]
            }
            const rms = Math.sqrt(sum / dataArray.length)
            const normalized = Math.min(1, rms / 80 || 0)
            currentDb.value = normalized

            const levels: string[] = []
            const bars = audioLevels.value.length
            for (let i = 0; i < bars; i++) {
                const idx = Math.floor((i / bars) * dataArray.length)
                const v = dataArray[idx] ?? 0
                const h = Math.max(5, (v / 255) * 100)
                levels.push(`${h.toFixed(0)}%`)
            }
            audioLevels.value = levels
            
            if (isDuckingEnabled.value && bgmGainNode && audioContext) {
                const threshold = 40
                const duckAmount = 0.2
                const targetGain = rms > threshold ? (bgmVolume.value * duckAmount) : bgmVolume.value
                bgmGainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.1)
            } else if (bgmGainNode && audioContext) {
                bgmGainNode.gain.setTargetAtTime(bgmVolume.value, audioContext.currentTime, 0.1)
            }

            // CPU Optimization: Throttle specifically for Visualizer
            setTimeout(() => {
                if (audioContext) requestAnimationFrame(updateLevels)
            }, 50);
        }
        
        updateLevels()
        
        if (audioContext.state === 'suspended') await audioContext.resume()
        if (micSource) {
            try { micSource.disconnect() } catch (e) { }
        }
        micSource = audioContext.createMediaStreamSource(stream)
        
        if (!voiceProcessor) {
            voiceProcessor = audioContext.createBiquadFilter()
            voiceProcessor.type = 'lowpass'
            voiceProcessor.frequency.value = 12000
        }

        if (!voiceConverter && enableVoiceSwap.value) {
            voiceConverter = new VoiceConverterNode(audioContext);
            await voiceConverter.init();
        }

        micSource.connect(voiceProcessor)
        if (voiceConverter?.input) {
            voiceProcessor.connect(voiceConverter.input);
            voiceConverter.connect(masterGain);
        } else {
            voiceProcessor.connect(masterGain)
        }
    }

    const toggleBGM = () => {
        if (!bgmUrl.value) {
            bgmUrl.value = bgmLibrary.value[0].url
        }
        
        if (!bgmAudioEl) {
            bgmAudioEl = new Audio()
            bgmAudioEl.crossOrigin = "anonymous"
            bgmAudioEl.loop = true
        }

        if (!bgmSource && audioContext && bgmGainNode) {
             bgmSource = audioContext.createMediaElementSource(bgmAudioEl)
             bgmSource.connect(bgmGainNode)
        }

        if (bgmAudioEl.src !== bgmUrl.value) {
             bgmAudioEl.src = bgmUrl.value!
        }

        if (bgmAudioEl.paused) {
            bgmAudioEl.play().catch(e => console.error("BGM Play failed", e))
            toast.success("Background Music Playing")
        } else {
            bgmAudioEl.pause()
            toast.info("Background Music Paused")
        }
    }

    const cleanupAudio = () => {
        if (audioContext) {
            audioContext.close()
            audioContext = null
        }
    }

    return {
        micEnabled,
        currentDb,
        audioLevels,
        micVolume,
        bgmVolume,
        isDuckingEnabled,
        bgmUrl,
        bgmLibrary,
        enableVoiceSwap,
        selectedVoice,
        setupAudioVisualizer,
        toggleBGM,
        cleanupAudio,
        getMasterDestination: () => masterDestination
    }
}
