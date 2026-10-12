import api from '@/utils/api'
import { acquireAppSocket, releaseAppSocket } from '@/utils/appSocket'

/**
 * AI video generation (POST /ai/generate-video) as a background job.
 *
 * The request is sent with `async: true`, so the server answers at once with a jobId instead of
 * holding the HTTP request open for minutes (which hit the axios timeout). Completion arrives via
 * the `ai:video-job` socket event; /ai/video-status is polled as a fallback for when the socket is
 * down or the event was missed. Servers that still answer synchronously ({ media, url }) work too.
 */
export interface VideoJobResult {
    jobId: string
    url: string
    media: any
}

export interface VideoJobPayload {
    prompt: string
    duration?: number
    aspectRatio?: string
    imageStart?: string
    imageEnd?: string
    startFrame?: string
    endFrame?: string
    characterImages?: string[]
    filename?: string
}

export interface WaitOptions {
    /** Give up after this long (generation itself usually takes 1-5 minutes) */
    timeoutMs?: number
    /** Status polling interval used alongside the socket event */
    pollMs?: number
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000
const DEFAULT_POLL_MS = 5000
/** Consecutive "not_found" answers before the job is considered lost (e.g. server restarted without Redis) */
const MAX_NOT_FOUND = 3

const unwrap = (res: any) => res?.data ?? res

export async function generateVideoJob(payload: VideoJobPayload, options: WaitOptions = {}): Promise<VideoJobResult> {
    const data = unwrap(await api.post('/ai/generate-video', { ...payload, async: true }, { timeout: 60_000 }))
    if (data?.media || data?.url) return data // server generated it synchronously
    if (!data?.jobId) throw new Error('Video generation did not return a job id')
    return waitForVideoJob(data.jobId, options)
}

export function waitForVideoJob(jobId: string, { timeoutMs = DEFAULT_TIMEOUT_MS, pollMs = DEFAULT_POLL_MS }: WaitOptions = {}): Promise<VideoJobResult> {
    return new Promise((resolve, reject) => {
        const socket = acquireAppSocket()
        let done = false
        let notFound = 0
        let pollTimer: ReturnType<typeof setTimeout> | undefined

        const finish = (error: Error | null, result?: VideoJobResult) => {
            if (done) return
            done = true
            clearTimeout(pollTimer)
            clearTimeout(deadline)
            if (socket) {
                socket.off('ai:video-job', onEvent)
                releaseAppSocket()
            }
            if (error) reject(error)
            else resolve(result!)
        }

        const settle = (status: any) => {
            if (status?.status === 'completed') {
                finish(null, { jobId, url: status.url ?? status.videoUrl, media: status.media })
            } else if (status?.status === 'failed') {
                finish(new Error(status.error || 'Video generation failed'))
            }
        }

        function onEvent(payload: any) {
            if (payload?.jobId === jobId) settle(payload)
        }

        const poll = async () => {
            try {
                const status = unwrap(await api.get(`/ai/video-status/${jobId}`))
                if (status?.status === 'not_found') {
                    if (++notFound >= MAX_NOT_FOUND) return finish(new Error('Video job was lost, please try again'))
                } else {
                    notFound = 0
                    settle(status)
                }
            } catch {
                // Transient errors: keep waiting, the socket event or the next poll will tell
            }
            if (!done) pollTimer = setTimeout(poll, pollMs)
        }

        const deadline = setTimeout(() => finish(new Error('Video generation timed out')), timeoutMs)
        socket?.on('ai:video-job', onEvent)
        pollTimer = setTimeout(poll, pollMs)
    })
}
