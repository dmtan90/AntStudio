import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => {
    const handlers = new Map<string, (payload: any) => void>()
    return {
        handlers,
        post: vi.fn(),
        get: vi.fn(),
        release: vi.fn(),
        socket: {
            on: vi.fn((event: string, cb: any) => { handlers.set(event, cb) }),
            off: vi.fn((event: string) => { handlers.delete(event) })
        }
    }
})

vi.mock('@/utils/api', () => ({ default: { post: m.post, get: m.get } }))
vi.mock('@/utils/appSocket', () => ({ acquireAppSocket: () => m.socket, releaseAppSocket: m.release }))

const { generateVideoJob, waitForVideoJob } = await import('@/utils/videoJobs')

// The api interceptor unwraps responses to { success, data }
const ok = (data: any) => ({ success: true, data })

beforeEach(() => {
    vi.useFakeTimers()
    m.handlers.clear()
    m.post.mockReset()
    m.get.mockReset().mockResolvedValue(ok({ status: 'processing' }))
    m.release.mockReset()
    m.socket.on.mockClear()
})
afterEach(() => vi.useRealTimers())

describe('generateVideoJob', () => {
    it('requests an async job and resolves from the socket event', async () => {
        m.post.mockResolvedValue(ok({ jobId: 'vid-1', status: 'pending' }))
        const promise = generateVideoJob({ prompt: 'a cat', duration: 5 })
        await vi.waitFor(() => expect(m.handlers.has('ai:video-job')).toBe(true))

        expect(m.post).toHaveBeenCalledWith('/ai/generate-video', { prompt: 'a cat', duration: 5, async: true }, expect.any(Object))
        m.handlers.get('ai:video-job')!({ jobId: 'other', status: 'completed', url: 'x' }) // someone else's job
        m.handlers.get('ai:video-job')!({ jobId: 'vid-1', status: 'completed', url: 'projects/u/videos/a.mp4', media: { _id: 'm1' } })

        await expect(promise).resolves.toEqual({ jobId: 'vid-1', url: 'projects/u/videos/a.mp4', media: { _id: 'm1' } })
        expect(m.handlers.has('ai:video-job')).toBe(false)
        expect(m.release).toHaveBeenCalledTimes(1)
    })

    it('returns directly when the server generated the video synchronously', async () => {
        m.post.mockResolvedValue(ok({ media: { _id: 'm1' }, url: 'k.mp4' }))
        await expect(generateVideoJob({ prompt: 'a cat' })).resolves.toEqual({ media: { _id: 'm1' }, url: 'k.mp4' })
        expect(m.socket.on).not.toHaveBeenCalledWith('ai:video-job', expect.anything())
    })
})

describe('waitForVideoJob', () => {
    it('falls back to polling /video-status when no event arrives', async () => {
        m.get.mockResolvedValueOnce(ok({ status: 'processing' }))
            .mockResolvedValueOnce(ok({ status: 'completed', videoUrl: 'v.mp4', media: { _id: 'm2' } }))
        const promise = waitForVideoJob('vid-2', { pollMs: 1000 })
        await vi.advanceTimersByTimeAsync(2000)
        await expect(promise).resolves.toEqual({ jobId: 'vid-2', url: 'v.mp4', media: { _id: 'm2' } })
        expect(m.get).toHaveBeenCalledWith('/ai/video-status/vid-2')
    })

    it('rejects with the server error when the job fails', async () => {
        const promise = waitForVideoJob('vid-3')
        m.handlers.get('ai:video-job')!({ jobId: 'vid-3', status: 'failed', error: 'quota exceeded' })
        await expect(promise).rejects.toThrow('quota exceeded')
    })

    it('keeps polling through transient errors, gives up on a lost job', async () => {
        m.get.mockRejectedValueOnce(new Error('network')).mockResolvedValue(ok({ status: 'not_found' }))
        const promise = waitForVideoJob('vid-4', { pollMs: 1000 })
        const assertion = expect(promise).rejects.toThrow('lost')
        await vi.advanceTimersByTimeAsync(4000)
        await assertion
        expect(m.get).toHaveBeenCalledTimes(4)
    })

    it('times out', async () => {
        const promise = waitForVideoJob('vid-5', { timeoutMs: 3000, pollMs: 1000 })
        const assertion = expect(promise).rejects.toThrow('timed out')
        await vi.advanceTimersByTimeAsync(3000)
        await assertion
        expect(m.release).toHaveBeenCalledTimes(1)
    })
})
