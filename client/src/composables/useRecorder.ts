import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { DocumentProcessor } from '@/utils/recorder/DocumentProcessor'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n';
import { usePlatformStore } from '@/stores/platform'
import { toast } from 'vue-sonner'
import { useVTuberStore } from '@/stores/vtuber'
import { arFilterEngine } from '@/utils/ai/ARFilterEngine'
import { liveAIEngine } from '@/utils/ai/LiveAIEngine'
import { liveSpeechAPI } from '@/utils/ai/LiveSpeechAPI'
import { WebRTCPublisher } from '@/utils/ai/WebRTCPublisher'
import { useRecorderCanvas } from './useRecorderCanvas'
import { useRecorderMedia } from './useRecorderMedia'
import { useRecorderAudio } from './useRecorderAudio'
import { useStreamingStore } from '@/stores/streaming'
import { ActionSyncService } from '@/utils/ai/ActionSyncService'
import { useRecorderAI } from './useRecorderAI'
import { useRecorderRecording } from './useRecorderRecording'
import { usePresentationDriver } from './usePresentationDriver'
import { getFileUrl } from '@/utils/api'
import {
    Camera, Monitor, Voice, Cpu, 
    CloseOne, CheckOne, Loading, Download, 
    Share, Magic, BroadcastRadio, Effects, 
    MicrophoneOne, SettingConfig, VolumeSmall,
    VolumeNotice as VolumeOne
} from '@icon-park/vue-next'

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

export function useRecorder() {
    const router = useRouter()
    const projectStore = useProjectStore()
    const { t } = useI18n()

    // --- Sub-Composables ---
    const media = useRecorderMedia()
    const audio = useRecorderAudio()
    const ai = useRecorderAI()
    const recording = useRecorderRecording()
    const userStore = useUserStore()
    const vtuberStore = useVTuberStore()
    const platformStore = usePlatformStore()
    const streamingStore = useStreamingStore()

    // --- Core State ---
    const mode = ref<RecordingMode>('camera')
    const activeSidebar = ref<'filters' | 'ai' | 'live' | 'audio' | 'podcast' | 'hardware' | 'production' | 'whiteboard' | null>(null)
    const appliedFilter = ref('none')
    const enableAslAssist = ref(false)
    const aslMode = ref<'asl-to-text' | 'text-to-asl'>('asl-to-text')
    const enableBeauty = ref(false)
    const beautySettings = ref({ smoothing: 0.6, brightness: 1.1 })
    const showMiniPreview = ref(false)
    const selectedAvatar = ref('sarah')
    const selectedVoice = ref('en-US-Neural2-F')

    // Canvas & Video Elements
    const processingCanvas = ref<HTMLCanvasElement | null>(null)
    const displayCanvas = ref<HTMLCanvasElement | null>(null)
    const sourceVideo = ref<HTMLVideoElement | null>(null)
    const webcamVideo = ref<HTMLVideoElement | null>(null)

    // Streaming State
    const isStreaming = ref(false)
    const streamConfig = ref({
        serverUrl: '',
        streamKey: '',
        bitrate: 4500,
        useAntMedia: false 
    })
    const selectedPlatforms = ref<string[]>([])
    const showPlatformSelector = ref(false)
    const availableAccounts = computed(() => platformStore.accounts)
    const streamStats = ref<any>({ bitrate: 0, fps: 0, rtt: 0 })
    const publisher = ref<WebRTCPublisher | null>(null)

    // Layout/UI State
    const layoutPreset = ref<'pip' | 'split' | 'cam-full' | 'screen-full'>('pip')
    const fileInput = ref<HTMLInputElement | null>(null)
    const presentationInput = ref<HTMLInputElement | null>(null)
    
    // Resource Pool
    const resourcePool = ref<Array<any>>([])
    const activeOverlays = ref<string[]>([])

    // Whiteboard/VTuber State
    const isVTuberActive = ref(false)
    const vtuberStream = ref<MediaStream | null>(null)
    const whiteboardContent = ref<MediaStream | ImageBitmap | null>(null)
    const whiteboardPages = ref<ImageBitmap[]>([])
    const whiteboardScripts = ref<string[]>([])
    const currentWhiteboardPage = ref(0)
    const presentationViseme = ref(0)
    const isWhiteboardLaunchpadActive = ref(true)
    const showVTuberSelectDialog = ref(false)

    // Teleprompter
    const isTeleprompterActive = ref(false)
    const isTeleprompterScrolling = ref(false)
    const teleprompterScript = ref("Welcome to AntStudio! This is your professional teleprompter...")
    const teleprompterSpeed = ref(2)
    const teleprompterFontSize = ref(24)
    const teleprompterScrollPos = ref(0)

    // Annotation
    const isAnnotationActive = ref(false)
    const annotationTool = ref<'pen' | 'highlighter'>('pen')
    const annotationColor = ref('#f97316')
    const annotationSize = ref(4)
    const annotationCanvas = document.createElement('canvas')
    const annotationCtx = annotationCanvas.getContext('2d')!
    let isDrawingAnnotation = false
    const currentSessionId = ref<string | null>(null)

    const podcastSettings = ref({
        bg: 'linear-gradient(135deg, #001 0%, #102 100%)',
        visualType: 'waveform' as any,
        bgmVolume: 0.3,
        showVisualizer: true,
        proEnhance: false,
        backgroundType: 'none',
        backgroundResource: null as string | null
    })

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
        enableVoiceSwap: false,
        backgroundType: 'none',
        backgroundResource: null as string | null,
        enableEnhance: false,
        enableFaceSwap: false,
        faceSwapResource: null as string | null,
        enableCamInWhiteboard: false
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
        { value: 'whiteboard', label: 'Whiteboard', icon: Cpu },
    ])

    const canvasResults = useRecorderCanvas(
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
            isRecording: recording.isRecording,
            isVTuberActive,
            vtuberStream,
            whiteboardContent
        }
    );
    const { startRendering, stopRendering: stopCanvasRendering, isTransferred } = canvasResults;

    const markAnnotationDirtyLocal = () => {
        if ((canvasResults as any).markAnnotationDirty) (canvasResults as any).markAnnotationDirty();
    };

    // Sync Audio Features
    watch(() => camSettings.value.enableVoiceSwap, (val) => {
        audio.enableVoiceSwap.value = !!val
    }, { immediate: true })
    
    watch(selectedVoice, (val) => {
        audio.selectedVoice.value = val
    }, { immediate: true })

    let currentInitPromise: Promise<void> | null = null;

    const initializeStream = async (oldMode?: RecordingMode) => {
        // Prevent concurrent initializations
        if (currentInitPromise) return currentInitPromise;

        currentInitPromise = (async () => {
            console.log("init stream", oldMode, mode.value);
            try {
                media.isScreenShareEnded.value = false
                const screenModes = ['screen', 'camera-screen']
                const canReuseScreen = oldMode && screenModes.includes(oldMode) && screenModes.includes(mode.value) && media.currentStream.value?.getVideoTracks().length

                // 1. Thoroughly stop old streams and clear references
                const stopAndNull = (streamRef: any, forceNull = true) => {
                    if (streamRef.value instanceof MediaStream) {
                        streamRef.value.getTracks().forEach(t => {
                            t.enabled = false;
                            t.stop();
                        });
                        streamRef.value = null;
                    } else if (forceNull) {
                        streamRef.value = null;
                    }
                };

                if (!canReuseScreen) stopAndNull(media.currentStream);
                if (mode.value !== 'camera-screen') stopAndNull(media.secondaryStream);
                
                // 2. Hardware-level stop for video elements
                const killVideo = (videoEl: HTMLVideoElement | null) => {
                    if (videoEl) {
                        const s = videoEl.srcObject as MediaStream;
                        if (s) {
                            s.getTracks().forEach(t => {
                                t.enabled = false;
                                t.stop();
                            });
                        }
                        videoEl.srcObject = null;
                        videoEl.src = "";
                        videoEl.removeAttribute('src'); 
                        videoEl.load();
                    }
                };

                if (mode.value === 'audio' || mode.value === 'whiteboard' || mode.value === 'screen') {
                    killVideo(sourceVideo.value);
                }
                if (mode.value !== 'camera-screen') {
                    killVideo(webcamVideo.value);
                }
                
                // 3. Cleanup additional hidden streams
                stopAndNull(whiteboardContent, false); 
                stopAndNull(vtuberStream);
                if (mode.value === 'audio' || mode.value === 'screen') {
                    isVTuberActive.value = false;
                    liveAIEngine.close();
                }

                let stream: MediaStream
                if (mode.value === 'camera') {
                    const constraints: any = { video: { width: 1920, height: 1080 }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
                    if (media.selectedCameraId.value) constraints.video.deviceId = { exact: media.selectedCameraId.value }
                    if (media.selectedMicId.value) constraints.audio.deviceId = { exact: media.selectedMicId.value }
                    stream = await navigator.mediaDevices.getUserMedia(constraints)
                } else if (mode.value === 'screen') {
                    if (canReuseScreen && media.currentStream.value) stream = media.currentStream.value
                    else { 
                        stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }); 
                        stream.getVideoTracks()[0].onended = () => { media.isScreenShareEnded.value = true } 
                    }
                } else if (mode.value === 'camera-screen') {
                    if (!media.secondaryStream.value) {
                        const constraints: any = { video: { width: 480, height: 360, frameRate: 30 }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
                        if (media.selectedCameraId.value) constraints.video.deviceId = { exact: media.selectedCameraId.value }
                        if (media.selectedMicId.value) constraints.audio.deviceId = { exact: media.selectedMicId.value }
                        media.secondaryStream.value = await navigator.mediaDevices.getUserMedia(constraints)
                    }
                    if (canReuseScreen && media.currentStream.value) stream = media.currentStream.value
                    else { 
                        stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }); 
                        stream.getVideoTracks()[0].onended = () => { media.isScreenShareEnded.value = true } 
                    }
                } else {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
                }
                
                media.currentStream.value = stream
                if (mode.value === 'audio') {
                    console.log("[useRecorder] Stopping canvas for audio mode");
                    stopCanvasRendering()
                    audio.setupAudioVisualizer(stream)
                } else {
                    setupProcessingPipeline(stream)
                }
            } catch (e) { 
                toast.error('Unable to access devices.')
                console.log(e); 
            } finally {
                currentInitPromise = null;
            }
        })();

        return currentInitPromise;
    }

    const setupProcessingPipeline = (stream: MediaStream) => {
        if (!sourceVideo.value) sourceVideo.value = document.createElement('video')
        sourceVideo.value.srcObject = stream; sourceVideo.value.muted = true; sourceVideo.value.playsInline = true; sourceVideo.value.autoplay = true; sourceVideo.value.play().catch(() => {})
        sourceVideo.value.onloadedmetadata = () => {
            const v = sourceVideo.value!; const vw = v.videoWidth || 1280; const vh = v.videoHeight || 720
            if (processingCanvas.value && !isTransferred.value) { 
                processingCanvas.value.width = vw; 
                processingCanvas.value.height = vh 
            }
            if (displayCanvas.value) { displayCanvas.value.width = vw; displayCanvas.value.height = vh }
            annotationCanvas.width = vw; annotationCanvas.height = vh
            startRendering();
        }
        audio.setupAudioVisualizer(stream)
            if (!webcamVideo.value) webcamVideo.value = document.createElement('video')
            webcamVideo.value.srcObject = media.secondaryStream.value; webcamVideo.value.muted = true; webcamVideo.value.playsInline = true; webcamVideo.value.autoplay = true; webcamVideo.value.play().catch(() => {})
        }

    const presentation = usePresentationDriver({
        whiteboardPages: whiteboardPages,
        whiteboardScripts: ai.whiteboardScripts,
        whiteboardContent: whiteboardContent,
        currentWhiteboardPage: currentWhiteboardPage,
        voiceConfig: computed(() => ({
            provider: 'google',
            voiceId: selectedVoice.value,
            language: ai.targetLanguage.value
        })),
        onVisemeUpdate: (volume: number) => {
            presentationViseme.value = volume;
            if (canvasResults.isTransferred.value) {
                (canvasResults as any).worker?.postMessage({
                    type: 'update-3d-audio',
                    payload: { id: 'host', audioLevel: volume }
                });
            }
        }
    });

    const setPresentationBackground = async (url: string) => {
        const fullUrl = getFileUrl(url);
        try {
            const blob = await fetch(fullUrl).then(r => r.blob());
            const bitmap = await createImageBitmap(blob);
            if (canvasResults.isTransferred.value) {
                (canvasResults as any).worker?.postMessage({
                    type: 'update-background',
                    payload: { backgroundData: bitmap }
                }, [bitmap]);
            }
        } catch (e) {
            console.error('Failed to load presentation background:', e);
        }
    };

    const startRelayPush = (sessionId: string) => {
        if (!media.currentStream.value) return
        
        // Use standard WebM with H.264 if supported
        const recorderOptions = {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=h264') 
                ? 'video/webm;codecs=h264' 
                : 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: streamConfig.value.bitrate * 1000
        };

        const relayRecorder = new MediaRecorder(media.currentStream.value, recorderOptions);
        relayRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                ActionSyncService.sendStreamRelay(sessionId, e.data);
            }
        };
        
        // Cleanup previous if exists? In useRecorder.ts we don't track a 'mediaRecorder' ref specifically for streaming 
        // except in 'recording' module. We might need a local ref or just let it be.
        // For now, we manually stop it in toggleLiveStream if we had a sessionId.
        
        relayRecorder.start(100); 
        console.log(`[Recorder] Relay started for session: ${sessionId}`);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (e.code === 'Space') { e.preventDefault(); recording.isRecording.value ? recording.stopRecording() : startCountdown() }
        if (e.code === 'Escape') { if (recording.isRecording.value) recording.stopRecording(); else recording.showFinishDialog.value = false }
        if (e.code === 'KeyM') audio.micEnabled.value = !audio.micEnabled.value
        if (e.code === 'KeyT') isTeleprompterActive.value = !isTeleprompterActive.value
        if (e.code === 'KeyS' && isTeleprompterActive.value) isTeleprompterScrolling.value = !isTeleprompterScrolling.value
    }

    const startCountdown = () => {
        if (recording.isRecording.value || recording.isCountdownActive.value) return
        recording.isCountdownActive.value = true; recording.countdownValue.value = 3
        const cd = setInterval(() => { 
            recording.countdownValue.value--
            if (recording.countdownValue.value <= 0) { 
                clearInterval(cd)
                recording.isCountdownActive.value = false
                recording.startRecording(processingCanvas, null, audio.getMasterDestination, media.currentStream) 
            } 
        }, 1000)
    }

    let teleprompterInterval: any = null
    watch(isTeleprompterScrolling, (val) => {
        if (val) {
            teleprompterInterval = setInterval(() => { teleprompterScrollPos.value += (teleprompterSpeed.value * 0.5) }, 30)
        } else {
            clearInterval(teleprompterInterval)
        }
    })

    const effectiveSpeakingVol = computed(() => {
        return Math.max(audio.currentDb.value, presentationViseme.value);
    });

    onMounted(async () => { 
        window.addEventListener('keydown', handleKeyDown); 
        await platformStore.fetchAccounts();
        if (userStore.token) {
            ActionSyncService.connect(currentSessionId.value || 'recorder_global', userStore.token);
        }
    })
    onUnmounted(() => { 
        window.removeEventListener('keydown', handleKeyDown)
        
        // Hard stop all active hardware streams when the user leaves the Recorder view
        if (media.currentStream.value) {
            media.stopAllTracks(media.currentStream.value)
            media.currentStream.value = null
        }
        if (media.secondaryStream.value) {
            media.stopAllTracks(media.secondaryStream.value)
            media.secondaryStream.value = null
        }
        if (vtuberStream.value) {
            media.stopAllTracks(vtuberStream.value)
            vtuberStream.value = null
        }
        
        canvasResults.destroy()
        audio.cleanupAudio()
        stopCanvasRendering()
        clearInterval(teleprompterInterval)
        if ((window as any)._recorderRecognition) (window as any)._recorderRecognition.stop()
    })

    const togglePlatform = (id: string) => {
        const idx = selectedPlatforms.value.indexOf(id)
        if (idx === -1) selectedPlatforms.value.push(id)
        else selectedPlatforms.value.splice(idx, 1)
    }

    return {
        // Shared State
        mode, activeSidebar, appliedFilter, enableAslAssist, aslMode, enableBeauty, beautySettings,
        processingCanvas, displayCanvas, sourceVideo, webcamVideo, isStreaming, streamConfig, streamStats, publisher,
        selectedPlatforms, availableAccounts, togglePlatform,
        fileInput, presentationInput, resourcePool, activeOverlays, layoutPreset,
        isVTuberActive, vtuberStream, whiteboardContent, whiteboardPages, currentWhiteboardPage, isWhiteboardLaunchpadActive,
        isTeleprompterActive, isTeleprompterScrolling, teleprompterScript, teleprompterSpeed, teleprompterFontSize, teleprompterScrollPos,
        isAnnotationActive, annotationTool, annotationColor, annotationSize, podcastSettings, camSettings, avatarPresets, tabs,
        selectedAvatar, selectedVoice, showMiniPreview,
        showPlatformSelector,
        enableVoiceSwap: computed(() => camSettings.value.enableVoiceSwap),

        // Media Module
        currentStream: media.currentStream,
        secondaryStream: media.secondaryStream,
        videoDevices: media.videoDevices,
        audioDevices: media.audioDevices,
        selectedCameraId: media.selectedCameraId,
        selectedMicId: media.selectedMicId,
        isScreenShareEnded: media.isScreenShareEnded,
        recordingQuality: media.recordingQuality,
        enumerateDevices: media.enumerateDevices,

        // Audio Module
        micEnabled: audio.micEnabled,
        currentDb: effectiveSpeakingVol,
        audioLevels: audio.audioLevels,
        micVolume: audio.micVolume,
        bgmVolume: audio.bgmVolume,
        isDuckingEnabled: audio.isDuckingEnabled,
        bgmUrl: audio.bgmUrl,
        bgmLibrary: audio.bgmLibrary,
        toggleBGM: audio.toggleBGM,
        toggleMic: () => { audio.micEnabled.value = !audio.micEnabled.value },

        // AI Module
        isAiActive: ai.isAiActive,
        activeCaptions: ai.activeCaptions,
        currentCaption: ai.currentCaption,
        translatedCaption: ai.translatedCaption,
        targetLanguage: ai.targetLanguage,
        currentSlideIndex: ai.currentSlideIndex,
        isAnalyzing: ai.isAnalyzing,
        toggleAI: async () => {
            if (!liveAIEngine.isInitialized) await liveAIEngine.initialize()
            ai.toggleAI(enableBeauty)
        },
        generateWhiteboardAIScripts: async () => {
            if (!liveAIEngine.isInitialized) await liveAIEngine.initialize()
            ai.generateWhiteboardAIScripts(whiteboardPages)
        },
        startAIPresentation: async () => {
             if (!liveAIEngine.isInitialized) await liveAIEngine.initialize()
             presentation.start()
        },
        stopAIPresentation: presentation.stop,
        nextPresentationPage: presentation.nextPage,
        prevPresentationPage: presentation.prevPage,
        goToPresentationPage: presentation.goToPage,
        toggleCaptions: async () => {
            if (ai.activeCaptions.value === false && !liveAIEngine.isInitialized) await liveAIEngine.initialize()
            ai.toggleCaptions()
        },

        // Recording Module
        isRecording: recording.isRecording,
        recordingTime: recording.recordingTime,
        maxDuration: recording.maxDuration,
        recordedVideoUrl: recording.recordedVideoUrl,
        showFinishDialog: recording.showFinishDialog,
        isCountdownActive: recording.isCountdownActive,
        countdownValue: recording.countdownValue,
        startRecording: () => recording.startRecording(processingCanvas, null, audio.getMasterDestination, media.currentStream),
        stopRecording: recording.stopRecording,
        toggleRecording: () => recording.isRecording.value ? recording.stopRecording() : startCountdown(),
        downloadRecording: recording.downloadRecording,
        saveToProject: recording.saveToProject,
        startCountdown,

        // Methods
        switchMode: async (newMode: RecordingMode) => {
            if (recording.isRecording.value) { toast.error('Please stop recording first'); return }
            const oldMode = mode.value; mode.value = newMode
            if (newMode === 'whiteboard') {
                isWhiteboardLaunchpadActive.value = true
                showVTuberSelectDialog.value = true // Prompt user to select VTuber
            }
            await initializeStream(oldMode)
        },
        initializeStream,
        startDrawing: (x: number, y: number) => {
            if (!isAnnotationActive.value) return
            isDrawingAnnotation = true; annotationCtx.beginPath(); annotationCtx.moveTo(x, y)
            markAnnotationDirtyLocal();
        },
        draw: (x: number, y: number) => {
            if (!isAnnotationActive.value || !isDrawingAnnotation) return
            annotationCtx.lineCap = 'round'; annotationCtx.lineJoin = 'round'; annotationCtx.strokeStyle = annotationColor.value; annotationCtx.lineWidth = annotationSize.value
            if (annotationTool.value === 'highlighter') { annotationCtx.globalAlpha = 0.4; annotationCtx.lineWidth = annotationSize.value * 5 }
            else { annotationCtx.globalAlpha = 1.0 }
            annotationCtx.lineTo(x, y); annotationCtx.stroke()
            markAnnotationDirtyLocal();
        },
        stopDrawing: () => { isDrawingAnnotation = false; markAnnotationDirtyLocal(); },
        clearAnnotations: () => { annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height); markAnnotationDirtyLocal(); },
        handleFileUpload: (e: any) => {
             const file = e.target.files?.[0]; if (!file) return;
             const url = URL.createObjectURL(file); const type = file.type.startsWith('video') ? 'video' : 'image'
             let el: any = type === 'image' ? new Image() : document.createElement('video')
             el.src = url; resourcePool.value.push({ id: crypto.randomUUID(), name: file.name, url, type, x: 50, y: 50, width: 400, height: 300, aspect: 4/3, element: el })
             toast.success(`Imported ${file.name}`)
        },
        handlePresentationUpload: async (e: any) => {
            const file = e.target.files[0]; if (!file) return;
            const toastId = toast.loading(`Processing ${file.name}...`)
            try {
                const { pages } = await DocumentProcessor.processFile(file)
                whiteboardPages.value = pages; currentWhiteboardPage.value = 0
                if (pages.length > 0) { whiteboardContent.value = pages[0]; isWhiteboardLaunchpadActive.value = false }
                toast.success(`${file.name} imported`, { id: toastId })
                
                // Auto-trigger AI Analysis
                setTimeout(() => {
                    if (ai.whiteboardScripts.value.length === 0) {
                        ai.generateWhiteboardAIScripts(whiteboardPages);
                    }
                }, 1000);
            } catch (err: any) { toast.error(err.message || 'Processing failed', { id: toastId }) }
        },
        handleVTuberStreamReady: (stream: MediaStream) => { vtuberStream.value = stream; isVTuberActive.value = true; toast.success('VTuber Avatar Active') },
        handleWhiteboardScreenShare: async () => {
            try {
                const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
                whiteboardContent.value = stream; isWhiteboardLaunchpadActive.value = false; toast.success('Whiteboard Screen Share Started')
            } catch (e) { toast.error('Screen share cancelled') }
        },
        handleWhiteboardFileImport: async (type: 'pdf' | 'ppt' | 'video') => {
            toast(`Importing ${type.toUpperCase()}...`); if (type === 'video') fileInput.value?.click(); else presentationInput.value?.click()
        },
        toggleAIFilter: () => {
             const currentIdx = videoFilters.findIndex(f => f.id === appliedFilter.value)
             const nextIdx = (currentIdx + 1) % videoFilters.length
             appliedFilter.value = videoFilters[nextIdx].id; toast(`Filter: ${videoFilters[nextIdx].name}`)
        },
        toggleLiveStream: async () => {
            if (isStreaming.value) { 
                if (publisher.value) { publisher.value.stop(); publisher.value = null }
                if (currentSessionId.value) {
                    await streamingStore.stopStream(currentSessionId.value)
                    currentSessionId.value = null
                }
                isStreaming.value = false; toast.success('Stream ended') 
            }
            else {
                if (selectedPlatforms.value.length === 0 && (!streamConfig.value.serverUrl || !streamConfig.value.streamKey)) {
                    if (availableAccounts.value.length > 0) {
                        toast.error('Please select a platform to start streaming');
                    } else {
                        toast.error('Connect a platform to go live!');
                        showPlatformSelector.value = true;
                    }
                    activeSidebar.value = 'live'; 
                    return
                }

                try {
                    // Try to start via backend orchestration if platforms are selected
                    if (selectedPlatforms.value.length > 0) {
                        const res = await streamingStore.startStream({
                            platformAccountIds: selectedPlatforms.value,
                            source: 'webrtc',
                            quality: { 
                                width: 1920, height: 1080, 
                                videoBitrate: streamConfig.value.bitrate, 
                                audioBitrate: 128, fps: 30 
                            }
                        })
                        if (res) {
                            const { sessionId, mode: streamMode, amsAccount } = res.data || res
                            currentSessionId.value = sessionId
                            
                            if (streamMode === 'webrtc_ams' && amsAccount) {
                                publisher.value = new WebRTCPublisher({ 
                                    websocketUrl: `${amsAccount.credentials.serverUrl.replace('http', 'ws')}/${amsAccount.credentials.appName || 'WebRTCAppEE'}/websocket`,
                                    streamId: amsAccount.streamKey 
                                })
                            } else {
                                // Fallback to relay via socket
                                toast.info("Broadcasting via Relay...")
                                startRelayPush(sessionId)
                            }
                        }
                    } else {
                        // Custom RTMP/WebRTC config
                        publisher.value = new WebRTCPublisher({ websocketUrl: streamConfig.value.serverUrl, streamId: streamConfig.value.streamKey })
                    }

                    if (publisher.value && media.currentStream.value) {
                        await publisher.value.start(media.currentStream.value)
                        isStreaming.value = true; toast.success('You are LIVE!')
                    } else if (currentSessionId.value) {
                        isStreaming.value = true; toast.success('Relay stream active!')
                    }
                } catch (e) { toast.error('Connection failed') }
            }
        },
        triggerFileUpload: () => fileInput.value?.click(),
        triggerPresentationUpload: () => presentationInput.value?.click(),
        triggerResourceUpload: () => fileInput.value?.click(),
        toggleOverlay: (id: string) => {
            const idx = activeOverlays.value.indexOf(id); if (idx === -1) activeOverlays.value.push(id); else activeOverlays.value.splice(idx, 1)
        },
        nextWhiteboardPage: () => { if (currentWhiteboardPage.value < whiteboardPages.value.length - 1) { currentWhiteboardPage.value++; whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value] } },
        prevWhiteboardPage: () => { if (currentWhiteboardPage.value > 0) { currentWhiteboardPage.value--; whiteboardContent.value = whiteboardPages.value[currentWhiteboardPage.value] } },
        whiteboardScripts: ai.whiteboardScripts,
        isAIPresenting: presentation.isAIPresenting,
        isSynthesizing: presentation.isSynthesizing,
        showVTuberSelectDialog,
        vtuberStore,
        formatTime: (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`,
        t, router, projectStore
    }
}
