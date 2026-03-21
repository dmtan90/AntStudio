import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

// Stores
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { usePlatformStore } from '@/stores/platform'
import { useInfluencerStore } from '@/stores/influencer'
import { useStreamingStore } from '@/stores/streaming'
import { useMediaStore } from '@/stores/media'
import { useAIStore } from '@/stores/ai'

// Utils & Engines
import { DocumentProcessor } from '@/utils/recorder/DocumentProcessor'
import { arFilterEngine } from '@/utils/ai/ARFilterEngine'
import { liveAIEngine } from '@/utils/ai/LiveAIEngine'
import { liveSpeechAPI } from '@/utils/ai/LiveSpeechAPI'
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher'
import { ActionSyncService } from '@/utils/ai/ActionSyncService'
import { VoiceConverterNode } from '@/utils/audio/VoiceConverterNode'
import { getFileUrl } from '@/utils/api'

// Icons
import {
    Camera, Monitor, Voice, Cpu, 
    CloseOne, CheckOne, Loading, Download, 
    Share, Magic, BroadcastRadio, Effects, 
    MicrophoneOne, SettingConfig, VolumeSmall,
    VolumeNotice as VolumeOne
} from '@icon-park/vue-next'

// Workers
// @ts-ignore
import StudioWorker from '@/workers/render/RenderWorker?worker'

export type RecordingMode = 'camera' | 'camera-screen' | 'screen' | 'audio' | 'podcast' | 'whiteboard'

export const videoFilters = [
    { id: 'none', name: 'Original', css: '', thumb: '/bg/friends.jpg' },
    { id: '1977', name: '1977', css: 'sepia(0.5) hue-rotate(-30deg) saturate(1.2)', thumb: '/bg/friends.jpg' },
    { id: 'aden', name: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)', thumb: '/bg/friends.jpg' },
    { id: 'brannan', name: 'Brannan', css: 'sepia(0.5) contrast(1.4)', thumb: '/bg/friends.jpg' },
    { id: 'brooklyn', name: 'Brooklyn', css: 'contrast(0.9) brightness(1.1)', thumb: '/bg/friends.jpg' },
    { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)', thumb: '/bg/friends.jpg' },
    { id: 'gingham', name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg)', thumb: '/bg/friends.jpg' },
    { id: 'hudson', name: 'Hudson', css: 'brightness(1.2) contrast(0.9) saturate(1.1)', thumb: '/bg/friends.jpg' },
    { id: 'inkwell', name: 'Inkwell', css: 'sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)', thumb: '/bg/friends.jpg' },
    { id: 'lofi', name: 'Lo-Fi', css: 'saturate(1.1) contrast(1.5)', thumb: '/bg/friends.jpg' },
    { id: 'maven', name: 'Maven', css: 'sepia(0.25) brightness(0.95) contrast(0.95) saturate(1.5)', thumb: '/bg/friends.jpg' },
    { id: 'mayfair', name: 'Mayfair', css: 'contrast(1.1) saturate(1.1)', thumb: '/bg/friends.jpg' },
    { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)', thumb: '/bg/friends.jpg' },
    { id: 'nashville', name: 'Nashville', css: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)', thumb: '/bg/friends.jpg' },
    { id: 'rise', name: 'Rise', css: 'brightness(1.05) sepia(0.2) contrast(0.9) saturate(0.9)', thumb: '/bg/friends.jpg' },
    { id: 'toaster', name: 'Toaster', css: 'contrast(1.5) brightness(0.9)', thumb: '/bg/friends.jpg' },
    { id: 'walden', name: 'Walden', css: 'brightness(1.1) hue-rotate(-10deg) sepia(0.3) saturate(1.6)', thumb: '/bg/friends.jpg' },
    { id: 'willow', name: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(0.9)', thumb: '/bg/friends.jpg' },
    { id: 'xpro2', name: 'X-Pro II', css: 'sepia(0.3) contrast(1.3) brightness(0.8)', thumb: '/bg/friends.jpg' }
]

export function useStudioRecorder() {
    const router = useRouter()
    const { t } = useI18n()
    
    // Stores
    const projectStore = useProjectStore()
    const userStore = useUserStore()
    const platformStore = usePlatformStore()
    const influencerStore = useInfluencerStore()
    const streamingStore = useStreamingStore()
    const mediaStore = useMediaStore()
    const aiStore = useAIStore()

    // --- State: General Studio ---
    const mode = ref<RecordingMode>('camera')
    const activeSidebar = ref<'filters' | 'ai' | 'live' | 'audio' | 'podcast' | 'hardware' | 'production' | 'whiteboard' | null>(null)
    const activeOverlays = ref<string[]>([])
    const layoutPreset = ref<'pip' | 'split' | 'cam-full' | 'screen-full'>('pip')
    const tabs = computed(() => [
        { value: 'camera', label: t('projects.recorder.tabs.camera'), icon: Camera },
        { value: 'camera-screen', label: t('projects.recorder.tabs.camScreen'), icon: Monitor },
        { value: 'screen', label: t('projects.recorder.tabs.screen'), icon: Monitor },
        { value: 'audio', label: t('projects.recorder.tabs.audio'), icon: Voice },
        { value: 'whiteboard', label: t('projects.recorder.tabs.whiteboard'), icon: Cpu },
    ])

    // --- State: Media/Hardware ---
    const currentStream = ref<MediaStream | null>(null)
    const secondaryStream = ref<MediaStream | null>(null)
    const videoDevices = ref<MediaDeviceInfo[]>([])
    const audioDevices = ref<MediaDeviceInfo[]>([])
    const selectedCameraId = ref<string | null>(null)
    const selectedMicId = ref<string | null>(null)
    const isScreenShareEnded = ref(false)
    const recordingQuality = ref({ resolution: '1080p', fps: 30 })

    // --- State: Canvas & Rendering ---
    const processingCanvas = ref<HTMLCanvasElement | null>(null)
    const displayCanvas = ref<HTMLCanvasElement | null>(null)
    const sourceVideo = ref<HTMLVideoElement | null>(null)
    const webcamVideo = ref<HTMLVideoElement | null>(null)
    const annotationCanvas = document.createElement('canvas')
    const annotationCtx = annotationCanvas.getContext('2d')!
    const isAnnotationActive = ref(false)
    const annotationTool = ref<'pen' | 'highlighter'>('pen')
    const annotationColor = ref('#f97316')
    const annotationSize = ref(4)
    let isDrawingAnnotation = false
    let isAnnotationDirty = false

    const frameCount = ref(0)
    const isTransferred = ref(false)
    let worker: Worker | null = null
    let animationFrameId: number | null = null
    const bridgedStreams = new Set<string>()
    let lastAIProcessTime = 0
    const AI_PROCESS_INTERVAL = 300
    let forceFirstMask = true

    // --- State: Audio ---
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let masterGain: GainNode | null = null
    let compressor: DynamicsCompressorNode | null = null
    let micSource: MediaStreamAudioSourceNode | null = null
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
    const selectedVoice = ref('en-US-Neural2-F')
    let voiceConverter: VoiceConverterNode | null = null
    let voiceProcessor: BiquadFilterNode | null = null

    // --- State: AI & Captions ---
    const isAiActive = ref(false)
    const activeCaptions = ref(false)
    const currentCaption = ref('')
    const translatedCaption = ref('')
    const targetLanguage = ref('vi')
    const isAnalyzing = ref(false)
    const enableBeauty = ref(false)
    const beautySettings = ref({ smoothing: 0.6, brightness: 1.1 })
    const appliedFilter = ref('none')

    // --- State: Whiteboard & Presentation ---
    const whiteboardContent = ref<MediaStream | ImageBitmap | null>(null)
    const whiteboardPages = ref<ImageBitmap[]>([])
    const whiteboardScripts = ref<string[]>([])
    const currentWhiteboardPage = ref(0)
    const isWhiteboardLaunchpadActive = ref(true)
    const showInfluencerSelectDialog = ref(false)
    const isInfluencerActive = ref(false)
    const influencerStream = ref<MediaStream | null>(null)
    const isAIPresenting = ref(false)
    const isSynthesizing = ref(false)
    const presentationViseme = ref(0)
    let currentPresentationAudio: HTMLAudioElement | null = null
    let presentationAnimationId: number | null = null

    // --- State: Recording ---
    const isRecording = ref(false)
    const recordingTime = ref(0)
    const maxDuration = ref(600)
    const recordedChunks = ref<Blob[]>([])
    const mediaRecorder = ref<any>(null)
    const recordedVideoUrl = ref<string | null>(null)
    const showFinishDialog = ref(false)
    const isCountdownActive = ref(false)
    const countdownValue = ref(3)
    let recordingTimer: any = null

    // --- State: Streaming ---
    const isStreaming = ref(false)
    const streamConfig = ref({ serverUrl: '', streamKey: '', bitrate: 4500, useAntMedia: false })
    const selectedPlatforms = ref<string[]>([])
    const showPlatformSelector = ref(false)
    const streamStats = ref<any>({ bitrate: 0, fps: 0, rtt: 0 })
    const publisher = ref<WebRTCPublisher | null>(null)
    const currentSessionId = ref<string | null>(null)

    // --- State: Other Features ---
    const isTeleprompterActive = ref(false)
    const isTeleprompterScrolling = ref(false)
    const teleprompterScript = ref("Welcome to AntStudio! This is your professional teleprompter...")
    const teleprompterSpeed = ref(2)
    const teleprompterFontSize = ref(24)
    const teleprompterScrollPos = ref(0)
    let teleprompterInterval: any = null

    const camSettings = ref<any>({
        size: 25, shape: 'circle', position: 'bottom-left', x: 20, y: 20, opacity: 1,
        flip: false, borderColor: '#ffffff', borderWidth: 2, faceParams: { x: 0.5, y: 0.5 },
        enableBlur: false, blurStrength: 10, enableVoiceSwap: false, backgroundType: 'none',
        backgroundResource: null as string | null, enableEnhance: false, enableFaceSwap: false,
        faceSwapResource: null as string | null, enableCamInWhiteboard: false
    })
    
    const podcastSettings = ref({
        bg: 'linear-gradient(135deg, #001 0%, #102 100%)', visualType: 'waveform' as any,
        bgmVolume: 0.3, showVisualizer: true, proEnhance: false,
        backgroundType: 'none', backgroundResource: null as string | null
    })

    const avatarPresets = [
        { id: 'sarah', name: 'Sarah (AI)', image: '/avatars/sarah.jpg' },
        { id: 'james', name: 'James (AI)', image: '/avatars/james.jpg' },
        { id: 'eva', name: 'Eva (Digital)', image: '/avatar/eva.jpg' }
    ]

    const fileInput = ref<HTMLInputElement | null>(null)
    const presentationInput = ref<HTMLInputElement | null>(null)
    const resourcePool = ref<Array<any>>([])
    const showMiniPreview = computed(() => mode.value === 'screen' && !isScreenShareEnded.value)

    const selectedAvatar = ref('sarah')
    const enableAslAssist = ref(false)
    const aslMode = ref<'asl-to-text' | 'text-to-asl'>('text-to-asl')
    const currentSlideIndex = computed({
        get: () => currentWhiteboardPage.value,
        set: (val) => currentWhiteboardPage.value = val
    })

    // ==========================================
    // MODULE: Media & Hardware
    // ==========================================
    const enumerateDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            videoDevices.value = devices.filter(d => d.kind === 'videoinput')
            audioDevices.value = devices.filter(d => d.kind === 'audioinput')
            if (!selectedCameraId.value && videoDevices.value.length) selectedCameraId.value = videoDevices.value[0].deviceId
            if (!selectedMicId.value && audioDevices.value.length) selectedMicId.value = audioDevices.value[0].deviceId
        } catch (e) { console.error('Failed to enumerate devices:', e) }
    }

    const stopAllTracks = (stream: MediaStream | null) => {
        if (stream) stream.getTracks().forEach(track => { track.enabled = false; track.stop() })
    }

    // ==========================================
    // MODULE: Audio Logic
    // ==========================================
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
            masterGain.connect(compressor); bgmGainNode.connect(compressor); compressor.connect(analyser); compressor.connect(masterDestination)

            watch(micEnabled, (val) => {
                if (masterGain && audioContext) {
                    masterGain.gain.setTargetAtTime(val ? 1 : 0, audioContext.currentTime, 0.05)
                }
            })
        }

        const updateLevels = () => {
            if (!analyser || !audioContext) return
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(dataArray)
            let sum = 0; for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
            const rms = Math.sqrt(sum / dataArray.length)
            currentDb.value = Math.min(1, rms / 80 || 0)

            const levels: string[] = []
            const bars = audioLevels.value.length
            for (let i = 0; i < bars; i++) {
                const idx = Math.floor((i / bars) * dataArray.length)
                const v = dataArray[idx] ?? 0
                levels.push(`${Math.max(5, (v / 255) * 100).toFixed(0)}%`)
            }
            audioLevels.value = levels
            
            if (isDuckingEnabled.value && bgmGainNode) {
                const targetGain = rms > 40 ? (bgmVolume.value * 0.2) : bgmVolume.value
                bgmGainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.1)
            } else if (bgmGainNode) {
                bgmGainNode.gain.setTargetAtTime(bgmVolume.value, audioContext.currentTime, 0.1)
            }

            setTimeout(() => { if (audioContext) requestAnimationFrame(updateLevels) }, 50)
        }
        updateLevels()
        
        if (audioContext.state === 'suspended') await audioContext.resume()
        if (micSource) { try { micSource.disconnect() } catch (e) { } }
        micSource = audioContext.createMediaStreamSource(stream)
        
        if (!voiceProcessor) {
            voiceProcessor = audioContext.createBiquadFilter()
            voiceProcessor.type = 'lowpass'; voiceProcessor.frequency.value = 12000
        }
        
        micSource.connect(voiceProcessor)
        if (enableVoiceSwap.value) {
            if (!voiceConverter) { voiceConverter = new VoiceConverterNode(audioContext); await voiceConverter.init() }
            const pitch = selectedVoice.value.includes('F') ? 1.2 : 0.8
            voiceConverter.setPitch(pitch)
            voiceProcessor.connect(voiceConverter.input); voiceConverter.connect(masterGain)
        } else {
            voiceProcessor.connect(masterGain)
        }
    }

    const toggleBGM = () => {
        if (!bgmUrl.value) bgmUrl.value = bgmLibrary.value[0].url
        if (!bgmAudioEl) { bgmAudioEl = new Audio(); bgmAudioEl.crossOrigin = "anonymous"; bgmAudioEl.loop = true }
        if (!bgmSource && audioContext && bgmGainNode) {
             bgmSource = audioContext.createMediaElementSource(bgmAudioEl); bgmSource.connect(bgmGainNode)
        }
        if (bgmAudioEl.src !== bgmUrl.value) bgmAudioEl.src = bgmUrl.value!
        if (bgmAudioEl.paused) { bgmAudioEl.play().catch(e => console.error(e)); toast.success("BGM Playing") }
        else { bgmAudioEl.pause(); toast.info("BGM Paused") }
    }

    const cleanupAudio = () => {
        if (audioContext) { audioContext.close(); audioContext = null }
        if (bgmAudioEl) { bgmAudioEl.pause(); bgmAudioEl = null }
    }

    // ==========================================
    // MODULE: Canvas & Rendering
    // ==========================================
    const initWorker = () => {
        if (!processingCanvas.value || isTransferred.value) return false
        if (typeof OffscreenCanvas === 'undefined' || typeof VideoFrame === 'undefined') return false

        try {
            const canvas = processingCanvas.value
            const offscreen = canvas.transferControlToOffscreen()
            isTransferred.value = true
            worker = new StudioWorker()
            if (worker) {
                worker.onmessage = (e) => { if (e.data.type === 'error') console.error(e.data.error) }
                worker.postMessage({ type: 'init', payload: { canvas: offscreen } }, [offscreen])
                worker.postMessage({ type: 'resize', payload: { width: canvas.width, height: canvas.height } })
                updateWorkerScene(); updateWorkerSettings();
                return true
            }
        } catch (e) { console.error("Worker Init Failed:", e) }
        return false
    }

    const updateWorkerScene = () => {
        if (!worker) return
        const scene = { id: 'recorder_scene', layout: { id: mode.value + '_' + layoutPreset.value, regions: [] as any[] } }
        if (mode.value === 'camera' || mode.value === 'screen') {
            scene.layout.regions.push({ source: mode.value === 'camera' ? 'host' : 'screen', x: 0, y: 0, width: 100, height: 100 })
        } else if (mode.value === 'camera-screen') {
            if (layoutPreset.value === 'pip') {
                scene.layout.regions.push({ source: 'screen', x: 0, y: 0, width: 100, height: 100 })
                const s = camSettings.value; const pipSize = Math.max(10, Math.min(50, s.size ?? 25))
                const rawPos = (s.position ?? 'BR').toUpperCase(); let pipX = 70, pipY = 70
                if (rawPos.includes('TL')) { pipX = 5; pipY = 5 }
                else if (rawPos.includes('TR')) { pipX = 95 - pipSize; pipY = 5 }
                else if (rawPos.includes('BL')) { pipX = 5; pipY = 95 - pipSize }
                else if (rawPos.includes('BR')) { pipX = 95 - pipSize; pipY = 95 - pipSize }
                scene.layout.regions.push({ source: 'host', x: pipX, y: pipY, width: pipSize, height: pipSize, shape: s.shape ?? 'circle', borderRadius: s.shape === 'circle' ? 999 : 20, border: { color: s.borderColor ?? '#ffffff', width: s.borderWidth ?? 2 } })
            } else if (layoutPreset.value === 'split') {
                scene.layout.regions.push({ source: 'screen', x: 0, y: 0, width: 50, height: 100 }, { source: 'host', x: 50, y: 0, width: 50, height: 100 })
            } else {
                scene.layout.regions.push({ source: layoutPreset.value === 'cam-full' ? 'host' : 'screen', x: 0, y: 0, width: 100, height: 100 })
            }
        } else if (mode.value === 'whiteboard') {
            scene.layout.regions.push({ source: 'screen', x: 0, y: 0, width: 100, height: 100 })
            if (isInfluencerActive.value || camSettings.value.enableCamInWhiteboard) {
                scene.layout.regions.push({ source: 'host', x: 75, y: 70, width: 22, height: 25, shape: 'circle', border: { color: '#ffffff', width: 2 } })
            }
        }
        worker.postMessage({ type: 'update-scene', payload: { scene } })
    }

    const updateWorkerSettings = () => {
        if (!worker) return
        const settings = {
            beauty: { smoothing: enableBeauty.value ? beautySettings.value.smoothing : 0, brightness: enableBeauty.value ? beautySettings.value.brightness : 1.0, sharpen: enableBeauty.value ? 0.2 : 0, denoise: enableBeauty.value ? 0.1 : 0 },
            background: { mode: camSettings.value.enableBlur ? 'blur' : 'none', blurLevel: camSettings.value.blurStrength > 15 ? 'high' : 'medium' }
        }
        worker.postMessage({ type: 'update-settings', payload: settings })
    }

    const bridgeStream = (id: string, element: HTMLVideoElement) => {
        if (!worker || !element.srcObject || bridgedStreams.has(id)) return
        try {
            const stream = element.srcObject as MediaStream; const track = stream.getVideoTracks()[0]
            if (!track || track.readyState !== 'live') return
            const processor = new MediaStreamTrackProcessor({ track })
            const readable = processor.readable
            worker.postMessage({ type: 'add-stream', payload: { id, stream: readable } }, [readable])
            bridgedStreams.add(id)
        } catch (e) { console.error("Stream Bridge Failed:", e) }
    }

    const checkStreams = () => {
        if (!worker) return
        const activeIds = new Set<string>()
        if (isInfluencerActive.value && influencerStream.value) {
            activeIds.add('host')
            if (!bridgedStreams.has('host')) {
                const track = influencerStream.value.getVideoTracks()[0]
                if (track && track.readyState === 'live') {
                    const processor = new MediaStreamTrackProcessor({ track }); const readable = processor.readable
                    worker.postMessage({ type: 'add-stream', payload: { id: 'host', stream: readable } }, [readable])
                    bridgedStreams.add('host')
                }
            }
        } else if (sourceVideo.value?.srcObject && mode.value === 'camera') { activeIds.add('host'); bridgeStream('host', sourceVideo.value) }
        else if (webcamVideo.value?.srcObject && (mode.value === 'camera-screen' || (mode.value === 'whiteboard' && camSettings.value.enableCamInWhiteboard))) { activeIds.add('host'); bridgeStream('host', webcamVideo.value) }

        if (mode.value === 'whiteboard' && whiteboardContent.value) {
            activeIds.add('screen')
            if (whiteboardContent.value instanceof MediaStream && !bridgedStreams.has('screen')) {
                 const track = whiteboardContent.value.getVideoTracks()[0]
                 if (track && track.readyState === 'live') {
                     const processor = new MediaStreamTrackProcessor({ track }); const readable = processor.readable
                     worker.postMessage({ type: 'add-stream', payload: { id: 'screen', stream: readable } }, [readable])
                     bridgedStreams.add('screen')
                 }
            } else if (whiteboardContent.value instanceof ImageBitmap) {
                worker.postMessage({ type: 'update-background', payload: { backgroundData: whiteboardContent.value } }, [whiteboardContent.value])
            }
        } else if (sourceVideo.value?.srcObject && (mode.value === 'screen' || mode.value === 'camera-screen')) { activeIds.add('screen'); bridgeStream('screen', sourceVideo.value) }

        bridgedStreams.forEach(id => { if (!activeIds.has(id)) { worker?.postMessage({ type: 'remove-stream', payload: { id } }); bridgedStreams.delete(id) } })
    }

    const startRendering = () => {
        if (isTransferred.value) { if (!animationFrameId && mode.value !== 'audio') renderLoop(); return }
        if (initWorker()) renderLoop()
    }

    const stopRendering = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }
    }

    const renderLoop = () => {
        const loop = (time: number) => {
            if (mode.value === 'audio') { animationFrameId = null; return }
            frameCount.value++
            if (frameCount.value % 60 === 0) checkStreams()
            if (worker && frameCount.value % 10 === 0 && isAnnotationDirty) {
                createImageBitmap(annotationCanvas).then(bitmap => {
                    worker?.postMessage({ type: 'update-overlay', payload: { overlayData: bitmap } }, [bitmap])
                    isAnnotationDirty = false
                })
            }
            if ((camSettings.value.enableBlur || enableBeauty.value || isInfluencerActive.value) && (mode.value === 'camera' || mode.value === 'camera-screen')) {
                const aiSource = mode.value === 'camera' ? sourceVideo.value : webcamVideo.value
                if (aiSource && aiSource.videoWidth > 0 && (forceFirstMask || time - lastAIProcessTime > AI_PROCESS_INTERVAL)) {
                    liveAIEngine.processFrame(aiSource, time, { enableSegmentation: true, enableFace: true }).then(res => {
                        if (res.segmentationMask && worker) {
                             worker.postMessage({ type: 'update-mask', payload: { maskData: res.segmentationMask, width: aiSource.videoWidth, height: aiSource.videoHeight } }, [res.segmentationMask.buffer])
                        }
                    })
                    forceFirstMask = false; lastAIProcessTime = time
                }
            }
            animationFrameId = requestAnimationFrame(loop)
        }
        animationFrameId = requestAnimationFrame(loop)
    }

    // ==========================================
    // MODULE: AI & Logic
    // ==========================================
    const toggleAI = async () => {
        if (!liveAIEngine.isInitialized) await liveAIEngine.initialize()
        isAiActive.value = !isAiActive.value
        enableBeauty.value = isAiActive.value
        toast(isAiActive.value ? 'AI Enhancement Enabled' : 'AI Enhancement Disabled')
    }

    const toggleCaptions = async () => {
        if (activeCaptions.value === false && !liveAIEngine.isInitialized) await liveAIEngine.initialize()
        activeCaptions.value = !activeCaptions.value
        if (activeCaptions.value) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = true; recognition.interimResults = true; recognition.lang = targetLanguage.value === 'vi' ? 'vi-VN' : 'en-US'
                recognition.onresult = (e: any) => {
                    let final = '', interim = ''
                    for (let i = e.resultIndex; i < e.results.length; ++i) { if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript }
                    currentCaption.value = final || interim
                }
                recognition.onend = () => { if (activeCaptions.value) recognition.start() }
                recognition.start(); (window as any)._recorderRecognition = recognition
            } else { toast.error('Speech Recognition unsupported'); activeCaptions.value = false }
        } else {
            if ((window as any)._recorderRecognition) { (window as any)._recorderRecognition.stop(); (window as any)._recorderRecognition = null }
            currentCaption.value = ''
        }
    }

    const generateWhiteboardAIScripts = async () => {
        if (whiteboardPages.value.length === 0) return
        if (!liveAIEngine.isInitialized) await liveAIEngine.initialize()
        const toastId = toast.loading('AI is analyzing your slides...')
        try {
            const scripts: string[] = []
            for (let i = 0; i < whiteboardPages.value.length; i++) {
                const bitmap = whiteboardPages.value[i]; const canvas = document.createElement('canvas')
                canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
                const base64 = canvas.toDataURL('image/jpeg', 0.8)
                const res = await (aiStore as any).analyzeVision(base64, `Professional presenter script (2 sentences) for slide ${i+1}.`) 
                scripts.push(res.text || `Slide ${i+1} technical details.`)
                toast.message(`Analyzed slide ${i+1}/${whiteboardPages.value.length}`, { id: toastId })
            }
            whiteboardScripts.value = scripts; toast.success('AI Scripts Generated!', { id: toastId })
        } catch (err) { toast.error('AI Analysis failed', { id: toastId }) }
    }

    // ==========================================
    // MODULE: Presentation Driver
    // ==========================================
    const playSlide = async (index: number) => {
        if (index >= whiteboardPages.value.length) { toast.success('Presentation completed!'); stopAIPresentation(); return }
        const script = whiteboardScripts.value[index]
        if (!script) { currentWhiteboardPage.value = index + 1; whiteboardContent.value = whiteboardPages.value[index + 1]; playSlide(index + 1); return }
        isSynthesizing.value = true
        try {
            const voiceData = await influencerStore.generateVoicePreview({ text: script, provider: 'google', voiceId: selectedVoice.value, language: targetLanguage.value })
            if (!voiceData?.audioUrl) throw new Error('Speech synthesis failed')
            const audio = new Audio(getFileUrl(voiceData.audioUrl)); audio.crossOrigin = 'anonymous'; currentPresentationAudio = audio
            await new Promise(r => audio.onloadedmetadata = r)
            
            const pCtx = new AudioContext(); const source = pCtx.createMediaElementSource(audio); const pAnalyser = pCtx.createAnalyser()
            pAnalyser.fftSize = 256; source.connect(pAnalyser); pAnalyser.connect(pCtx.destination)
            const dataArray = new Uint8Array(pAnalyser.frequencyBinCount)

            const updateSync = () => {
                if (!isAIPresenting.value) return
                pAnalyser.getByteTimeDomainData(dataArray)
                let sum = 0; for (let i = 0; i < dataArray.length; i++) { const a = (dataArray[i] - 128) / 128.0; sum += a * a }
                presentationViseme.value = Math.min(1.0, Math.sqrt(sum / dataArray.length) * 2.5)
                if (isTransferred.value) worker?.postMessage({ type: 'update-3d-audio', payload: { id: 'host', audioLevel: presentationViseme.value } })
                if (!audio.paused && !audio.ended) presentationAnimationId = requestAnimationFrame(updateSync)
            }
            audio.onended = () => {
                cancelAnimationFrame(presentationAnimationId!); presentationViseme.value = 0
                if (currentWhiteboardPage.value < whiteboardPages.value.length - 1) { currentWhiteboardPage.value++; whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value]; playSlide(currentWhiteboardPage.value) }
                else { toast.success('Presentation finished!'); stopAIPresentation() }
            }
            isSynthesizing.value = false; audio.play(); updateSync()
        } catch (e: any) { toast.error('Presentation error: ' + e.message); stopAIPresentation() }
    }

    const startAIPresentation = async () => {
        if (whiteboardPages.value.length === 0 || whiteboardScripts.value.length === 0) return
        if (!liveAIEngine.isInitialized) await liveAIEngine.initialize()
        isAIPresenting.value = true; mode.value = 'whiteboard'; playSlide(currentWhiteboardPage.value)
    }

    const stopAIPresentation = () => {
        isAIPresenting.value = false; isSynthesizing.value = false
        if (currentPresentationAudio) { currentPresentationAudio.pause(); currentPresentationAudio = null }
        if (presentationAnimationId) cancelAnimationFrame(presentationAnimationId)
    }

    // ==========================================
    // MODULE: Recording
    // ==========================================
    const startRecording = () => {
        const s = processingCanvas.value?.captureStream(30)
        if (!s) return
        if (masterDestination) { const track = masterDestination.stream.getAudioTracks()[0]; if (track) s.addTrack(track) }
        else if (currentStream.value) { currentStream.value.getAudioTracks().forEach(t => s.addTrack(t)) }
        recordedChunks.value = []
        mediaRecorder.value = new MediaRecorder(s, { mimeType: 'video/webm;codecs=vp9,opus' })
        mediaRecorder.value.ondataavailable = (e: any) => { if (e.data.size > 0) recordedChunks.value.push(e.data) }
        mediaRecorder.value.onstop = () => { recordedVideoUrl.value = URL.createObjectURL(new Blob(recordedChunks.value, { type: 'video/webm' })); showFinishDialog.value = true }
        mediaRecorder.value.start(); isRecording.value = true; recordingTime.value = 0
        recordingTimer = setInterval(() => { recordingTime.value++; if (recordingTime.value >= maxDuration.value) stopRecording() }, 1000)
    }

    const stopRecording = () => {
        if (mediaRecorder.value && isRecording.value) { mediaRecorder.value.stop(); isRecording.value = false; clearInterval(recordingTimer); window.speechSynthesis.cancel() }
    }

    const startCountdown = () => {
        if (isRecording.value || isCountdownActive.value) return
        isCountdownActive.value = true; countdownValue.value = 3
        const cd = setInterval(() => { countdownValue.value--; if (countdownValue.value <= 0) { clearInterval(cd); isCountdownActive.value = false; startRecording() } }, 1000)
    }

    const downloadRecording = () => {
        if (!recordedVideoUrl.value) return
        const a = document.createElement('a'); a.href = recordedVideoUrl.value; a.download = `recording-${Date.now()}.webm`; a.click()
    }

    const saveToProject = async () => {
        if (!recordedVideoUrl.value) return
        try {
            const blob = await fetch(recordedVideoUrl.value).then(r => r.blob())
            const formData = new FormData(); formData.append('file', blob, `rec-${Date.now()}.webm`); formData.append('purpose', 'recording')
            const res = await mediaStore.uploadMedia(formData); toast.success('Saved to project assets'); showFinishDialog.value = false; return res.media
        } catch (e) { toast.error('Failed to save') }
    }

    // ==========================================
    // MODULE: Initialization & Lifecycle
    // ==========================================
    const initializeStream = async (oldMode?: RecordingMode) => {
        try {
            isScreenShareEnded.value = false
            const canReuse = oldMode && ['screen', 'camera-screen'].includes(oldMode) && ['screen', 'camera-screen'].includes(mode.value) && currentStream.value?.getVideoTracks().length
            if (!canReuse) { stopAllTracks(currentStream.value); currentStream.value = null }
            if (mode.value !== 'camera-screen') { stopAllTracks(secondaryStream.value); secondaryStream.value = null }
            if (sourceVideo.value) sourceVideo.value.srcObject = null
            if (webcamVideo.value) webcamVideo.value.srcObject = null
            
            let stream: MediaStream
            if (mode.value === 'camera') {
                stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080, deviceId: selectedCameraId.value ? { exact: selectedCameraId.value } : undefined }, audio: { deviceId: selectedMicId.value ? { exact: selectedMicId.value } : undefined } })
            } else if (mode.value === 'screen') {
                stream = canReuse && currentStream.value ? currentStream.value : await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true })
                stream.getVideoTracks()[0].onended = () => isScreenShareEnded.value = true
            } else if (mode.value === 'camera-screen') {
                if (!secondaryStream.value) secondaryStream.value = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: true })
                stream = canReuse && currentStream.value ? currentStream.value : await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true })
                stream.getVideoTracks()[0].onended = () => isScreenShareEnded.value = true
            } else { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
            
            currentStream.value = stream
            if (mode.value === 'audio') { stopRendering(); setupAudioVisualizer(stream) }
            else { setupPipeline(stream) }
        } catch (e) { toast.error('Device access failed') }
    }

    const setupPipeline = (stream: MediaStream) => {
        if (!sourceVideo.value) sourceVideo.value = document.createElement('video')
        sourceVideo.value.srcObject = stream; sourceVideo.value.autoplay = true; sourceVideo.value.muted = true; sourceVideo.value.play()
        sourceVideo.value.onloadedmetadata = () => {
            const vw = sourceVideo.value!.videoWidth || 1280, vh = sourceVideo.value!.videoHeight || 720
            if (processingCanvas.value && !isTransferred.value) { processingCanvas.value.width = vw; processingCanvas.value.height = vh }
            annotationCanvas.width = vw; annotationCanvas.height = vh; startRendering()
        }
        setupAudioVisualizer(stream)
        if (mode.value === 'camera-screen') {
            if (!webcamVideo.value) webcamVideo.value = document.createElement('video')
            webcamVideo.value.srcObject = secondaryStream.value; webcamVideo.value.autoplay = true; webcamVideo.value.muted = true; webcamVideo.value.play()
        }
    }

    // ==========================================
    // MODULE: Streaming
    // ==========================================
    const toggleLiveStream = async () => {
        if (isStreaming.value) {
            if (publisher.value) { publisher.value.stop(); publisher.value = null }
            if (currentSessionId.value) await streamingStore.stopStream(currentSessionId.value)
            isStreaming.value = false; toast.success('Stream ended')
        } else {
            if (selectedPlatforms.value.length === 0 && !streamConfig.value.serverUrl) { toast.error('Select platform'); activeSidebar.value = 'live'; return }
            try {
                if (selectedPlatforms.value.length > 0) {
                    const res = await streamingStore.startStream({ platformAccountIds: selectedPlatforms.value, source: 'webrtc', quality: { width: 1920, height: 1080, videoBitrate: streamConfig.value.bitrate, audioBitrate: 128, fps: 30 } })
                    const { sessionId, amsAccount } = res.data; currentSessionId.value = sessionId
                    if (amsAccount) publisher.value = new WebRTCPublisher({ websocketUrl: `${amsAccount.credentials.serverUrl.replace('http', 'ws')}/${amsAccount.credentials.appName}/websocket`, streamId: amsAccount.streamKey })
                } else publisher.value = new WebRTCPublisher({ websocketUrl: streamConfig.value.serverUrl, streamId: streamConfig.value.streamKey })
                if (publisher.value && currentStream.value) { await publisher.value.start(currentStream.value); isStreaming.value = true; toast.success('LIVE!') }
            } catch (e) { toast.error('Streaming failed') }
        }
    }

    // ==========================================
    // UTILS & WATCHERS
    // ==========================================
    const startDrawing = (x: number, y: number) => { if (!isAnnotationActive.value) return; isDrawingAnnotation = true; annotationCtx.beginPath(); annotationCtx.moveTo(x, y); isAnnotationDirty = true }
    const draw = (x: number, y: number) => {
        if (!isAnnotationActive.value || !isDrawingAnnotation) return
        annotationCtx.lineCap = 'round'; annotationCtx.strokeStyle = annotationColor.value; annotationCtx.lineWidth = annotationSize.value
        if (annotationTool.value === 'highlighter') { annotationCtx.globalAlpha = 0.4; annotationCtx.lineWidth = annotationSize.value * 5 } else annotationCtx.globalAlpha = 1
        annotationCtx.lineTo(x, y); annotationCtx.stroke(); isAnnotationDirty = true
    }
    const clearAnnotations = () => { annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height); isAnnotationDirty = true }

    watch(isTeleprompterScrolling, val => {
        if (val) teleprompterInterval = setInterval(() => teleprompterScrollPos.value += (teleprompterSpeed.value * 0.5), 30)
        else clearInterval(teleprompterInterval)
    })

    watch(() => mode.value, (newMode, oldMode) => { if (newMode === 'whiteboard') { isWhiteboardLaunchpadActive.value = true; showInfluencerSelectDialog.value = true }; updateWorkerScene() })
    watch([layoutPreset, camSettings, enableBeauty, beautySettings], () => { updateWorkerScene(); updateWorkerSettings() }, { deep: true })

    onMounted(async () => {
        await platformStore.fetchAccounts()
        if (userStore.token) ActionSyncService.connect(currentSessionId.value || 'recorder_global', userStore.token)
    })

    onUnmounted(() => {
        stopAllTracks(currentStream.value); stopAllTracks(secondaryStream.value); stopAllTracks(influencerStream.value)
        cleanupAudio(); stopRendering(); if (worker) worker.terminate()
        clearInterval(teleprompterInterval); if ((window as any)._recorderRecognition) (window as any)._recorderRecognition.stop()
    })

    return {
        mode, activeSidebar, appliedFilter, enableBeauty, beautySettings,
        processingCanvas, displayCanvas, sourceVideo, webcamVideo, isStreaming, streamConfig, streamStats, publisher,
        selectedPlatforms, availableAccounts: computed(() => platformStore.accounts), togglePlatform: (id: string) => { const i = selectedPlatforms.value.indexOf(id); if (i === -1) selectedPlatforms.value.push(id); else selectedPlatforms.value.splice(i, 1) },
        fileInput, presentationInput, resourcePool, activeOverlays, layoutPreset,
        isInfluencerActive, influencerStream, whiteboardContent, whiteboardPages, currentWhiteboardPage, isWhiteboardLaunchpadActive,
        isTeleprompterActive, isTeleprompterScrolling, teleprompterScript, teleprompterSpeed, teleprompterFontSize, teleprompterScrollPos,
        isAnnotationActive, annotationTool, annotationColor, annotationSize, podcastSettings, camSettings, avatarPresets, tabs,
        selectedAvatar, selectedVoice, showMiniPreview, showPlatformSelector,
        enableAslAssist, aslMode, currentSlideIndex,
        enableVoiceSwap: computed(() => camSettings.value.enableVoiceSwap),
        currentStream, secondaryStream, videoDevices, audioDevices, selectedCameraId, selectedMicId, isScreenShareEnded, recordingQuality, enumerateDevices,
        micEnabled, currentDb: computed(() => Math.max(currentDb.value, presentationViseme.value)), audioLevels, micVolume, bgmVolume, isDuckingEnabled, bgmUrl, bgmLibrary, toggleBGM, toggleMic: () => micEnabled.value = !micEnabled.value,
        isAiActive, activeCaptions, currentCaption, translatedCaption, targetLanguage, isAnalyzing, toggleAI, generateWhiteboardAIScripts, startAIPresentation, stopAIPresentation,
        nextPresentationPage: () => { if (currentWhiteboardPage.value < whiteboardPages.value.length - 1) { currentWhiteboardPage.value++; whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value] } },
        prevPresentationPage: () => { if (currentWhiteboardPage.value > 0) { currentWhiteboardPage.value--; whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value] } },
        goToPresentationPage: (p: number) => { if (p >= 0 && p < whiteboardPages.value.length) { currentWhiteboardPage.value = p; whiteboardContent.value = whiteboardPages.value[p] } },
        toggleCaptions, isRecording, recordingTime, maxDuration, recordedVideoUrl, showFinishDialog, isCountdownActive, countdownValue,
        startRecording, stopRecording, toggleRecording: () => isRecording.value ? stopRecording() : startCountdown(), downloadRecording, saveToProject, startCountdown,
        switchMode: async (newMode: RecordingMode) => { if (isRecording.value) return; const old = mode.value; mode.value = newMode; await initializeStream(old) },
        initializeStream, stopRendering, startDrawing, draw, stopDrawing: () => isDrawingAnnotation = false, clearAnnotations,
        handleFileUpload: (e: any) => { const f = e.target.files?.[0]; if (!f) return; const url = URL.createObjectURL(f); const type = f.type.startsWith('video') ? 'video' : 'image'; let el = type === 'image' ? new Image() : document.createElement('video'); el.src = url; resourcePool.value.push({ id: crypto.randomUUID(), name: f.name, url, type, x: 50, y: 50, width: 400, height: 300, aspect: 4/3, element: el }); toast.success(`Imported ${f.name}`) },
        handlePresentationUpload: async (e: any) => { const f = e.target.files[0]; if (!f) return; const tid = toast.loading(`Processing ${f.name}...`); try { const { pages } = await DocumentProcessor.processFile(f); whiteboardPages.value = pages; currentWhiteboardPage.value = 0; if (pages.length > 0) { whiteboardContent.value = pages[0]; isWhiteboardLaunchpadActive.value = false }; toast.success(`${f.name} imported`, { id: tid }); setTimeout(() => { if (whiteboardScripts.value.length === 0) generateWhiteboardAIScripts() }, 1000) } catch (err: any) { toast.error(err.message || 'Failed', { id: tid }) } },
        handleInfluencerStreamReady: (s: MediaStream) => { influencerStream.value = s; isInfluencerActive.value = true; toast.success('Avatar Active') },
        handleWhiteboardScreenShare: async () => { try { const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true }); whiteboardContent.value = s; isWhiteboardLaunchpadActive.value = false; toast.success('Sharing Started') } catch (e) { toast.error('Cancelled') } },
        handleWhiteboardFileImport: async (t: 'pdf' | 'ppt' | 'video') => { toast(`Importing ${t}...`); if (t === 'video') fileInput.value?.click(); else presentationInput.value?.click() },
        toggleAIFilter: () => { const i = videoFilters.findIndex(f => f.id === appliedFilter.value); const ni = (i + 1) % videoFilters.length; appliedFilter.value = videoFilters[ni].id; toast(`Filter: ${videoFilters[ni].name}`) },
        toggleLiveStream, triggerFileUpload: () => fileInput.value?.click(), triggerPresentationUpload: () => presentationInput.value?.click(), triggerResourceUpload: () => fileInput.value?.click(),
        toggleOverlay: (id: string) => { const i = activeOverlays.value.indexOf(id); if (i === -1) activeOverlays.value.push(id); else activeOverlays.value.splice(i, 1) },
        whiteboardScripts, isAIPresenting, isSynthesizing, showInfluencerSelectDialog, influencerStore, t, router, projectStore
    }
}
