import { ref, computed, onMounted, onUnmounted } from 'vue'
import { DocumentProcessor } from '@/utils/recorder/DocumentProcessor'
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
    Camera, Monitor, Voice, Cpu, 
    CloseOne, CheckOne, Loading, Download, 
    Share, Magic, BroadcastRadio, Effects, 
    MicrophoneOne, SettingConfig, VolumeSmall,
    VolumeNotice as VolumeOne
} from '@icon-park/vue-next'

export type RecordingMode = 'camera' | 'camera-screen' | 'screen' | 'audio' | 'podcast' | 'autopilot' | 'whiteboard'

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
    const activeSidebar = ref<'filters' | 'ai' | 'live' | 'audio' | 'autopilot' | 'podcast' | 'hardware' | 'production' | 'whiteboard' | null>(null)
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

    // Recording Quality
    const recordingQuality = ref({
        resolution: '1080p',
        fps: 30
    });

    // Streaming State
    const isStreaming = ref(false)
    const streamConfig = ref({
        serverUrl: '',
        streamKey: '',
        bitrate: 4500,
        useAntMedia: false 
    });
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

    // VTuber State
    const isVTuberActive = ref(false)
    const vtuberStream = ref<MediaStream | null>(null)

    // Whiteboard State
    const whiteboardContent = ref<MediaStream | ImageBitmap | null>(null)
    const whiteboardPages = ref<ImageBitmap[]>([])
    const currentWhiteboardPage = ref(0)
    const isWhiteboardLaunchpadActive = ref(true)
    const isAIPresenting = ref(false)
    const whiteboardScripts = ref<string[]>([])

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
    
    // WebAudio Nodes (initialized in setupAudioVisualizer)
    let micGain: GainNode
    let bgmGain: GainNode
    let bgmAudioEl: HTMLAudioElement | null = null
    let bgmSource: MediaElementAudioSourceNode | null = null
    let masterDestination: MediaStreamAudioDestinationNode
    const bgmVolume = ref(0.3)
    const isDuckingEnabled = ref(true)
    const bgmUrl = ref<string | null>(null)
    const bgmLibrary = ref([
        { id: 'lofi', name: 'Lofi Study', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
        { id: 'jazz', name: 'Smooth Jazz', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
        { id: 'ambient', name: 'Deep Space', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
    ])

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
        { id: 'sarah', name: 'Sarah (AI)', image: '/avatars/sarah.jpg' },
        { id: 'james', name: 'James (AI)', image: '/avatars/james.jpg' },
        { id: 'eva', name: 'Eva (Digital)', image: '/avatar/eva.jpg' }
    ]

    const tabs = computed(() => [
        { value: 'camera', label: 'Camera', icon: Camera },
        { value: 'camera-screen', label: 'Cam + Screen', icon: Monitor },
        { value: 'screen', label: 'Screen', icon: Monitor },
        { value: 'audio', label: 'Audio', icon: Voice },
        // { value: 'podcast', label: 'Podcast', icon: Voice },
        // { value: 'autopilot', label: 'Autopilot', icon: Cpu },
        // { value: 'audio', label: 'Audio', icon: VolumeOne }
        { value: 'whiteboard', label: 'Whiteboard', icon: Cpu },       
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
            isRecording,
            isVTuberActive,
            vtuberStream,
            whiteboardContent
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
        if (newMode === 'whiteboard') {
            isWhiteboardLaunchpadActive.value = true
        }
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
            } else if (mode.value === 'whiteboard') {
                stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
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
        if (audioContext && masterDestination) {
            const track = masterDestination.stream.getAudioTracks()[0];
            if (track) s.addTrack(track)
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
            audioContext = new AudioContext()
            masterGain = audioContext.createGain()
            bgmGain = audioContext.createGain()
            masterDestination = audioContext.createMediaStreamDestination()
            analyser = audioContext.createAnalyser()
            compressor = audioContext.createDynamicsCompressor()
            
            analyser.fftSize = 128
            masterGain.connect(compressor)
            bgmGain.connect(compressor)
            compressor.connect(analyser)
            compressor.connect(masterDestination)
            
            // Start Ducking/Volume Loop
            const updateLevels = () => {
                const dataArray = new Uint8Array(analyser.frequencyBinCount)
                analyser.getByteFrequencyData(dataArray)
                
                // RMS Calculation for mic activity
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i]
                }
                const rms = Math.sqrt(sum / dataArray.length)
                
                // Ducking Logic
                if (isDuckingEnabled.value && bgmGain) {
                    const threshold = 40 // Calibration point
                    const duckAmount = 0.2
                    const targetGain = rms > threshold ? (bgmVolume.value * duckAmount) : bgmVolume.value
                    bgmGain.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.1)
                } else if (bgmGain) {
                    bgmGain.gain.setTargetAtTime(bgmVolume.value, audioContext.currentTime, 0.1)
                }
                
                // Update UI visualization (if needed)
                // audioLevels.value = Array.from(dataArray)
                
                requestAnimationFrame(updateLevels)
            }
            updateLevels()
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

    let teleprompterInterval: any = null;
    watch(isTeleprompterScrolling, (val) => {
        if (val) {
            teleprompterInterval = setInterval(() => {
                teleprompterScrollPos.value += (teleprompterSpeed.value * 0.5);
            }, 30);
        } else {
            clearInterval(teleprompterInterval);
        }
    });

    onMounted(() => { window.addEventListener('keydown', handleKeyDown); enumerateDevices(); initializeStream() })
    onUnmounted(() => { 
        window.removeEventListener('keydown', handleKeyDown); 
        if (currentStream.value) currentStream.value.getTracks().forEach(t => t.stop()); 
        if (audioContext) audioContext.close(); 
        stopCanvasRendering(); 
        clearInterval(timer);
        clearInterval(teleprompterInterval);
        if ((window as any)._recorderRecognition) (window as any)._recorderRecognition.stop();
    })

    return {
        mode, isRecording, recordingTime, maxDuration, micEnabled, activeSidebar, appliedFilter, showFinishDialog, enableAslAssist, aslMode, enableBeauty, beautySettings, currentDb, isAiActive, processingCanvas, displayCanvas, sourceVideo, webcamVideo, activeCaptions, currentCaption, translatedCaption, targetLanguage, isStreaming, streamConfig, streamStats, publisher, fileInput, presentationInput, resourcePool, activeOverlays, autopilotData, currentSlideIndex, isAnalyzing, selectedAvatar, selectedVoice, currentStream, secondaryStream, audioLevels, isScreenShareEnded, avatarPresets, tabs, camSettings, overlayFile, podcastSettings,
        videoDevices, audioDevices, selectedCameraId, selectedMicId, micVolume, recordedVideoUrl, isCountdownActive, countdownValue, showMiniPreview,
        isTeleprompterActive, isTeleprompterScrolling, teleprompterScript, teleprompterSpeed, teleprompterFontSize, teleprompterScrollPos,
        layoutPreset, isAnnotationActive, annotationTool, annotationColor, annotationSize, recordingQuality,
        isVTuberActive, vtuberStream, whiteboardContent, whiteboardPages, currentWhiteboardPage, isWhiteboardLaunchpadActive,
        isAIPresenting, whiteboardScripts,
        bgmVolume, isDuckingEnabled, bgmUrl, bgmLibrary,
        toggleBGM: () => {
            if (!bgmUrl.value) {
                bgmUrl.value = bgmLibrary.value[0].url
            }
            
            if (!bgmAudioEl) {
                bgmAudioEl = new Audio()
                bgmAudioEl.crossOrigin = "anonymous"
                bgmAudioEl.loop = true
            }

            // Route audio element through WebAudio if not already done
            if (!bgmSource && audioContext && bgmGain) {
                 bgmSource = audioContext.createMediaElementSource(bgmAudioEl)
                 bgmSource.connect(bgmGain)
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
        },
        toggleAI, switchMode, initializeStream, toggleRecording, stopRecording, startRecording, startCountdown,
        nextWhiteboardPage: () => {
            if (currentWhiteboardPage.value < whiteboardPages.value.length - 1) {
                currentWhiteboardPage.value++
                whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value]
            }
        },
        prevWhiteboardPage: () => {
             if (currentWhiteboardPage.value > 0) {
                 currentWhiteboardPage.value--
                 whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value]
             }
        },
        startDrawing, draw, stopDrawing, clearAnnotations,
        handleFileUpload: (e: any) => {
             const file = e.target.files?.[0];
             if (!file) return;
             const url = URL.createObjectURL(file);
             const type = file.type.startsWith('video') ? 'video' : 'image';
             
             // Create element to get dimensions
             let width = 400;
             let height = 300;
             let el: any;
             
             if (type === 'image') {
                 el = new Image();
                 el.src = url;
                 el.onload = () => {
                      // Adjust aspect
                 }
             } else {
                 el = document.createElement('video');
                 el.src = url;
             }
             
             resourcePool.value.push({
                 id: crypto.randomUUID(),
                 name: file.name,
                 url,
                 type,
                 x: 50, y: 50,
                 width, height, aspect: width/height,
                 element: el
             });
             toast.success(`Imported ${file.name}`);
        },
        generateWhiteboardAIScripts: async () => {
             if (whiteboardPages.value.length === 0) return;
             const aiStore = (await import('@/stores/ai')).useAIStore();
             const toastId = toast.loading('AI is analyzing your slides...');
             try {
                 const scripts: string[] = [];
                 for (let i = 0; i < whiteboardPages.value.length; i++) {
                     const bitmap = whiteboardPages.value[i];
                     const canvas = document.createElement('canvas');
                     canvas.width = bitmap.width; canvas.height = bitmap.height;
                     const ctx = canvas.getContext('2d')!;
                     ctx.drawImage(bitmap, 0, 0);
                     const base64 = canvas.toDataURL('image/jpeg', 0.8);
                     
                     const prompt = `You are a professional presenter. Analyze this presentation slide and write a clear, engaging script (approx 2 sentences) for an AI avatar to speak. Return only the script text.`;
                     const res = await (aiStore as any).analyzeVision(base64, prompt); 
                     scripts.push(res.text || `This slide covers technical details of our presentation.`);
                     toast.message(`Analyzed slide ${i+1}/${whiteboardPages.value.length}`, { id: toastId });
                 }
                 whiteboardScripts.value = scripts;
                 toast.success('AI Scripts Generated!', { id: toastId });
             } catch (err) {
                 toast.error('AI Analysis failed', { id: toastId });
             }
        },
        startAIAutopilot: () => {
             if (whiteboardScripts.value.length === 0) {
                 toast.error('Please generate scripts first');
                 return;
             }
             // Prepare Autopilot Data
             autopilotData.value = {
                 slides: whiteboardPages.value.map((p, i) => ({
                      id: i.toString(),
                      image: p, // StudioWorker/Canvas already handles ImageBitmap
                      note: whiteboardScripts.value[i] || ""
                 }))
             };
             currentSlideIndex.value = 0;
             mode.value = 'autopilot';
             isAIPresenting.value = true;
             toast.success('AI Whiteboard Autopilot Started');
        },
        handlePresentationUpload: async (e: any) => {
            const file = e.target.files[0]
            if (!file) return
            const toastId = toast.loading(`Processing ${file.name}...`)
            try {
                const { pages, type: docType } = await DocumentProcessor.processFile(file)
                whiteboardPages.value = pages
                currentWhiteboardPage.value = 0
                if (pages.length > 0) {
                    whiteboardContent.value = pages[0]
                    isWhiteboardLaunchpadActive.value = false
                }
                toast.success(`${file.name} imported`, { id: toastId })
            } catch (err: any) {
                console.error(err)
                toast.error(err.message || 'Processing failed', { id: toastId })
            }
        },
        startAutopilotSession: () => {
             if (!autopilotData.value) {
                 toast.error('No presentation loaded');
                 return;
             }
             isAnalyzing.value = true;
             setTimeout(() => {
                 isAnalyzing.value = false;
                 toast.success('Autopilot session started');
                 mode.value = 'autopilot';
             }, 1500);
        },
        downloadRecording: () => {
             if (!recordedVideoUrl.value) return;
             const a = document.createElement('a');
             a.href = recordedVideoUrl.value;
             a.download = `recording-${Date.now()}.webm`;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
        },
        saveToProject: async () => {
             if (!recordedVideoUrl.value) return;
             try {
                 const blob = await fetch(recordedVideoUrl.value).then(r => r.blob());
                 const formData = new FormData();
                 formData.append('file', blob, `rec-${Date.now()}.webm`);
                 formData.append('purpose', 'recording');
                 // Uses mediaStore implicitly or we can emit an event. 
                 // Since we can't easily import store here without modifying the top, 
                 // we will rely on a dispatched action or just import it at top if possible.
                 // Checking imports... yes we can import at top.
                 const mediaStore = (await import('@/stores/media')).useMediaStore();
                 await mediaStore.uploadMedia(formData);
                 toast.success('Saved to project assets');
                 showFinishDialog.value = false;
             } catch (e) {
                 console.error(e);
                 toast.error('Failed to save');
             }
        },
        toggleAIFilter: () => {
             // Rotate filters or toggle specific AI look
             const currentIdx = videoFilters.findIndex(f => f.id === appliedFilter.value);
             const nextIdx = (currentIdx + 1) % videoFilters.length;
             appliedFilter.value = videoFilters[nextIdx].id;
             toast(`Filter: ${videoFilters[nextIdx].name}`);
        },
        toggleCaptions: () => {
             activeCaptions.value = !activeCaptions.value;
             toast(activeCaptions.value ? 'Captions Enabled' : 'Captions Disabled');
             
             if (activeCaptions.value) {
                 // Start Speech Recognition
                 if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                     const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                     const recognition = new SpeechRecognition();
                     recognition.continuous = true;
                     recognition.interimResults = true;
                     recognition.lang = targetLanguage.value === 'vi' ? 'vi-VN' : 'en-US';
                     
                     recognition.onresult = (event: any) => {
                         let final = '';
                         let interim = '';
                         for (let i = event.resultIndex; i < event.results.length; ++i) {
                             if (event.results[i].isFinal) {
                                 final += event.results[i][0].transcript;
                             } else {
                                 interim += event.results[i][0].transcript;
                             }
                         }
                         currentCaption.value = final || interim;
                     };
                     
                     recognition.onend = () => {
                         if (activeCaptions.value) recognition.start();
                     };
                     
                     recognition.start();
                     (window as any)._recorderRecognition = recognition; // Keep ref to stop later
                 } else {
                     toast.error('Speech Recognition not supported in this browser');
                     activeCaptions.value = false;
                 }
             } else {
                 // Stop Speech Recognition
                 if ((window as any)._recorderRecognition) {
                     (window as any)._recorderRecognition.stop();
                     (window as any)._recorderRecognition = null;
                 }
                 currentCaption.value = '';
             }
        },
        toggleLiveStream: async () => {
             if (isStreaming.value) {
                 // Stop
                 if (publisher.value) {
                     publisher.value.stop();
                     publisher.value = null;
                 }
                 isStreaming.value = false;
                 toast.success('Stream ended');
             } else {
                 if (!streamConfig.value.serverUrl || !streamConfig.value.streamKey) {
                     toast.error('Please configure stream settings in Side Panel > Live');
                     activeSidebar.value = 'live';
                     return;
                 }
                 try {
                     // Start
                     publisher.value = new WebRTCPublisher({
                         websocketUrl: streamConfig.value.serverUrl,
                         streamId: streamConfig.value.streamKey
                     });
                     if (currentStream.value) {
                         await publisher.value.start(currentStream.value);
                         isStreaming.value = true;
                         toast.success('You are LIVE!');
                     }
                 } catch (e) {
                     toast.error('Connection failed');
                 }
             }
        },
        toggleMic: () => { micEnabled.value = !micEnabled.value },
        triggerFileUpload: () => fileInput.value?.click(),
        triggerPresentationUpload: () => presentationInput.value?.click(),
        triggerResourceUpload: () => fileInput.value?.click(),
        toggleOverlay: (id: string) => {
             const idx = activeOverlays.value.indexOf(id);
             if (idx === -1) activeOverlays.value.push(id);
             else activeOverlays.value.splice(idx, 1);
        },
        handleVTuberStreamReady: (stream: MediaStream) => {
            vtuberStream.value = stream;
            isVTuberActive.value = true;
            toast.success('VTuber Avatar Active');
        },
        handleWhiteboardScreenShare: async () => {
            try {
                const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
                whiteboardContent.value = stream;
                isWhiteboardLaunchpadActive.value = false;
                toast.success('Whiteboard Screen Share Started');
            } catch (e) {
                toast.error('Screen share cancelled');
            }
        },
        handleWhiteboardFileImport: async (type: 'pdf' | 'ppt' | 'video') => {
            toast(`Importing ${type.toUpperCase()}...`);
            fileInput.value?.click();
        },
        formatTime: (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`, enumerateDevices, t, router, projectStore
    }
}

