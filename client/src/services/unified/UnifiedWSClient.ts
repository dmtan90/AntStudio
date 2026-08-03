/**
 * UnifiedWSClient.ts
 * Single, unified WebSocket client gateway for the application.
 * Manages lifecycle, auto-retry connection, and forwards events to/from ClientEventBus.
 */

import { io, Socket } from 'socket.io-client';
import { UnifiedWSEvent, WSEventMessage, VoiceSessionConfig, StreamStartPayload } from './UnifiedWSEventTypes';
import { clientEventBus } from './ClientEventBus';

export class UnifiedWSClient {
  private static instance: UnifiedWSClient;
  private socket: Socket | null = null;
  private isConnectedState: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 20;
  private isConnecting: boolean = false;

  private constructor() {
    this.initConnection();
  }

  public static getInstance(): UnifiedWSClient {
    if (!UnifiedWSClient.instance) {
      UnifiedWSClient.instance = new UnifiedWSClient();
    }
    return UnifiedWSClient.instance;
  }

  /**
   * Initialize single WS connection at app startup
   */
  public initConnection(): void {
    if (this.socket && (this.socket.connected || this.isConnecting)) {
      return;
    }

    this.isConnecting = true;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    console.log('[UnifiedWSClient] Initializing single application WebSocket connection to:', `${origin}/ws/unified`);

    this.socket = io(`${origin}/ws/unified`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnectedState = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('✅ [UnifiedWSClient] Connected to unified server gateway. Socket ID:', this.socket?.id);
      
      clientEventBus.emit(UnifiedWSEvent.SYSTEM_CONNECT, { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnectedState = false;
      this.isConnecting = false;
      console.warn(`⚠️ [UnifiedWSClient] Disconnected: ${reason}`);
      
      clientEventBus.emit(UnifiedWSEvent.SYSTEM_DISCONNECT, { reason });
    });

    this.socket.on('connect_error', (error: Error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
      console.error(`❌ [UnifiedWSClient] Connection error (attempt ${this.reconnectAttempts}):`, error.message);
      
      clientEventBus.emit(UnifiedWSEvent.SYSTEM_ERROR, { error: error.message });
    });

    // Central event router for incoming server messages
    this.socket.on('unified_event', (message: WSEventMessage) => {
      if (!message || !message.event) return;
      clientEventBus.emit(message.event, message.payload, message.personaId, message.sessionId);
    });

    // Directly emit ping response if server pings
    this.socket.on('ping', () => {
      this.send(UnifiedWSEvent.SYSTEM_PONG, { timestamp: Date.now() });
    });
  }

  /**
   * Send typed event over single WS connection
   */
  public send<T = any>(event: UnifiedWSEvent, payload: T, personaId?: string, sessionId?: string): boolean {
    if (!this.socket || !this.isConnectedState) {
      console.warn(`[UnifiedWSClient] Cannot send event ${event} — Socket not connected.`);
      return false;
    }

    const message: WSEventMessage<T> = {
      event,
      personaId,
      sessionId,
      timestamp: Date.now(),
      payload
    };

    this.socket.emit('unified_event', message);
    return true;
  }

  // --- Convenience Helpers ---

  public isConnected(): boolean {
    return this.isConnectedState && !!this.socket?.connected;
  }

  public startVoiceSession(config: VoiceSessionConfig): void {
    this.send(UnifiedWSEvent.VOICE_SESSION_INIT, config, config.personaId);
  }

  public stopVoiceSession(personaId: string): void {
    this.send(UnifiedWSEvent.VOICE_SESSION_STOP, {}, personaId);
  }

  public sendAudioChunk(personaId: string, pcmBuffer: ArrayBuffer): void {
    this.send(UnifiedWSEvent.VOICE_AUDIO_CHUNK, { audio: pcmBuffer }, personaId);
  }

  public startLivestream(payload: StreamStartPayload): void {
    this.send(UnifiedWSEvent.LIVESTREAM_START, payload);
  }

  public stopLivestream(streamId: string): void {
    this.send(UnifiedWSEvent.LIVESTREAM_STOP, { streamId });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnectedState = false;
      this.isConnecting = false;
    }
  }
}

export const unifiedWSClient = UnifiedWSClient.getInstance();
