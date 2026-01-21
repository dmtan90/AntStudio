import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef, shallowRef } from 'vue'
import { getFileUrl } from '@/utils/api'

export interface TimelineSegment {
    _id: string
    url: string
    duration: number // original duration
    speed: number
    volume: number
    order: number
    transition?: string | null
    transitionDuration?: number // duration of transition overlap
    trimOffset?: number
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
            if (!seg.url) continue
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
        if (!active || !active.segment.url) {
            ctx.fillStyle = '#fff'
            ctx.font = '12px Inter'
            ctx.textAlign = 'center'
            ctx.fillText('No content at this position', width / 2, height / 2)
            return
        }

        const video = videoElements.get(active.segment._id)
        if (video && video.readyState >= 1) {
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
                if (Math.abs(video.currentTime - targetTime) > 0.05) {
                    video.currentTime = targetTime
                }
            }

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

            videoElements.forEach((v, id) => {
                if (id !== active.segment._id && !v.paused) v.pause()
            })
        }

        // Transition Logic
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
            } else if (active.segment.transition === 'wipe') {
                ctx.beginPath()
                ctx.rect(0, 0, width * progress, height)
                ctx.clip()
                const vRatio = nextVideo.videoWidth / nextVideo.videoHeight
                let bWidth, bHeight, bx, by
                if (vRatio > canvasRatio) {
                    bWidth = width; bHeight = width / vRatio; bx = 0; by = (height - bHeight) / 2
                } else {
                    bHeight = height; bWidth = height * vRatio; bx = (width - bWidth) / 2; by = 0
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
        if (bgMusicElement.value) { bgMusicElement.value.pause(); bgMusicElement.value.src = '' }
        videoElements.clear()
    })

    return {
        currentTime,
        isPlaying,
        totalDuration,
        preload,
        play,
        pause,
        seek,
        draw,
        setCanvas
    }
}
