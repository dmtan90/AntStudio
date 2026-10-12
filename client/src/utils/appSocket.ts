import { onUnmounted, ref, type Ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useUserStore } from '@/stores/user'

/**
 * One shared, authenticated Socket.IO connection for app-level events
 * (project notifications, director cuts, admin log stream).
 *
 * Previously each feature opened its own connection to the same server. Consumers now
 * acquire this socket, register their handlers, and release it on unmount; the connection
 * closes when the last consumer leaves. Namespaced sockets (e.g. /collaboration) are
 * multiplexed over the same underlying connection by socket.io's Manager cache.
 *
 * Live studio rooms (ActionSyncService) and Gemini Live sessions keep dedicated sockets:
 * they carry per-session handshake data (room, guest identity, query params).
 */

const SOCKET_PATH = '/socket.io'

let sharedSocket: Socket | null = null
let consumers = 0

const authCallback = (cb: (data: object) => void) => {
    // Read at (re)connect time so a refreshed login is picked up on reconnection
    cb({ token: useUserStore().token })
}

/** Returns the shared socket (connecting it if needed), or null when not logged in. */
export function acquireAppSocket(): Socket | null {
    if (!useUserStore().token) return null
    if (!sharedSocket) {
        sharedSocket = io(window.location.origin, {
            path: SOCKET_PATH,
            transports: ['websocket'],
            auth: authCallback
        })
    } else if (sharedSocket.disconnected) {
        sharedSocket.connect()
    }
    consumers++
    return sharedSocket
}

/** Releases one consumer; disconnects when nobody uses the socket anymore. */
export function releaseAppSocket() {
    consumers = Math.max(0, consumers - 1)
    if (consumers === 0 && sharedSocket) {
        sharedSocket.disconnect()
        sharedSocket = null
    }
}

/** Opens a namespace (e.g. '/collaboration') over the shared connection's Manager. */
export function openNamespaceSocket(namespace: string): Socket | null {
    if (!useUserStore().token) return null
    return io(`${window.location.origin}${namespace}`, {
        path: SOCKET_PATH,
        transports: ['websocket'],
        auth: authCallback
    })
}

type Handlers = Record<string, (...args: any[]) => void>

/**
 * Composable: uses the shared socket for the lifetime of the calling component.
 * Handlers are removed on unmount so they never accumulate across page visits.
 * Must be called synchronously in setup().
 */
export function useAppSocket(handlers: Handlers = {}): { socket: Socket | null; connected: Ref<boolean> } {
    const connected = ref(false)
    const socket = acquireAppSocket()
    if (!socket) return { socket: null, connected }

    const onConnect = () => { connected.value = true }
    const onDisconnect = () => { connected.value = false }
    connected.value = socket.connected
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler)

    onUnmounted(() => {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler)
        releaseAppSocket()
    })

    return { socket, connected }
}
