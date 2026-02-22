import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef, shallowRef } from 'vue'
import { getFileUrl } from '@/utils/api'
import { CAPTION_STYLES, DEFAULT_CAPTION_STYLE } from '@/utils/editor/CaptionStyles'
import { renderLowerThird, calculateAnimationProgress } from '../utils/lowerThirdRenderer'

export interface TimelineSegment {
    _id: string
    url: string
    duration: number // original duration
    speed: number
    volume: number
    order: number
    transition?: string | null
    transitionDuration?: number // duration of transition overlap
    transitionDirection?: 'left' | 'right' | 'up' | 'down'
    trimOffset?: number
    voiceUrl?: string
    captions?: { start: number, end: number, text: string, style?: string }[]
    lowerThirds?: Array<{
        id: string
        text: string
        subtitle?: string
        startTime: number  // seconds from segment start
        duration: number   // seconds
        style: 'default' | 'minimal' | 'bold' | 'gradient'
        position: 'bottom-left' | 'bottom-center' | 'bottom-right'
        animation: 'fade' | 'slide' | 'none'
    }>
    templatePage?: any
}

export interface PlayerOptions {
    segments: () => TimelineSegment[]
    backgroundMusic?: () => { url: string, volume: number } | undefined
    onTimeUpdate?: (time: number) => void
}

export const useTimelinePlayer = (options: PlayerOptions) => {
    const currentTime = shallowRef(0)
    const isPlaying = ref(false)
    const videoElements = new Map<string, HTMLVideoElement>()
    const voiceElements = new Map<string, HTMLAudioElement>()
    const bgMusicElement = ref<HTMLAudioElement | null>(null)

    let animationId: number | null = null
    let lastUpdateTime = 0
    let canvasContext: CanvasRenderingContext2D | null = null
    let canvasWidth = 0
    let canvasHeight = 0

    // Reactive segments
    const segments = computed(() => options.segments())
    const backgroundMusic = computed(() => options.backgroundMusic?.())

    // Total duration considering speed
    const totalDuration = computed(() => {
        return segments.value.reduce((sum, seg) => sum + (seg.duration / (seg.speed || 1)), 0)
    })

    // Preload elements
    const preload = async () => {
        // Video Preloading
        for (const seg of segments.value) {
            if (seg.url && !videoElements.has(seg._id)) {
                const video = document.createElement('video')
                const resolvedUrl = await getFileUrl(seg.url, { cached: true })
                video.src = resolvedUrl
                video.crossOrigin = 'anonymous'
                video.preload = 'auto'
                video.muted = false
                video.playsInline = true
                videoElements.set(seg._id, video)
            }

            // Voiceover Preloading
            if (seg.voiceUrl && !voiceElements.has(seg._id)) {
                const audio = new Audio()
                const resolvedVoiceUrl = await getFileUrl(seg.voiceUrl, { cached: true })
                audio.src = resolvedVoiceUrl
                audio.preload = 'auto'
                voiceElements.set(seg._id, audio)
            }
        }

        const bgm = backgroundMusic.value
        if (bgm?.url && !bgMusicElement.value) {
            const resolvedUrl = await getFileUrl(bgm.url, { cached: true })
            const audio = new Audio(resolvedUrl)
            audio.loop = true
            audio.volume = bgm.volume || 0.5
            bgMusicElement.value = audio
        }
    }

    watch(segments, preload, { deep: true, immediate: true })
    watch(backgroundMusic, preload, { deep: true })

    const getSegmentAtTime = (time: number) => {
        let elapsed = 0
        const segs = segments.value
        for (const seg of segs) {
            const displayDur = seg.duration / (seg.speed || 1)
            if (time >= elapsed && time < elapsed + displayDur) {
                return { segment: seg, relativeTime: (time - elapsed) * (seg.speed || 1) }
            }
            elapsed += displayDur
        }
        return null
    }

    const play = () => {
        if (isPlaying.value) return
        isPlaying.value = true
        lastUpdateTime = performance.now()

        if (bgMusicElement.value) {
            bgMusicElement.value.currentTime = currentTime.value % (bgMusicElement.value.duration || 1)
            bgMusicElement.value.play().catch(() => { })
        }

        renderLoop(performance.now())
    }

    const pause = () => {
        isPlaying.value = false
        if (animationId) cancelAnimationFrame(animationId)

        videoElements.forEach(v => v.pause())
        voiceElements.forEach(a => a.pause())
        if (bgMusicElement.value) bgMusicElement.value.pause()
    }

    const seek = (time: number) => {
        currentTime.value = Math.max(0, Math.min(time, totalDuration.value))
        options.onTimeUpdate?.(currentTime.value)

        if (bgMusicElement.value) {
            bgMusicElement.value.currentTime = currentTime.value % (bgMusicElement.value.duration || 1)
        }

        const active = getSegmentAtTime(currentTime.value)
        if (active) {
            const video = videoElements.get(active.segment._id)
            if (video) video.currentTime = (active.segment.trimOffset || 0) + active.relativeTime

            const voice = voiceElements.get(active.segment._id)
            // Voice usually starts at beginning of segment, but we need to handle if we seek into middle
            if (voice) {
                voice.currentTime = active.relativeTime / (active.segment.speed || 1) // Voice doesn't speed up usually? Assuming 1x
            }
        }
    }

    const setCanvas = (ctx: CanvasRenderingContext2D | null, width: number, height: number) => {
        canvasContext = ctx
        canvasWidth = width
        canvasHeight = height
    }

    const renderLoop = (now: number) => {
        if (!isPlaying.value) return

        const deltaTime = (now - lastUpdateTime) / 1000
        lastUpdateTime = now

        currentTime.value += deltaTime
        if (currentTime.value >= totalDuration.value) {
            currentTime.value = 0
            pause()
            return
        }

        options.onTimeUpdate?.(currentTime.value)

        // Internal draw call if context is available
        if (canvasContext) {
            drawInternal(canvasContext, canvasWidth, canvasHeight)
        }

        animationId = requestAnimationFrame(renderLoop)
    }

    const drawInternal = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const canvasRatio = width / height
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height)

        const active = getSegmentAtTime(currentTime.value)

        // --- AUDIO DUCKING LOGIC ---
        // Check if there is an active voiceover in this segment
        // If yes, duck background music volume
        let isVoiceActive = false

        if (active && videoElements.has(active.segment._id)) {
            // Handle Video Playback
            const video = videoElements.get(active.segment._id)!
            if (video.readyState >= 1) {
                const targetTime = (active.segment.trimOffset || 0) + active.relativeTime

                if (isPlaying.value) {
                    if (Math.abs(video.currentTime - targetTime) > 0.2) {
                        video.currentTime = targetTime
                    }
                    if (video.paused) video.play().catch(() => { })
                    video.playbackRate = active.segment.speed || 1
                    video.volume = active.segment.volume ?? 1
                } else {
                    video.pause()
                }

                // Draw Video Frame
                const videoRatio = video.videoWidth / video.videoHeight
                let dWidth, dHeight, dx, dy

                if (videoRatio > canvasRatio) {
                    dWidth = width
                    dHeight = width / videoRatio
                    dx = 0
                    dy = (height - dHeight) / 2
                } else {
                    dHeight = height
                    dWidth = height * videoRatio
                    dx = (width - dWidth) / 2
                    dy = 0
                }
                ctx.drawImage(video, dx, dy, dWidth, dHeight)
            }

            // Handle Voiceover Playback
            const voice = voiceElements.get(active.segment._id)
            if (voice) {
                // If we are within the voiceover duration
                if (active.relativeTime < voice.duration && active.relativeTime >= 0) {
                    isVoiceActive = true
                    if (isPlaying.value) {
                        if (voice.paused) voice.play().catch(() => { })
                        // Sync check
                        if (Math.abs(voice.currentTime - active.relativeTime) > 0.3) {
                            voice.currentTime = active.relativeTime
                        }
                    } else {
                        voice.pause()
                    }
                } else {
                    if (!voice.paused) voice.pause()
                }
            }

            // Pause other videos
            videoElements.forEach((v, id) => {
                if (id !== active.segment._id && !v.paused) v.pause()
            })
            // Pause other voices
            voiceElements.forEach((v, id) => {
                if (id !== active.segment._id && !v.paused) v.pause()
            })
        } else {
            // No active segment or video
            ctx.fillStyle = '#1a1a1a'
            ctx.fillRect(0, 0, width, height)

            // Still need to silence others
            videoElements.forEach(v => !v.paused && v.pause())
            voiceElements.forEach(v => !v.paused && v.pause())
        }

        // --- BACKGROUND MUSIC HANDLING (Audio Ducking) ---
        if (bgMusicElement.value) {
            const bgm = bgMusicElement.value

            // Loop logic
            if (bgm.currentTime >= bgm.duration - 0.5) {
                bgm.currentTime = 0
            }

            if (isPlaying.value) {
                if (bgm.paused) bgm.play().catch(() => { })

                // Ducking Logic
                // Target volume is 0.1 if voice is active, else 1.0 (or configured project volume)
                // We perform a simple linear interpolation (lerp) for smoothness
                const targetVolume = isVoiceActive ? 0.1 : 0.8 // Default BGM volume 0.8
                const currentVolume = bgm.volume
                const lerpSpeed = 0.05 // Adjust for speed of ducking (approx 20 frames to transition)

                if (Math.abs(currentVolume - targetVolume) > 0.01) {
                    bgm.volume = currentVolume + (targetVolume - currentVolume) * lerpSpeed
                } else {
                    bgm.volume = targetVolume
                }

            } else {
                if (!bgm.paused) bgm.pause()
            }
        }



        // --- TRANSITION LOGIC ---
        if (!active) return

        const transDuration = active.segment.transitionDuration || 1
        const remaining = (active.segment.duration / (active.segment.speed || 1)) - active.relativeTime

        let nextVideo: HTMLVideoElement | undefined
        let progress = 0

        if (active.segment.transition && remaining < transDuration) {
            const currentIdx = segments.value.findIndex(s => s._id === active.segment._id)
            if (currentIdx !== -1 && currentIdx < segments.value.length - 1) {
                const nextSeg = segments.value[currentIdx + 1]
                if (videoElements.has(nextSeg._id)) {
                    nextVideo = videoElements.get(nextSeg._id)
                    progress = 1 - (remaining / transDuration)
                }
            }
        }

        if (nextVideo && nextVideo.readyState >= 1) {
            const nextTrimOffset = segments.value.find(s => videoElements.get(s._id) === nextVideo)?.trimOffset || 0
            if (Math.abs(nextVideo.currentTime - nextTrimOffset) > 0.1) nextVideo.currentTime = nextTrimOffset
            if (isPlaying.value && nextVideo.paused) nextVideo.play().catch(() => { })

            ctx.save()
            if (active.segment.transition === 'fade' || active.segment.transition === 'dissolve') {
                ctx.globalAlpha = progress
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'blur') {
                ctx.filter = `blur(${20 * (1 - progress)}px)`
                ctx.globalAlpha = progress
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'zoom-blur') {
                const z = 1 + (0.5 * (1 - progress))
                ctx.translate(width / 2, height / 2)
                ctx.scale(z, z)
                ctx.translate(-width / 2, -height / 2)
                ctx.filter = `blur(${30 * (1 - progress)}px)`
                ctx.globalAlpha = progress
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'morph') {
                // Liquid stretch effect
                const stretch = 1 + Math.sin(progress * Math.PI) * 0.3
                ctx.translate(width / 2, height / 2)
                ctx.scale(stretch, 1 / stretch)
                ctx.translate(-width / 2, -height / 2)
                ctx.globalAlpha = progress
                ctx.filter = `contrast(150%) brightness(110%)`
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'glitch') {
                const intensity = (1 - Math.abs(0.5 - progress) * 2)
                const shake = intensity * 40
                const ox = (Math.random() - 0.5) * shake
                const oy = (Math.random() - 0.5) * shake

                ctx.globalAlpha = progress
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = ox; by = (height - bHeight) / 2 + oy
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2 + ox; by = oy
                }

                // Enhanced RGB split
                ctx.globalCompositeOperation = 'screen'
                ctx.filter = `hue-rotate(${intensity * 90}deg)`
                ctx.drawImage(nextVideo, bx - (10 * intensity), by, bWidth, bHeight)
                ctx.drawImage(nextVideo, bx + (10 * intensity), by, bWidth, bHeight)
                ctx.globalCompositeOperation = 'source-over'
            } else if (active.segment.transition === 'light-leak') {
                ctx.globalAlpha = progress
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)

                // Enhanced light leak overlay
                const grad = ctx.createRadialGradient(width * progress, height / 2, 0, width * progress, height / 2, width)
                const alpha = 0.7 * (1 - Math.abs(0.5 - progress) * 2)
                grad.addColorStop(0, `rgba(255, 200, 100, ${alpha})`)
                grad.addColorStop(0.5, `rgba(255, 100, 200, ${alpha * 0.5})`)
                grad.addColorStop(1, 'transparent')
                ctx.globalCompositeOperation = 'screen'
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, width, height)
                ctx.globalCompositeOperation = 'source-over'
            } else if (active.segment.transition === 'cube' || active.segment.transition === 'flip') {
                const angle = progress * Math.PI
                const scale = Math.cos(angle)
                const dir = active.segment.transitionDirection || 'left'

                ctx.translate(width / 2, height / 2)
                if (dir === 'left' || dir === 'right') {
                    ctx.scale(Math.abs(scale), 1)
                } else {
                    ctx.scale(1, Math.abs(scale))
                }
                ctx.translate(-width / 2, -height / 2)

                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'wipe') {
                const dir = active.segment.transitionDirection || 'left'
                ctx.beginPath()
                if (dir === 'left') ctx.rect(width * (1 - progress), 0, width * progress, height)
                else if (dir === 'right') ctx.rect(0, 0, width * progress, height)
                else if (dir === 'up') ctx.rect(0, height * (1 - progress), width, height * progress)
                else if (dir === 'down') ctx.rect(0, 0, width, height * progress)

                ctx.clip()
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'slide') {
                const dir = active.segment.transitionDirection || 'left'
                let ox = 0, oy = 0
                if (dir === 'left') ox = width * (1 - progress)
                else if (dir === 'right') ox = -width * (1 - progress)
                else if (dir === 'up') oy = height * (1 - progress)
                else if (dir === 'down') oy = -height * (1 - progress)

                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = ox; by = (height - bHeight) / 2 + oy
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2 + ox; by = oy
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            } else if (active.segment.transition === 'circle') {
                ctx.beginPath()
                const maxRadius = Math.sqrt(width * width + height * height) / 2
                ctx.arc(width / 2, height / 2, maxRadius * progress, 0, Math.PI * 2)
                ctx.clip()
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
                }
                ctx.drawImage(nextVideo, bx, by, bWidth, bHeight)
            }
            ctx.restore()
        }

        // --- CAPTION RENDERING ---
        if (active && active.segment.captions) {
            const segmentTime = active.relativeTime; // Time inside the current segment in seconds
            // Find current active caption
            // Assuming captions are { start: number, end: number, text: string, style?: string }
            // start and end are relative to segment start
            const currentCaption = active.segment.captions.find((cap: any) =>
                segmentTime >= cap.start && segmentTime <= cap.end
            );

            if (currentCaption) {
                const styleDef = CAPTION_STYLES[currentCaption.style] || DEFAULT_CAPTION_STYLE;

                ctx.save();
                ctx.font = styleDef.canvasFont;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                const x = width / 2;
                const y = height - (height * 0.1); // 10% from bottom

                // Shadow
                if (styleDef.canvasShadow) {
                    ctx.shadowColor = styleDef.canvasShadow.color;
                    ctx.shadowBlur = styleDef.canvasShadow.blur;
                    ctx.shadowOffsetX = styleDef.canvasShadow.offsetX;
                    ctx.shadowOffsetY = styleDef.canvasShadow.offsetY;
                }

                // Fill
                ctx.fillStyle = styleDef.canvasFill;
                ctx.fillText(currentCaption.text, x, y);

                // Stroke (optional)
                if (styleDef.canvasStroke) {
                    ctx.shadowColor = 'transparent'; // Reset shadow for stroke
                    ctx.lineWidth = 2; // Fixed or config?
                    ctx.strokeStyle = styleDef.canvasStroke;
                    ctx.strokeText(currentCaption.text, x, y);
                }

                ctx.restore();
            }
        }

        // --- LOWER-THIRD RENDERING ---
        if (active && active.segment.lowerThirds) {
            const segmentTime = active.relativeTime

            // Find active lower-third
            const activeLowerThird = active.segment.lowerThirds.find(lt =>
                segmentTime >= lt.startTime && segmentTime < lt.startTime + lt.duration
            )

            if (activeLowerThird) {
                const animationProgress = activeLowerThird.animation === 'fade' || activeLowerThird.animation === 'slide'
                    ? calculateAnimationProgress(segmentTime, activeLowerThird.startTime, activeLowerThird.duration)
                    : 1

                renderLowerThird(ctx, {
                    text: activeLowerThird.text,
                    subtitle: activeLowerThird.subtitle,
                    style: activeLowerThird.style,
                    position: activeLowerThird.position,
                    width,
                    height,
                    animation: activeLowerThird.animation,
                    animationProgress
                })
            }
        }
    }

    const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        setCanvas(ctx, width, height)
        if (!isPlaying.value) {
            drawInternal(ctx, width, height)
        }
    }

    onUnmounted(() => {
        pause()
        videoElements.forEach(v => { v.pause(); v.src = '' })
        voiceElements.forEach(v => { v.pause(); v.src = '' })
        if (bgMusicElement.value) { bgMusicElement.value.pause(); bgMusicElement.value.src = '' }
        videoElements.clear()
        voiceElements.clear()
    })

    const setMusicVolume = (volume: number) => {
        if (bgMusicElement.value) {
            bgMusicElement.value.volume = volume
        }
    }

    return {
        currentTime,
        isPlaying,
        totalDuration,
        preload,
        play,
        pause,
        seek,
        draw,
        setCanvas,
        setMusicVolume
    }
}
