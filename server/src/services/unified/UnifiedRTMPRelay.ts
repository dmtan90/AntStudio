/**
 * UnifiedRTMPRelay.ts
 * Dedicated RTMP Multi-Platform Restream Manager.
 * Spawns and manages FFmpeg child processes to forward RTMP streams to YouTube, TikTok, Facebook, etc.
 * Listens to ServerEventBus for start/stop directives without affecting other modules.
 */

import { spawn, ChildProcess } from 'child_process';
import { UnifiedWSEvent, WSEventMessage, StreamStartPayload, RTMPRelayStatusPayload } from './UnifiedWSEventTypes.js';
import { serverEventBus } from './ServerEventBus.js';
import { unifiedNMSServer } from './UnifiedNMSServer.js';

export interface RelayTarget {
  id: string;
  rtmpUrl: string;
  streamKey: string;
}

export class UnifiedRTMPRelay {
  private static instance: UnifiedRTMPRelay;
  private activeRelays: Map<string, ChildProcess> = new Map();

  private constructor() {
    this.registerEventHandlers();
  }

  public static getInstance(): UnifiedRTMPRelay {
    if (!UnifiedRTMPRelay.instance) {
      UnifiedRTMPRelay.instance = new UnifiedRTMPRelay();
    }
    return UnifiedRTMPRelay.instance;
  }

  private registerEventHandlers(): void {
    serverEventBus.subscribe<StreamStartPayload>(UnifiedWSEvent.LIVESTREAM_START, (msg: WSEventMessage<StreamStartPayload>) => {
      if (msg.payload.platforms && msg.payload.platforms.length > 0) {
        this.startRelays(msg.payload.streamId, msg.payload.platforms);
      }
    });

    serverEventBus.subscribe(UnifiedWSEvent.LIVESTREAM_STOP, (msg: WSEventMessage<any>) => {
      const streamId = msg.payload?.streamId;
      if (streamId) {
        this.stopRelaysForStream(streamId);
      } else {
        this.stopAllRelays();
      }
    });

    serverEventBus.subscribe(UnifiedWSEvent.RTMP_RELAY_START, (msg: WSEventMessage<any>) => {
      if (msg.payload.streamId && msg.payload.platforms) {
        this.startRelays(msg.payload.streamId, msg.payload.platforms);
      }
    });

    serverEventBus.subscribe(UnifiedWSEvent.RTMP_RELAY_STOP, (msg: WSEventMessage<any>) => {
      if (msg.payload.streamId) {
        this.stopRelaysForStream(msg.payload.streamId);
      }
    });
  }

  /**
   * Start FFmpeg restream processes for each target platform
   */
  public startRelays(streamId: string, targets: RelayTarget[]): void {
    const inputUrl = unifiedNMSServer.getLocalRtmpUrl(streamId);

    targets.forEach((target) => {
      const relayKey = `${streamId}_${target.id}`;
      if (this.activeRelays.has(relayKey)) {
        console.warn(`[UnifiedRTMPRelay] Relay already running for ${relayKey}`);
        return;
      }

      const fullOutputUrl = target.rtmpUrl.endsWith('/')
        ? `${target.rtmpUrl}${target.streamKey}`
        : `${target.rtmpUrl}/${target.streamKey}`;

      console.log(`📡 [UnifiedRTMPRelay] Spawning FFmpeg relay for target: ${target.id} (Key: ${relayKey})`);

      this.publishStatus(streamId, target.id, 'connecting');

      // Spawn FFmpeg process
      const ffmpegArgs = [
        '-fflags', '+genpts+igndts+nobuffer',
        '-rw_timeout', '10000000',
        '-i', inputUrl,
        '-c', 'copy',
        '-f', 'flv',
        '-flvflags', 'no_duration_filesize',
        fullOutputUrl
      ];

      try {
        const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
        this.activeRelays.set(relayKey, proc);

        proc.on('spawn', () => {
          console.log(`✅ [UnifiedRTMPRelay] FFmpeg relay active for target: ${target.id}`);
          this.publishStatus(streamId, target.id, 'active');
        });

        proc.on('error', (err) => {
          console.error(`❌ [UnifiedRTMPRelay] FFmpeg error for ${target.id}:`, err.message);
          this.publishStatus(streamId, target.id, 'failed', err.message);
          this.activeRelays.delete(relayKey);
        });

        proc.on('exit', (code, signal) => {
          console.log(`ℹ️ [UnifiedRTMPRelay] FFmpeg relay exited for ${target.id} (code: ${code}, signal: ${signal})`);
          this.publishStatus(streamId, target.id, code === 0 ? 'stopped' : 'failed', `Exited with code ${code}`);
          this.activeRelays.delete(relayKey);
        });
      } catch (err: any) {
        console.error(`[UnifiedRTMPRelay] Failed to spawn FFmpeg process for ${target.id}:`, err.message);
        this.publishStatus(streamId, target.id, 'failed', err.message);
      }
    });
  }

  /**
   * Stop FFmpeg restream processes for a specific stream
   */
  public stopRelaysForStream(streamId: string): void {
    Array.from(this.activeRelays.keys()).forEach((key) => {
      if (key.startsWith(`${streamId}_`)) {
        const proc = this.activeRelays.get(key);
        if (proc) {
          console.log(`🛑 [UnifiedRTMPRelay] Killing FFmpeg process for ${key}`);
          try { proc.kill('SIGINT'); } catch (e) {}
        }
        this.activeRelays.delete(key);
      }
    });
  }

  /**
   * Stop all active FFmpeg restream processes
   */
  public stopAllRelays(): void {
    this.activeRelays.forEach((proc, key) => {
      console.log(`🛑 [UnifiedRTMPRelay] Stopping relay: ${key}`);
      try { proc.kill('SIGINT'); } catch (e) {}
    });
    this.activeRelays.clear();
  }

  private publishStatus(streamId: string, targetPlatform: string, status: RTMPRelayStatusPayload['status'], error?: string): void {
    serverEventBus.publish<RTMPRelayStatusPayload>(UnifiedWSEvent.RTMP_RELAY_STATUS, {
      streamId,
      targetPlatform,
      status,
      error
    });
  }
}

export const unifiedRTMPRelay = UnifiedRTMPRelay.getInstance();
