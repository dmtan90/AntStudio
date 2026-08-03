/**
 * UnifiedNMSServer.ts
 * Single NodeMediaServer instance for WebRTC ingest & local RTMP endpoint.
 * Emits stream lifecycle events to ServerEventBus.
 */

// NodeMediaServer dynamically required or typed
// @ts-ignore
import NodeMediaServer from 'node-media-server';
import { UnifiedWSEvent, StreamStatusPayload } from './UnifiedWSEventTypes.js';
import { serverEventBus } from './ServerEventBus.js';

export class UnifiedNMSServer {
  private static instance: UnifiedNMSServer;
  private nms: any = null;
  private isRunning: boolean = false;
  private rtmpPort: number = 19350;
  private httpPort: number = 8000;

  private constructor() {}

  public static getInstance(): UnifiedNMSServer {
    if (!UnifiedNMSServer.instance) {
      UnifiedNMSServer.instance = new UnifiedNMSServer();
    }
    return UnifiedNMSServer.instance;
  }

  public initialize(rtmpPort: number = 19350, httpPort: number = 8000): void {
    if (this.isRunning) {
      console.warn('[UnifiedNMSServer] NMS server is already running.');
      return;
    }

    this.rtmpPort = rtmpPort;
    this.httpPort = httpPort;

    const config = {
      rtmp: {
        port: this.rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
      },
      http: {
        port: this.httpPort,
        allow_origin: '*',
        mediaroot: './media'
      }
    };

    try {
      this.nms = new NodeMediaServer(config);
      this.setupLifecycleEvents();
      this.nms.run();
      this.isRunning = true;
      console.log(`🎥 [UnifiedNMSServer] NodeMediaServer started on RTMP:${this.rtmpPort}, HTTP:${this.httpPort}`);
    } catch (err: any) {
      console.error('[UnifiedNMSServer] Failed to start NodeMediaServer:', err.message);
    }
  }

  private setupLifecycleEvents(): void {
    if (!this.nms) return;

    this.nms.on('postPublish', (id: string, streamPath: string, args: any) => {
      const streamId = streamPath.split('/').pop() || id;
      console.log(`🟢 [UnifiedNMSServer] Stream published: ${streamPath} (Stream ID: ${streamId})`);

      const statusPayload: StreamStatusPayload = {
        streamId,
        active: true,
        message: `Stream ${streamId} published successfully.`
      };

      serverEventBus.publish(UnifiedWSEvent.STREAM_STATUS, statusPayload);
    });

    this.nms.on('donePublish', (id: string, streamPath: string, args: any) => {
      const streamId = streamPath.split('/').pop() || id;
      console.log(`🔴 [UnifiedNMSServer] Stream ended: ${streamPath} (Stream ID: ${streamId})`);

      const statusPayload: StreamStatusPayload = {
        streamId,
        active: false,
        message: `Stream ${streamId} stopped.`
      };

      serverEventBus.publish(UnifiedWSEvent.STREAM_STATUS, statusPayload);
    });
  }

  public stop(): void {
    if (this.nms && this.isRunning) {
      this.nms.stop();
      this.isRunning = false;
      console.log('[UnifiedNMSServer] NodeMediaServer stopped.');
    }
  }

  public getLocalRtmpUrl(streamId: string): string {
    return `rtmp://localhost:${this.rtmpPort}/live/${streamId}`;
  }
}

export const unifiedNMSServer = UnifiedNMSServer.getInstance();
