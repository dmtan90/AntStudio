/**
 * ServerEventBus.ts
 * Strongly typed server-side EventBus for decoupled backend module communication.
 */

import { EventEmitter } from 'events';
import { UnifiedWSEvent, WSEventMessage } from './UnifiedWSEventTypes.js';

export class ServerEventBus extends EventEmitter {
  private static instance: ServerEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): ServerEventBus {
    if (!ServerEventBus.instance) {
      ServerEventBus.instance = new ServerEventBus();
    }
    return ServerEventBus.instance;
  }

  public subscribe<T = any>(event: UnifiedWSEvent, listener: (message: WSEventMessage<T>) => void): () => void {
    this.on(event, listener);
    return () => this.off(event, listener);
  }

  public publish<T = any>(event: UnifiedWSEvent, payload: T, personaId?: string, sessionId?: string): void {
    const message: WSEventMessage<T> = {
      event,
      personaId,
      sessionId,
      timestamp: Date.now(),
      payload
    };
    this.emit(event, message);
  }
}

export const serverEventBus = ServerEventBus.getInstance();
