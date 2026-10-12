import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'

const state = vi.hoisted(() => ({ token: 'jwt-token' as string | null, sockets: [] as any[] }))

vi.mock('@/stores/user', () => ({ useUserStore: () => ({ token: state.token }) }))

vi.mock('socket.io-client', () => ({
    io: vi.fn((url: string, opts: any) => {
        const handlers = new Map<string, Set<Function>>()
        const socket = {
            url, opts,
            connected: false,
            get disconnected() { return !this.connected },
            on: vi.fn((event: string, fn: Function) => { if (!handlers.has(event)) handlers.set(event, new Set()); handlers.get(event)!.add(fn) }),
            off: vi.fn((event: string, fn: Function) => { handlers.get(event)?.delete(fn) }),
            emit: vi.fn(),
            connect: vi.fn(function (this: any) { this.connected = true }),
            disconnect: vi.fn(function (this: any) { this.connected = false }),
            listenerCount: (event: string) => handlers.get(event)?.size ?? 0
        }
        state.sockets.push(socket)
        return socket
    })
}))

const { acquireAppSocket, releaseAppSocket, openNamespaceSocket, useAppSocket } = await import('@/utils/appSocket')

/** Mounts a component whose setup calls useAppSocket, returns the result and an unmount fn. */
function mountWithSocket(handlers: Record<string, (...args: any[]) => void>) {
    let result: ReturnType<typeof useAppSocket> | undefined
    const app = createApp(defineComponent({
        setup() {
            result = useAppSocket(handlers)
            return () => h('div')
        }
    }))
    app.mount(document.createElement('div'))
    return { result: result!, unmount: () => app.unmount() }
}

beforeEach(() => {
    state.token = 'jwt-token'
    state.sockets.length = 0
})

describe('shared app socket', () => {
    it('returns null without a login token', () => {
        state.token = null
        expect(acquireAppSocket()).toBeNull()
        expect(state.sockets).toHaveLength(0)
    })

    it('reuses one connection for all consumers and closes it after the last release', () => {
        const a = acquireAppSocket()
        const b = acquireAppSocket()
        expect(a).toBe(b)
        expect(state.sockets).toHaveLength(1)

        releaseAppSocket()
        expect(a!.disconnect).not.toHaveBeenCalled()
        releaseAppSocket()
        expect(a!.disconnect).toHaveBeenCalledTimes(1)

        // A later consumer gets a fresh connection
        const c = acquireAppSocket()
        expect(c).not.toBe(a)
        releaseAppSocket()
    })

    it('reads the token at handshake time via the auth callback', () => {
        const socket = acquireAppSocket() as any
        state.token = 'refreshed-token'
        const cb = vi.fn()
        socket.opts.auth(cb)
        expect(cb).toHaveBeenCalledWith({ token: 'refreshed-token' })
        expect(socket.opts.path).toBe('/socket.io')
        releaseAppSocket()
    })

    it('useAppSocket removes its handlers and releases on unmount', () => {
        const onUpdate = vi.fn()
        const first = mountWithSocket({ 'project:updated': onUpdate })
        const second = mountWithSocket({ 'system-log': vi.fn() })
        const socket = first.result.socket as any

        expect(second.result.socket).toBe(socket)
        expect(socket.listenerCount('project:updated')).toBe(1)

        first.unmount()
        expect(socket.listenerCount('project:updated')).toBe(0)
        expect(socket.listenerCount('system-log')).toBe(1)
        expect(socket.disconnect).not.toHaveBeenCalled()

        second.unmount()
        expect(socket.listenerCount('system-log')).toBe(0)
        expect(socket.disconnect).toHaveBeenCalledTimes(1)
    })

    it('opens namespaces on the default socket.io path', () => {
        const ns = openNamespaceSocket('/collaboration') as any
        expect(ns.url).toBe(`${window.location.origin}/collaboration`)
        expect(ns.opts.path).toBe('/socket.io')
    })
})
