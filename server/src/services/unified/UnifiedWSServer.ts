/**
 * UnifiedWSServer.ts
 * Single WebSocket Server Gateway for client-server real-time communication.
 * Mounts on Socket.io namespace `/ws/unified`.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { UnifiedWSEvent, WSEventMessage } from './UnifiedWSEventTypes.js';
import { serverEventBus } from './ServerEventBus.js';

export class UnifiedWSServer {
  private static instance: UnifiedWSServer;
  private io: SocketIOServer | null = null;
  private activeSockets: Map<string, Socket> = new Map();

  private constructor() {}

  public static getInstance(): UnifiedWSServer {
    if (!UnifiedWSServer.instance) {
      UnifiedWSServer.instance = new UnifiedWSServer();
    }
    return UnifiedWSServer.instance;
  }

  /**
   * Attach to the existing SocketIOServer or HTTP server instance
   */
  public initialize(serverOrIo: HTTPServer | SocketIOServer): void {
    if (this.io) {
      console.warn('[UnifiedWSServer] Already initialized.');
      return;
    }

    if ('of' in serverOrIo && typeof serverOrIo.of === 'function') {
      // Re-use existing SocketIOServer instance
      this.io = serverOrIo as SocketIOServer;
    } else if ((serverOrIo as any)._io) {
      this.io = (serverOrIo as any)._io as SocketIOServer;
    } else {
      console.log('[UnifiedWSServer] Creating new SocketIOServer instance on HTTP server...');
      this.io = new SocketIOServer(serverOrIo as HTTPServer, {
        path: '/socket.io',
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });
      (serverOrIo as any)._io = this.io;
    }

    const nsp = this.io.of('/ws/unified');
    console.log('⚡ [UnifiedWSServer] Gateway active on namespace: /ws/unified');

    nsp.on('connection', (socket: Socket) => {
      console.log(`[UnifiedWSServer] Client connected: ${socket.id}`);
      this.activeSockets.set(socket.id, socket);

      socket.on('unified_event', (message: WSEventMessage) => {
        if (!message || !message.event) return;
        
        // Dispatch incoming client event to ServerEventBus
        serverEventBus.publish(message.event, message.payload, message.personaId, message.sessionId);
      });

      socket.on('disconnect', (reason: string) => {
        console.log(`[UnifiedWSServer] Client disconnected (${socket.id}): ${reason}`);
        this.activeSockets.delete(socket.id);
        
        serverEventBus.publish(UnifiedWSEvent.SYSTEM_DISCONNECT, { socketId: socket.id, reason });
      });
    });

    // Listen to ServerEventBus to broadcast or target specific events to client(s)
    this.registerBusBridge();
  }

  private registerBusBridge(): void {
    // Forward all events published on ServerEventBus to connected WS clients
    Object.values(UnifiedWSEvent).forEach(eventType => {
      serverEventBus.on(eventType, (message: WSEventMessage) => {
        if (!this.io) return;
        this.io.of('/ws/unified').emit('unified_event', message);
      });
    });
  }

  public broadcast<T = any>(event: UnifiedWSEvent, payload: T, personaId?: string, sessionId?: string): void {
    serverEventBus.publish(event, payload, personaId, sessionId);
  }

  public getConnectedCount(): number {
    return this.activeSockets.size;
  }
}

export const unifiedWSServer = UnifiedWSServer.getInstance();
