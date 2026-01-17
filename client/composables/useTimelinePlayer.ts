import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef, shallowRef } from 'vue'

export interface TimelineSegment {
    _id: string
    url: string
    duration: number // original duration
    speed: number
    volume: number
    order: number
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

    const getUrl = (url: string) => url.startsWith('http') ? url : `/api/s3/${url}`

    // Reactive segments
    const segments = computed(() => options.segments())
    const backgroundMusic = computed(() => options.backgroundMusic?.())

    // Total duration considering speed
    const totalDuration = computed(() => {
        return segments.value.reduce((sum, seg) => sum + (seg.duration / (seg.speed || 1)), 0)
    })

    // Preload elements
    const preload = () => {
        segments.value.forEach(seg => {
            if (seg.url && !videoElements.has(seg._id)) {
                const video = document.createElement('video')
                video.src = getUrl(seg.url)
                video.crossOrigin = 'anonymous'
                video.preload = 'auto'
                video.muted = false
                video.playsInline = true
                videoElements.set(seg._id, video)
            }
        });

        const bgm = backgroundMusic.value
        if (bgm?.url && !bgMusicElement.value) {
            const audio = new Audio(getUrl(bgm.url))
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

        // requestAnimationFrame(renderLoop)
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
            if (video) video.currentTime = active.relativeTime
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
        if (video && video.readyState >= 2) {
            const targetTime = active.relativeTime

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
            const canvasRatio = width / height
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
        } else {
            ctx.fillStyle = '#fff'
            ctx.font = '12px Inter'
            ctx.textAlign = 'center'
            ctx.fillText('Loading segment...', width / 2, height / 2)
        }
    }

    // Public draw method for when not playing but needing a redraw
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
