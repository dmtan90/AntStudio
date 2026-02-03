import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import { arFilterEngine } from '@/utils/ai/ARFilterEngine'
import { liveAIEngine } from '@/utils/ai/LiveAIEngine'
import { liveSpeechAPI } from '@/utils/ai/LiveSpeechAPI'
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher'
import { useRecorderCanvas } from './useRecorderCanvas'
import {
    Camera, Monitor, Voice, Cpu, CloseOne, CheckOne, Loading, Download, Share, Magic, BroadcastRadio, Effects, MicrophoneOne, SettingConfig
} from '@icon-park/vue-next'

export type RecordingMode = 'camera' | 'camera-screen' | 'screen' | 'audio' | 'podcast' | 'autopilot'

export const videoFilters = [
    { id: 'none', name: 'Original', css: '', thumb: 'https://images.unsplash.com/photo-1492691523567-69b92043628e?w=200' },
    { id: '1977', name: '1977', css: 'sepia(0.5) hue-rotate(-30deg) saturate(1.2)', thumb: 'https://images.unsplash.com/photo-1500462418194-7ee11185598c?w=200&sig=1' },
    { id: 'aden', name: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)', thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&sig=2' },
    { id: 'brannan', name: 'Brannan', css: 'sepia(0.5) contrast(1.4)', thumb: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=200&sig=3' },
    { id: 'brooklyn', name: 'Brooklyn', css: 'contrast(0.9) brightness(1.1)', thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&sig=4' },
    { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)', thumb: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&sig=5' },
    { id: 'gingham', name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg)', thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&sig=6' },
    { id: 'hudson', name: 'Hudson', css: 'brightness(1.2) contrast(0.9) saturate(1.1)', thumb: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=200&sig=7' },
    { id: 'inkwell', name: 'Inkwell', css: 'sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)', thumb: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&sig=8' },
    { id: 'lofi', name: 'Lo-Fi', css: 'saturate(1.1) contrast(1.5)', thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&sig=9' },
    { id: 'maven', name: 'Maven', css: 'sepia(0.25) brightness(0.95) contrast(0.95) saturate(1.5)', thumb: 'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=200&sig=10' },
    { id: 'mayfair', name: 'Mayfair', css: 'contrast(1.1) saturate(1.1)', thumb: 'https://images.unsplash.com/photo-1434725039720-abb26e22cf8e?w=200&sig=11' },
    { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)', thumb: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200&sig=12' },
    { id: 'nashville', name: 'Nashville', css: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)', thumb: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=200&sig=13' },
    { id: 'rise', name: 'Rise', css: 'brightness(1.05) sepia(0.2) contrast(0.9) saturate(0.9)', thumb: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&sig=14' },
    { id: 'toaster', name: 'Toaster', css: 'contrast(1.5) brightness(0.9)', thumb: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=200&sig=15' },
    { id: 'walden', name: 'Walden', css: 'brightness(1.1) hue-rotate(-10deg) sepia(0.3) saturate(1.6)', thumb: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&sig=16' },
    { id: 'willow', name: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(0.9)', thumb: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&sig=17' },
    { id: 'xpro2', name: 'X-Pro II', css: 'sepia(0.3) contrast(1.3) brightness(0.8)', thumb: 'https://images.unsplash.com/photo-1441834493933-4076755490c0?w=200&sig=18' }
]

export function useRecorder() {
    const router = useRouter()
    const projectStore = useProjectStore()
    const { t } = useTranslations()

    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let masterGain: GainNode | null = null
    let compressor: DynamicsCompressorNode | null = null
    let micSource: MediaStreamAudioSourceNode | null = null
    let renderRequestId: number | null = null
    let timer: any = null

    // --- State ---
    const mode = ref<RecordingMode>('camera')
    const isRecording = ref(false)
    const recordingTime = ref(0)
    const maxDuration = ref(600)
    const micEnabled = ref(true)
    const activeSidebar = ref<'filters' | 'ai' | 'live' | 'audio' | 'autopilot' | 'podcast' | 'hardware' | 'production' | null>(null)
    const appliedFilter = ref('none')
    const showFinishDialog = ref(false)
    const enableAslAssist = ref(false)
    const aslMode = ref<'asl-to-text' | 'text-to-asl'>('asl-to-text')
    const enableBeauty = ref(false)
    const beautySettings = ref({ smoothing: 0.6, brightness: 1.1 })
    const currentDb = ref(0)
    const isAiActive = ref(false)

    // Canvas & Video Elements
    const processingCanvas = ref<HTMLCanvasElement | null>(null)
    const displayCanvas = ref<HTMLCanvasElement | null>(null)
    const sourceVideo = ref<HTMLVideoElement | null>(null)
    const webcamVideo = ref<HTMLVideoElement | null>(null)

    // AI State
    const activeCaptions = ref(false)
    const currentCaption = ref('')
    const translatedCaption = ref('')
    const targetLanguage = ref('vi')

    // Streaming State
    const isStreaming = ref(false)
    const streamConfig = ref({ serverUrl: '', streamKey: '', useAntMedia: true, port: '5443' })
    const streamStats = ref<any>({ bitrate: 0, fps: 0, rtt: 0 })
    const publisher = ref<WebRTCPublisher | null>(null)

    // Inputs
    const fileInput = ref<HTMLInputElement | null>(null)
    const presentationInput = ref<HTMLInputElement | null>(null)

    // Resource Pool
    const resourcePool = ref<Array<{
        id: string, name: string, url: string, type: 'image' | 'video',
        element?: HTMLImageElement | HTMLVideoElement,
        x: number, y: number, width: number, height: number, aspect: number,
        audioNode?: MediaElementAudioSourceNode,
        gainNode?: GainNode
    }>>([])
    const activeOverlays = ref<string[]>([])

    // Autopilot State
    const autopilotData = ref<any>(null)
    const currentSlideIndex = ref(0)
    const isAnalyzing = ref(false)
    const selectedAvatar = ref('sarah')
    const selectedVoice = ref('en-US-Standard-C')

    // Media State
    const currentStream = ref<MediaStream | null>(null)
    const secondaryStream = ref<MediaStream | null>(null)
    const recordedChunks = ref<Blob[]>([])
    const mediaRecorder = ref<any>(null)
    const audioLevels = ref<string[]>(Array(50).fill('20%'))
    const isScreenShareEnded = ref(false)
    const recordedVideoUrl = ref<string | null>(null)

    // Hardware Selection
    const videoDevices = ref<MediaDeviceInfo[]>([])
    const audioDevices = ref<MediaDeviceInfo[]>([])
    const selectedCameraId = ref<string | null>(null)
    const selectedMicId = ref<string | null>(null)
    const micVolume = ref(1.0)

    // Countdown & Shortcuts
    const isCountdownActive = ref(false)
    const countdownValue = ref(3)
    const showMiniPreview = ref(false)

    // Teleprompter
    const isTeleprompterActive = ref(false)
    const isTeleprompterScrolling = ref(false)
    const teleprompterScript = ref("Welcome to AntFlow! This is your professional teleprompter. You can paste your script here and it will scroll automatically while you record. Adjust the speed and font size to your liking in the Production tab.")
    const teleprompterSpeed = ref(2)
    const teleprompterFontSize = ref(24)
    const teleprompterScrollPos = ref(0)

    // Layout Presets
    const layoutPreset = ref<'pip' | 'split' | 'cam-full' | 'screen-full'>('pip')

    // Annotations
    const isAnnotationActive = ref(false)
    const annotationTool = ref<'pen' | 'highlighter'>('pen')
    const annotationColor = ref('#f97316')
    const annotationSize = ref(4)
    const annotationCanvas = document.createElement('canvas')
    const annotationCtx = annotationCanvas.getContext('2d')!
    let isDrawingAnnotation = false

    const slideImageObjects = ref<Record<number, HTMLImageElement>>({})
    const maskCanvas = document.createElement('canvas')
    const maskCtx = maskCanvas.getContext('2d')!

    const podcastSettings = ref({
        bg: 'linear-gradient(135deg, #001 0%, #102 100%)',
        visualType: 'waveform' as 'bars' | 'waveform' | 'circles',
        bgmVolume: 0.3,
        showVisualizer: true,
        proEnhance: false,
        backgroundType: 'none',
        backgroundResource: null as string | null
    })

    const avatarPresets = [
        { id: 'sarah', name: 'Sarah', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
        { id: 'james', name: 'James', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James' }
    ]

    const tabs = computed(() => [
        { value: 'camera', label: 'Camera', icon: Camera },
        { value: 'camera-screen', label: 'Cam + Screen', icon: Monitor },
        { value: 'screen', label: 'Screen', icon: Monitor },
        { value: 'audio', label: 'Audio Only', icon: Voice },
        { value: 'podcast', label: 'Podcast', icon: Voice },
        { value: 'autopilot', label: 'Autopilot', icon: Cpu }
    ])

    const camSettings = ref<any>({
        size: 25,
        shape: 'circle',
        position: 'bottom-left',
        x: 20,
        y: 20,
        opacity: 1,
        flip: false,
        borderColor: '#ffffff',
        borderWidth: 2,
        faceParams: { x: 0.5, y: 0.5 },
        enableBlur: false,
        blurStrength: 10,
        backgroundType: 'none',
        backgroundResource: null as string | null,
        enableEnhance: false,
        enableFaceSwap: false,
        faceSwapResource: null as string | null
    })

    const overlayFile = ref<{ element: HTMLImageElement | HTMLVideoElement, type: 'image' | 'video', x: number, y: number, width: number, height: number, aspect: number } | null>(null)

    const { startRendering, stopRendering: stopCanvasRendering } = useRecorderCanvas(
        processingCanvas,
        sourceVideo,
        webcamVideo,
        annotationCanvas,
        {
            mode,
            layoutPreset,
            camSettings,
            appliedFilter,
            enableBeauty,
            beautySettings,
            isRecording
        }
    );

    const enumerateDevices = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        videoDevices.value = devices.filter(d => d.kind === 'videoinput')
        audioDevices.value = devices.filter(d => d.kind === 'audioinput')
        if (!selectedCameraId.value && videoDevices.value.length) selectedCameraId.value = videoDevices.value[0].deviceId
        if (!selectedMicId.value && audioDevices.value.length) selectedMicId.value = audioDevices.value[0].deviceId
    }

    const clearAnnotations = () => {
        annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height)
    }

    const startDrawing = (x: number, y: number) => {
        if (!isAnnotationActive.value) return
        isDrawingAnnotation = true
        annotationCtx.beginPath()
        annotationCtx.moveTo(x, y)
    }

    const draw = (x: number, y: number) => {
        if (!isAnnotationActive.value || !isDrawingAnnotation) return
        annotationCtx.lineCap = 'round'
        annotationCtx.lineJoin = 'round'
        annotationCtx.strokeStyle = annotationColor.value
        annotationCtx.lineWidth = annotationSize.value
        if (annotationTool.value === 'highlighter') {
            annotationCtx.globalAlpha = 0.4
            annotationCtx.lineWidth = annotationSize.value * 5
        } else {
            annotationCtx.globalAlpha = 1.0
        }
        annotationCtx.lineTo(x, y)
        annotationCtx.stroke()
    }

    const stopDrawing = () => {
        isDrawingAnnotation = false
    }

    const toggleAI = () => {
        isAiActive.value = !isAiActive.value
        enableBeauty.value = isAiActive.value
        toast(isAiActive.value ? 'AI Enhancement Enabled' : 'AI Enhancement Disabled')
    }

    const switchMode = async (newMode: RecordingMode) => {
        if (isRecording.value) { toast.error('Please stop recording first'); return }
        const oldMode = mode.value
        mode.value = newMode
        await initializeStream(oldMode)
    }

    const initializeStream = async (oldMode?: RecordingMode) => {
        try {
            isScreenShareEnded.value = false
            const screenModes = ['screen', 'camera-screen']
            const canReuseScreen = oldMode && screenModes.includes(oldMode) && screenModes.includes(mode.value) && currentStream.value?.getVideoTracks().length

            if (!canReuseScreen) {
                if (currentStream.value) currentStream.value.getTracks().forEach(t => t.stop())
            }
            if (secondaryStream.value && mode.value !== 'camera-screen') {
                secondaryStream.value.getTracks().forEach(t => t.stop()); secondaryStream.value = null
            }

            await liveAIEngine.initialize()

            let stream: MediaStream
            if (mode.value === 'camera') {
                const constraints: any = { video: { width: 1920, height: 1080 }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
                if (selectedCameraId.value) constraints.video.deviceId = { exact: selectedCameraId.value }
                if (selectedMicId.value) constraints.audio.deviceId = { exact: selectedMicId.value }
                stream = await navigator.mediaDevices.getUserMedia(constraints)
            } else if (mode.value === 'screen') {
                if (canReuseScreen && currentStream.value) stream = currentStream.value
                else { stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }); stream.getVideoTracks()[0].onended = () => { isScreenShareEnded.value = true } }
            } else if (mode.value === 'camera-screen') {
                if (!secondaryStream.value) {
                    const constraints: any = { video: { width: 480, height: 360, frameRate: 30 }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
                    if (selectedCameraId.value) constraints.video.deviceId = { exact: selectedCameraId.value }
                    if (selectedMicId.value) constraints.audio.deviceId = { exact: selectedMicId.value }
                    secondaryStream.value = await navigator.mediaDevices.getUserMedia(constraints)
                }
                if (canReuseScreen && currentStream.value) stream = currentStream.value
                else { stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }); stream.getVideoTracks()[0].onended = () => { isScreenShareEnded.value = true } }
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
            }
            currentStream.value = stream
            setupProcessingPipeline(stream)
        } catch (e) { toast.error('Unable to access devices.') }
    }

    const setupProcessingPipeline = (stream: MediaStream) => {
        if (!sourceVideo.value) sourceVideo.value = document.createElement('video')
        sourceVideo.value.srcObject = stream; sourceVideo.value.muted = true; sourceVideo.value.playsInline = true; sourceVideo.value.autoplay = true; sourceVideo.value.play()
        sourceVideo.value.onloadedmetadata = () => {
            const v = sourceVideo.value!; const vw = v.videoWidth || 1280; const vh = v.videoHeight || 720
            if (processingCanvas.value) { processingCanvas.value.width = vw; processingCanvas.value.height = vh }
            if (displayCanvas.value) { displayCanvas.value.width = vw; displayCanvas.value.height = vh }
            annotationCanvas.width = vw; annotationCanvas.height = vh

            // Start the optimized WebGL rendering
            startRendering();
        }
        setupAudioVisualizer(stream)
        if (secondaryStream.value) {
            if (!webcamVideo.value) webcamVideo.value = document.createElement('video')
            webcamVideo.value.srcObject = secondaryStream.value; webcamVideo.value.muted = true; webcamVideo.value.playsInline = true; webcamVideo.value.autoplay = true; webcamVideo.value.play()
        }
    }

    const startRecording = () => {
        const s = processingCanvas.value?.captureStream(30)
        if (!s) return
        if (audioContext && masterGain) {
            const dest = audioContext.createMediaStreamDestination(); masterGain.connect(dest); const track = dest.stream.getAudioTracks()[0]; if (track) s.addTrack(track)
        } else if (currentStream.value) { currentStream.value.getAudioTracks().forEach(t => s.addTrack(t)) }

        recordedChunks.value = []; mediaRecorder.value = new (window as any).MediaRecorder(s, { mimeType: 'video/webm;codecs=vp9,opus' })
        mediaRecorder.value.ondataavailable = (e: any) => { if (e.data.size > 0) recordedChunks.value.push(e.data) }
        mediaRecorder.value.onstop = () => { recordedVideoUrl.value = URL.createObjectURL(new Blob(recordedChunks.value, { type: 'video/webm' })); showFinishDialog.value = true }
        mediaRecorder.value.start(); isRecording.value = true; recordingTime.value = 0
        timer = setInterval(() => { recordingTime.value++; if (recordingTime.value >= maxDuration.value) stopRecording() }, 1000)
    }

    const stopRecording = () => {
        if (mediaRecorder.value && isRecording.value) { mediaRecorder.value.stop(); isRecording.value = false; clearInterval(timer); window.speechSynthesis.cancel() }
    }

    const toggleRecording = () => isRecording.value ? stopRecording() : startCountdown()

    const startCountdown = () => {
        if (isRecording.value || isCountdownActive.value) return
        isCountdownActive.value = true; countdownValue.value = 3
        const cd = setInterval(() => { countdownValue.value--; if (countdownValue.value <= 0) { clearInterval(cd); isCountdownActive.value = false; startRecording() } }, 1000)
    }

    const setupAudioVisualizer = async (s: MediaStream) => {
        if (!audioContext) {
            audioContext = new AudioContext(); masterGain = audioContext.createGain(); analyser = audioContext.createAnalyser(); compressor = audioContext.createDynamicsCompressor()
            analyser.fftSize = 128; masterGain.connect(compressor); compressor.connect(analyser)
        }
        if (audioContext.state === 'suspended') await audioContext.resume()
        if (micSource) try { micSource.disconnect() } catch (e) { }
        micSource = audioContext.createMediaStreamSource(s); micSource.connect(masterGain)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (e.code === 'Space') { e.preventDefault(); toggleRecording() }
        if (e.code === 'Escape') { if (isRecording.value) stopRecording(); else showFinishDialog.value = false }
        if (e.code === 'KeyM') micEnabled.value = !micEnabled.value
        if (e.code === 'KeyT') isTeleprompterActive.value = !isTeleprompterActive.value
        if (e.code === 'KeyS' && isTeleprompterActive.value) isTeleprompterScrolling.value = !isTeleprompterScrolling.value
    }

    onMounted(() => { window.addEventListener('keydown', handleKeyDown); enumerateDevices(); initializeStream() })
    onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); if (currentStream.value) currentStream.value.getTracks().forEach(t => t.stop()); if (audioContext) audioContext.close(); stopCanvasRendering(); clearInterval(timer) })

    return {
        mode, isRecording, recordingTime, maxDuration, micEnabled, activeSidebar, appliedFilter, showFinishDialog, enableAslAssist, aslMode, enableBeauty, beautySettings, currentDb, isAiActive, processingCanvas, displayCanvas, sourceVideo, webcamVideo, activeCaptions, currentCaption, translatedCaption, targetLanguage, isStreaming, streamConfig, streamStats, publisher, fileInput, presentationInput, resourcePool, activeOverlays, autopilotData, currentSlideIndex, isAnalyzing, selectedAvatar, selectedVoice, currentStream, secondaryStream, audioLevels, isScreenShareEnded, avatarPresets, tabs, camSettings, overlayFile, podcastSettings,
        videoDevices, audioDevices, selectedCameraId, selectedMicId, micVolume, recordedVideoUrl, isCountdownActive, countdownValue, showMiniPreview,
        isTeleprompterActive, isTeleprompterScrolling, teleprompterScript, teleprompterSpeed, teleprompterFontSize, teleprompterScrollPos,
        layoutPreset, isAnnotationActive, annotationTool, annotationColor, annotationSize,
        toggleAI, switchMode, initializeStream, toggleRecording, stopRecording, startRecording, startCountdown,
        startDrawing, draw, stopDrawing, clearAnnotations,
        handleFileUpload: (e: any) => { }, handlePresentationUpload: (e: any) => { }, startAutopilotSession: () => { }, downloadRecording: () => { }, saveToProject: () => { }, toggleAIFilter: () => { }, toggleCaptions: () => { }, toggleLiveStream: () => { }, toggleMic: () => { micEnabled.value = !micEnabled.value }, triggerFileUpload: () => fileInput.value?.click(), triggerPresentationUpload: () => presentationInput.value?.click(), triggerResourceUpload: () => { }, toggleOverlay: (id: string) => { }, formatTime: (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`, enumerateDevices, t, router, projectStore
    }
}
