/**
 * ClientEventBus.ts
 * Strongly typed client-side EventBus for decoupled module communication.
 */

import { UnifiedWSEvent, WSEventMessage } from './UnifiedWSEventTypes';

type EventCallback<T = any> = (message: WSEventMessage<T>) => void;

export class ClientEventBus {
  private static instance: ClientEventBus;
  private listeners: Map<UnifiedWSEvent, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): ClientEventBus {
    if (!ClientEventBus.instance) {
      ClientEventBus.instance = new ClientEventBus();
    }
    return ClientEventBus.instance;
  }

  public on<T = any>(event: UnifiedWSEvent, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  public off<T = any>(event: UnifiedWSEvent, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T = any>(event: UnifiedWSEvent, payload: T, personaId?: string, sessionId?: string): void {
    const message: WSEventMessage<T> = {
      event,
      personaId,
      sessionId,
      timestamp: Date.now(),
      payload
    };

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(message);
        } catch (err) {
          console.error(`[ClientEventBus] Error in listener for event ${event}:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const clientEventBus = ClientEventBus.getInstance();
