/**
 * UnifiedOrchestrator.ts
 * Master Orchestrator for the unified architecture on the Server.
 * Initializes UnifiedWSServer, UnifiedFSMEngine, UnifiedNMSServer, and UnifiedRTMPRelay.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { unifiedWSServer } from './UnifiedWSServer.js';
import { unifiedFSMEngine } from './UnifiedFSMEngine.js';
import { unifiedNMSServer } from './UnifiedNMSServer.js';
import { unifiedRTMPRelay } from './UnifiedRTMPRelay.js';

export class UnifiedOrchestrator {
  private static instance: UnifiedOrchestrator;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): UnifiedOrchestrator {
    if (!UnifiedOrchestrator.instance) {
      UnifiedOrchestrator.instance = new UnifiedOrchestrator();
    }
    return UnifiedOrchestrator.instance;
  }

  /**
   * Initialize all unified services with HTTP/SocketIO server
   */
  public initialize(server: HTTPServer | SocketIOServer): void {
    if (this.isInitialized) {
      console.warn('[UnifiedOrchestrator] Already initialized.');
      return;
    }

    console.log('🚀 [UnifiedOrchestrator] Initializing Unified Gateway & Services...');

    // 1. Initialize Unified WebSocket Gateway
    unifiedWSServer.initialize(server);

    // 2. Initialize Single Node Media Server (NMS Ingest)
    unifiedNMSServer.initialize(19350, 8000);

    // 3. Instantiate Single FSM Engine and RTMP Relay Manager (listeners attached)
    const fsm = unifiedFSMEngine;
    const relay = unifiedRTMPRelay;

    this.isInitialized = true;
    console.log('✅ [UnifiedOrchestrator] All unified services (WS, FSM, NMS, RTMP Relay) initialized successfully.');
  }
}

export const unifiedOrchestrator = UnifiedOrchestrator.getInstance();
