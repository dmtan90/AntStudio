import ffmpeg from 'fluent-ffmpeg';
/* @ts-ignore */
import NodeMediaServer from 'node-media-server';
/* @ts-ignore */
import { Logger } from '../../utils/Logger.js';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';
import { exec } from 'child_process';
import { User } from '~/models/User.js';
import { GuestToken } from '~/models/GuestToken.js';
import { StreamSessionModel } from '~/models/StreamSession.js';
import { configService, EnvConfig } from '~/utils/ConfigService.js';
import { creditManager, ServiceType } from '~/utils/CreditManager.js';
import { socketServer } from './SocketServer.js';
import { liveSalesServiceV3 } from '../ai/LiveSalesServiceV3.js';

// Set FFmpeg path from config
ffmpeg.setFfmpegPath(EnvConfig.ffmpegPath);
const FFMPEG_BIN = EnvConfig.ffmpegPath;

import axios from 'axios';
import crypto from 'crypto';
import { UserPlatformAccount, SocialPlatform } from '~/models/UserPlatformAccount.js';
import { highlightService } from './HighlightService.js';
import { redisService } from '../system/RedisService.js';
import si from 'systeminformation';

const RTMP_PORT = process.env.RTMP_PORT || 1935;

export interface StreamTarget {
    url: string;      // RTMP Base URL
    key: string;      // Stream Key
    platform: string; // e.g. "youtube"
    accountId?: string;
    externalChatId?: string;
    externalId?: string;
}

// Finalized targets
export interface StreamSession {
    id: string;
    userId: string;
    projectId?: string; // Associated project for highlights/assets
    targets: StreamTarget[];
    status: 'starting' | 'live' | 'error' | 'stopped';
    startTime?: Date;
    ffmpegProcess?: any;
    // Store manually managed relay processes (ffmpeg instances)
    relayProcesses?: any[]; 
    inputStream?: PassThrough;
    guestTokens?: string[];
    config?: {
        width: number;
        height: number;
        videoBitrate: number;
        audioBitrate: number;
        fps: number;
    };
    hasReceivedFirstChunk?: boolean;
    ebmlHeader?: Buffer;
    hasStartedEncoding?: boolean;
    fsmOptions?: { autonomousMode?: boolean, influencerId?: string, productIds?: string[], language?: string };
    hasStartedFSM?: boolean;
    startEncoderWatchdog?: () => void;
    encoderWatchdogTimer?: any;
}

import { EventEmitter } from 'events';

export class StreamingService extends EventEmitter {
    private sessions: Map<string, StreamSession> = new Map();
    private nodeId: string;
    private nms: any;
    private readonly GUEST_TOKEN_PREFIX = 'antstudio:guest:token:';
    private cachedCodec: string | null = null;

    constructor() {
        super();
        this.nodeId = process.env.NODE_ID || `node_${Math.random().toString(36).substring(2, 9)}`;
        // Defer NMS init to explicit call
    }

    public async initialize() {
        Logger.info('[StreamingService] Initializing Node Media Server...', 'StreamingService');
        this.initNodeMediaServer();
    }

    private initNodeMediaServer() {
        const config = {
            rtmp: {
                port: RTMP_PORT,
                chunk_size: 60000,
                gop_cache: true,
                ping: 30,
                ping_timeout: 60
            },
            http: {
                port: 8000,
                allow_origin: '*'
            },
            relay: {
                ffmpeg: FFMPEG_BIN,
                tasks: [
                    {
                        app: 'live',
                        mode: 'static',
                        edge: `rtmp://localhost:${RTMP_PORT}/live`,
                        name: 'relay'
                    }
                ]
            }
        };

        this.nms = new NodeMediaServer(config);
        this.nms.run();

        // Phase 92: Global Relay Manager - Direct FFmpeg Implementation
        this.nms.on('postPublish', (id: any, streamPath: any, args: any) => {
            try {
                // Compatible ID extraction
                let cleanPath = streamPath;
                if (typeof id === 'object') {
                    cleanPath = id.streamPath || id.StreamPath || streamPath;
                    id = id.id; 
                }

                if (!cleanPath) {
                    Logger.warn(`[NMS-Relay] postPublish received empty streamPath via id ${id}`, 'StreamingService');
                    return;
                }
                
                // Clean streamPath of any query params just in case
                cleanPath = cleanPath.split('?')[0];
                const pathParts = cleanPath.split('/');
                const sessionId = pathParts[pathParts.length - 1];
                
                Logger.info(`[NMS-Debug] Extracted sessionId: "${sessionId}" from path: "${cleanPath}"`, 'StreamingService');
                const session = this.sessions.get(sessionId);
                
                if (session) {
                    if (session.fsmOptions && !session.hasStartedFSM) {
                        session.hasStartedFSM = true;
                        this.checkAndStartAutonomousFSM(sessionId, session.fsmOptions).catch(e => {
                            Logger.error(`[StreamingService] Failed to start Autonomous FSM on postPublish: ${e}`, 'StreamingService');
                        });
                    }

                    if (session.targets && session.targets.length > 0) {
                        Logger.info(`[NMS-Relay] Stream detected for session ${sessionId}. Starting DIRECT FFmpeg push to ${session.targets.length} targets.`, 'StreamingService', JSON.stringify(session.targets));
                        
                        // Initialize relay array if needed
                        if (!session.relayProcesses) {
                            session.relayProcesses = [];
                        }

                        // Local Input URL (RTMP Loopback)
                        const inputUrl = `rtmp://localhost:${RTMP_PORT}${cleanPath}`;

                        session.targets.forEach((target, index) => {
                            const baseUrl = target.url.replace(/\/$/, '');
                            const remoteUrl = `${baseUrl}/${target.key}`;
                            
                            let oldCommand: any = null;
                            
                            const spawnRelay = () => {
                                const currentSession = this.sessions.get(sessionId);
                                if (!currentSession || currentSession.status !== 'live') {
                                    Logger.info(`[NMS-Relay] Session ${sessionId} is no longer live. Skipping relay spawn/respawn for ${target.platform}.`, 'StreamingService');
                                    return;
                                }

                                Logger.info(`[NMS-Relay] Spawning/Respawning Relay Process ${index + 1}: ${sessionId} -> ${target.platform} (URL: ${remoteUrl})`, 'StreamingService');
                                
                                const relayCommand = ffmpeg(inputUrl)
                                    .inputOptions([
                                        '-fflags +genpts+igndts+nobuffer',
                                        '-rw_timeout 10000000' // 10s read/write timeout to prevent socket hanging
                                    ])
                                    .outputOptions([
                                        '-c copy', // Pass-through video/audio (very low CPU)
                                        '-f flv',
                                        '-flvflags no_duration_filesize'
                                    ])
                                    .output(remoteUrl)
                                    .on('start', (cmdLine: any) => {
                                        Logger.info(`[NMS-Relay] Relay started for ${target.platform}: ${cmdLine}`, 'StreamingService');
                                    })
                                    .on('error', (err: any, stdout: any, stderr: any) => {
                                        const errMsg = err?.message || '';
                                        const isNormalStop = errMsg.includes('SIGKILL') || errMsg.includes('exited with code 1') || (currentSession.status !== 'live');
                                        
                                        if (!isNormalStop) {
                                            Logger.error(`[NMS-Relay] Error relaying to ${target.platform}: ${errMsg}`, 'StreamingService');
                                            Logger.debug(`[NMS-Relay] Stderr: ${stderr}`, 'StreamingService');
                                        } else {
                                            Logger.info(`[NMS-Relay] Relay to ${target.platform} stopped normally.`, 'StreamingService');
                                        }

                                        // Gracefully respawn after 2 seconds if the session is still active
                                        const checkSession = this.sessions.get(sessionId);
                                        if (checkSession && checkSession.status === 'live' && !errMsg.includes('SIGKILL')) {
                                            Logger.info(`[NMS-Relay] Reconnecting/Respawning relay to ${target.platform} in 2 seconds...`, 'StreamingService');
                                            setTimeout(() => spawnRelay(), 2000);
                                        }
                                    })
                                    .on('end', () => {
                                        Logger.info(`[NMS-Relay] Relay to ${target.platform} finished.`, 'StreamingService');
                                        
                                        // Gracefully respawn after 2 seconds if the session is still active
                                        const checkSession = this.sessions.get(sessionId);
                                        if (checkSession && checkSession.status === 'live') {
                                            Logger.info(`[NMS-Relay] Restarting relay to ${target.platform} after end in 2 seconds...`, 'StreamingService');
                                            setTimeout(() => spawnRelay(), 2000);
                                        }
                                    });

                                // Execute and track
                                relayCommand.run();
                                
                                if (currentSession.relayProcesses) {
                                    // Remove old command reference to prevent leaks, then add the new one
                                    currentSession.relayProcesses = currentSession.relayProcesses.filter(p => p !== oldCommand);
                                    currentSession.relayProcesses.push(relayCommand);
                                }
                                oldCommand = relayCommand;
                            };

                            // Initiate the first spawn
                            spawnRelay();
                        });
                    } else {
                        Logger.warn(`[NMS-Relay] Session ${sessionId} found but has NO targets. Relay skipped.`, 'StreamingService');
                    }
                } else {
                    const availableSessions = Array.from(this.sessions.keys());
                    Logger.warn(`[NMS-Relay] Session lookup failed for ID: "${sessionId}". Available sessions: ${JSON.stringify(availableSessions)}`, 'StreamingService');
                }
            } catch(err){
                Logger.error(`[NMS-Relay] Error in postPublish: ${err}`, 'StreamingService');
            }
        });

        this.nms.on('donePublish', (id: string, StreamPath: string, _args: any) => {
            Logger.info(`[NMS-Relay] Stream donePublish triggered for path: ${StreamPath}`, 'StreamingService');
            if (!StreamPath || typeof StreamPath !== 'string') return;
            const parts = StreamPath.split('/');
            const sessionId = parts[parts.length - 1];
            if (sessionId) {
                const session = this.sessions.get(sessionId);
                if (session) {
                    session.status = 'stopped';
                    this.stopRestream(sessionId).catch(err => {
                        Logger.warn(`[NMS-Relay] Error stopping stream on donePublish for ${sessionId}: ${err}`);
                    });
                }
            }
        });

        Logger.info(`Node Media Server initialized on port ${RTMP_PORT} (RTMP) and 8000 (HTTP)`, 'StreamingService');
    }

    /**
     * Helper to authenticate with AMS and return cookie
     */
    private async getAMSCookie(credentials: any): Promise<string> {
        const { serverUrl, email, password } = credentials;
        const baseUrl = serverUrl.replace(/\/$/, '');
        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
        const authRes = await axios.post(`${baseUrl}/rest/v2/users/authenticate`, {
            email,
            password: hashedPassword
        });
        return authRes.headers['set-cookie']?.[0] || '';
    }

    /**
     * Configure AMS to restream to other endpoints
     */
    private async setupAMSRestream(amsTarget: StreamTarget, externalTargets: StreamTarget[]): Promise<boolean> {
        try {
            const account = await UserPlatformAccount.findById(amsTarget.accountId);
            if (!account) return false;

            const cookie = await this.getAMSCookie(account.credentials);
            const baseUrl = account.credentials.serverUrl!.replace(/\/$/, '');
            const appName = account.credentials.appName || 'LiveApp';
            const streamId = amsTarget.key;

            // Ensure the broadcast exists in the AMS datastore first (prevents 404/400 errors when adding endpoints before publishing starts)
            try {
                await axios.post(`${baseUrl}/${appName}/rest/v2/broadcasts/create`, {
                    streamId: streamId,
                    name: `AntStudio_${streamId}`,
                    type: 'liveStream'
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: cookie
                    }
                });
                Logger.info(`Successfully created/registered stream ${streamId} on AMS.`, 'StreamingService');
            } catch (err: any) {
                // If it already exists or pre-creation warning, we log it and proceed
                Logger.info(`AMS stream ${streamId} pre-creation status: ${err.message}. Proceeding to add endpoints...`, 'StreamingService');
                return false;
            }

            // Add each external target as an endpoint to AMS (supports RTMP and SRT)
            let success = false;
            for (const target of externalTargets) {
                let endpointUrl = target.url;
                if (target.key) {
                    if (target.url.startsWith('rtmp')) {
                        // RTMP URL: append stream key properly
                        if (target.url.endsWith('/')) {
                            endpointUrl = `${target.url}${target.key}`;
                        } else {
                            endpointUrl = `${target.url}/${target.key}`;
                        }
                    } else if (target.url.startsWith('srt')) {
                        // SRT URL: do NOT append key as a path slash.
                        // Instead, if a streamid query parameter is not present, append it.
                        if (!target.url.includes('streamid') && !target.url.includes('streamId')) {
                            const separator = target.url.includes('?') ? '&' : '?';
                            endpointUrl = `${target.url}${separator}streamid=${target.key}`;
                        }
                    } else {
                        // Default fallback
                        if (target.url.endsWith('/')) {
                            endpointUrl = `${target.url}${target.key}`;
                        } else {
                            endpointUrl = `${target.url}/${target.key}`;
                        }
                    }
                }

                // Try modern `/endpoint` REST API first (supports RTMP and SRT in AMS 3.x)
                // Modern Endpoint class expects: endpointUrl and endpointServiceId
                const modernPayload = {
                    endpointUrl: endpointUrl,
                    endpointServiceId: target.platform
                };

                try {
                    await axios.post(`${baseUrl}/${appName}/rest/v2/broadcasts/${streamId}/endpoint`, modernPayload, {
                        headers: {
                            'Content-Type': 'application/json',
                            Cookie: cookie
                        }
                    });
                    success = true;
                    Logger.info(`Successfully added AMS endpoint (${target.platform}): ${endpointUrl}`, 'StreamingService');
                } catch (err: any) {
                    Logger.warn(`Modern /endpoint API failed for ${target.platform} (${err.message}). Trying fallback /rtmp-endpoint...`, 'StreamingService');
                    success = false;
                }

                if (!success) {
                    // Fallback to legacy `/rtmp-endpoint` REST API
                    // Legacy payload expects: rtmpUrl
                    const legacyPayload = {
                        rtmpUrl: endpointUrl
                    };

                    await axios.post(`${baseUrl}/${appName}/rest/v2/broadcasts/${streamId}/rtmp-endpoint`, legacyPayload, {
                        headers: {
                            'Content-Type': 'application/json',
                            Cookie: cookie
                        }
                    }).then(() => {
                        Logger.info(`Successfully added AMS endpoint via legacy fallback (${target.platform}): ${endpointUrl}`, 'StreamingService');
                        success = true;
                    }).catch(err => {
                        Logger.error(`Failed to add AMS endpoint via legacy fallback for ${target.platform}: ${err.message}`, 'StreamingService');
                    });
                }
            }

            Logger.info(`Configured AMS ${streamId} to restream to ${externalTargets.length} endpoints ${success ? 'successful' : 'failed'}`, 'StreamingService');
            return success;
        } catch (error: any) {
            Logger.error(`AMS Restream Setup Error: ${error.message}`, 'StreamingService');
            // Fallback: Do not fail, just log. System will just stream to AMS and fail to restream.
        }
        return false;
    }

    private async getOptimalVideoCodec(): Promise<string> {
        if (this.cachedCodec) return this.cachedCodec;

        let codec = 'libx264';
        const platform = process.platform;

        try {
            const graphics = await si.graphics();
            const controllers = graphics.controllers;
            const gpuNames = controllers.map((c: any) => `${c.model || ''} ${c.vendor || ''}`.toLowerCase());

            Logger.info(`[GPU-Detect] Detected Hardware: ${gpuNames.join(' | ')}`, 'StreamingService');

            const hasNvidia = gpuNames.some((name: string) => name.includes('nvidia'));
            const hasIntel = gpuNames.some((name: string) => name.includes('intel'));

            if (platform === 'win32') {
                if (hasNvidia) {
                    codec = 'h264_nvenc';
                } else {
                    // Intel QSV (h264_qsv) hangs on stdin piped WebM streams (pipe:0) on integrated Intel GPUs.
                    // Use libx264 with ultrafast preset for reliable zero-latency streaming.
                    codec = 'libx264';
                }
            } else if (platform === 'darwin') {
                codec = 'h264_videotoolbox';
            } else if (platform === 'linux') {
                if (hasNvidia) {
                    codec = 'h264_nvenc';
                } else {
                    codec = 'h264_vaapi';
                }
            }
        } catch (err) {
            Logger.warn(`[GPU-Detect] Detection failed, falling back to libx264: ${err}`, 'StreamingService');
        }

        this.cachedCodec = codec;
        Logger.info(`[Relay-Optimization] Final Codec Selection: ${codec}`, 'StreamingService');
        return codec;
    }

    /**
     * Start a restreaming session
     * @param source - Incoming stream URL or local file path
     * @param targets - Array of RTMP destinations
     * @param options - Additional settings (loop, etc.)
     */
    public async startRestream(
        userId: string,
        source: string,
        targets: StreamTarget[],
        options: { loop?: boolean, quality?: any, sessionId?: string, projectId?: string, productIds?: string[], language?: string, influencerId?: string, autonomousMode?: boolean } = {}
    ): Promise<{ sessionId: string, mode: string }> {
        const sessionId = options.sessionId || `stream_${Date.now()}`;

        Logger.info(`Starting restream for user ${userId} to ${targets.length} targets (Loop: ${options.loop})`, 'StreamingService');

        // 0. Credit Check (Must have at least 1 credit to start)
        const user = await User.findById(userId);
        if (!user) {
            throw new Error(`Can't find the user: ${userId}`);
        }

        if(configService.creditModeEnabled && user.credits.balance < 1){
            throw new Error('Insufficient credits to start broadcast. Minimum 1 credit required.');
        }

        // AMS Offloading Check
        let amsTarget: any = targets.find(t => t.platform === SocialPlatform.ANT_MEDIA);
        const externalTargets = targets.filter(t => t.platform !== SocialPlatform.ANT_MEDIA);

        let finalTargets = targets;

        // If we have an AMS target and external targets, let AMS handle the distribution
        if (amsTarget && externalTargets.length > 0) {
            Logger.info('AMS detected. Offloading restreaming responsibility to AMS.', 'StreamingService');
            const status = await this.setupAMSRestream(amsTarget, externalTargets);
            if(status){
                finalTargets = [amsTarget]; // FFmpeg only streams to AMS
            }
            else{
                amsTarget = null;
                Logger.error("AMS server is offline or issue, try FFMPEG service");
            }
        }

        const session: StreamSession = {
            id: sessionId,
            userId,
            projectId: options.projectId,
            targets: finalTargets,
            status: source === 'webrtc' ? 'live' : 'starting',
            startTime: source === 'webrtc' ? new Date() : undefined,
            guestTokens: []
        };

        if (source === 'webrtc') {
            if (amsTarget) {
                this.sessions.set(sessionId, session);

                // Persist State
                await this.syncSessionToDB(session, { mode: source === 'webrtc' ? 'webrtc_ams' : 'ams' });

                Logger.info(`WebRTC session ${sessionId} initialized using AMS Bridge. Browser handles ingest.`, 'StreamingService');
                await this.checkAndStartAutonomousFSM(sessionId, options);
                return { sessionId, mode: 'webrtc_ams' };
            } else {
                // Fallback: Use backend relay (WebRTC-to-RTMP)
                // This initializes FFmpeg to expect a piped input from the browser
                const relaySession: StreamSession = {
                    id: sessionId,
                    userId,
                    projectId: options.projectId,
                    targets: finalTargets,
                    status: 'live',
                    startTime: new Date(),
                    guestTokens: [],
                    config: options.quality,
                    fsmOptions: options,
                    inputStream: new PassThrough() // Create early to buffer ingest chunks
                };

                // CRITICAL: Register session BEFORE awaiting initRelayFFmpeg
                // so ingestRelayChunk can start writing to the buffer immediately
                this.sessions.set(sessionId, relaySession);

                try {
                    await this.initRelayFFmpeg(sessionId, relaySession, externalTargets);
                } catch (err: any) {
                    this.sessions.delete(sessionId);
                    Logger.error(`[StreamingService] Failed to initialize relay FFmpeg for ${sessionId}: ${err.message}`, 'StreamingService');
                    throw new Error(`Failed to start relay stream: ${err.message}`);
                }

                this.syncSessionToDB(relaySession, { mode: 'webrtc_relay' }).catch(() => { });

                Logger.info(`WebRTC session ${sessionId} initialized with BACKEND RELAY bridge. Waiting for active stream encoding before launching Autonomous FSM...`, 'StreamingService');
                return { sessionId, mode: 'webrtc_relay' };
            }
        }

        try {
            const command = ffmpeg(source);

            if (options.loop) {
                command.inputOptions(['-stream_loop -1']); // Infinite loop for file source
            }

            command.inputOptions([
                '-re', // Read input at native frame rate
                ])
                .outputOptions([
                    '-vcodec copy',
                    '-acodec copy',
                    '-f flv'
                ]);

            // Multiplexing logic: Send to determined RTMP targets
            const rtmpUrls = finalTargets.map(t => `[f=flv]${t.url}/${t.key}`).join('|');
            const teeOutput = `tee:${rtmpUrls}`;

            command.output(teeOutput);

            command.on('start', async (cmd: string) => {
                Logger.info(`FFmpeg process started: ${cmd}`, 'StreamingService');
                session.status = 'live';
                session.startTime = new Date();
                
                try {
                    await this.syncSessionToDB(session, { mode: 'file_relay' });
                    Logger.info(`Session ${session.id} is now LIVE`, 'StreamingService');
                    
                    // Start chat and engagement sync workers when session goes live
                    const { socketServer } = await import('./SocketServer.js');
                    socketServer.ensureSyncWorkersRunning();
                    await this.checkAndStartAutonomousFSM(sessionId, options);
                } catch (err: any) {
                    Logger.error(`Failed to sync session to DB: ${err.message}`, 'StreamingService');
                }
            });

            command.on('error', (err: Error) => {
                Logger.error(`FFmpeg streaming error: ${err.message}`, 'StreamingService');
                session.status = 'error';
                this.syncSessionToDB(session, { mode: 'file_relay' }).catch(() => { });
                this.stopRestream(sessionId);
            });

            command.on('end', () => {
                Logger.info(`FFmpeg stream ended: ${sessionId}`, 'StreamingService');
                session.status = 'stopped';
                this.syncSessionToDB(session, { mode: 'file_relay' }).catch(() => { });
            });

            const process = command.run();
            session.ffmpegProcess = process;

            this.sessions.set(sessionId, session);

            // Persist State
            await this.syncSessionToDB(session, { mode: 'file_relay' });

            return { sessionId, mode: 'file_relay' };

        } catch (error: any) {
            Logger.error(`Failed to initialize stream: ${error.message}`, 'StreamingService');
            throw error;
        }
    }

    /**
     * Initialize FFmpeg for WebSocket ingestion (Internal Relay)
     */
    private async initRelayFFmpeg(sessionId: string, session: StreamSession, targets: StreamTarget[], forceCpuCodec = false) {
        if (!fs.existsSync(EnvConfig.ffmpegPath)) {
            const errMsg = `FFmpeg executable binary not found on disk: ${EnvConfig.ffmpegPath}`;
            Logger.error(`[StreamingService] ${errMsg}`, 'StreamingService');
            throw new Error(errMsg);
        }

        // Re-create the input stream if we have a saved EBML header to recover from crashes / fallbacks
        if (session.ebmlHeader) {
            const newStream = new PassThrough();
            newStream.write(session.ebmlHeader);
            session.inputStream = newStream;
            session.hasReceivedFirstChunk = true;
            Logger.info(`[Relay-Codec] Re-created input stream and prepended saved EBML header (${session.ebmlHeader.length} bytes) for ${sessionId}`, 'StreamingService');
        } else if (!session.inputStream) {
            session.inputStream = new PassThrough();
        }

        const config = session.config || {
            width: 1280,
            height: 720,
            videoBitrate: 2500,
            audioBitrate: 128,
            fps: 30
        };

        Logger.info(`[Relay-Config] Session ${sessionId} Quality: ${config.width}x${config.height} @ ${config.videoBitrate}kbps`, 'StreamingService');

        // Determine output: Push to local NMS first
        // Determine output: Push to local NMS first
        const localRtmpUrl = `rtmp://localhost:${RTMP_PORT}/live/${sessionId}`;

        // Hardware Acceleration Check (Phase 92) - Cross Platform & Hardware Aware
        const videoCodec = forceCpuCodec ? 'libx264' : await this.getOptimalVideoCodec();
        Logger.info(`[Relay-Codec] Selected video codec for ${sessionId}: ${videoCodec}`, 'StreamingService');

        const outputOptions = [
            '-f flv',
            '-tune zerolatency',
            '-flags +global_header',
            '-max_muxing_queue_size 10240',
            // Enforce yuv420p pixel format for RTMP compatibility (fixes nv12 issues with QSW/NVENC)
            `-vf format=yuv420p,scale=${config.width}:-2`,
            '-threads 0',
            '-g 60',
            `-r ${config.fps}`,
            `-b:v ${config.videoBitrate}k`,
            `-maxrate ${config.videoBitrate}k`,
            `-bufsize ${config.videoBitrate * 2}k`,
            '-ac 2',
            '-ar 44100',
            `-b:a ${config.audioBitrate}k`,
            '-async 1',                    // Audio sync: resample to match video
            '-vsync 1'                // Constant frame rate (duplicate/drop frames as needed)
        ];

        if (videoCodec === 'libx264') {
            outputOptions.push('-preset ultrafast');
        } else if (videoCodec === 'h264_nvenc') {
            outputOptions.push('-preset p1'); // Lowest latency for NVENC
        } else if (videoCodec === 'h264_vaapi') {
            outputOptions.push('-preset faster'); // Generic faster for VAAPI
        } else if (videoCodec === 'h264_qsv') {
            outputOptions.push('-preset veryfast'); // Veryfast for QSV
        }
        
        const command = ffmpeg(session.inputStream)
            .inputOptions([
                '-analyzeduration 2000000',
                '-probesize 2000000',
                '-fflags +genpts+igndts+nobuffer', // Add nobuffer for real-time
                '-avoid_negative_ts make_zero',
                '-max_delay 0'
            ])
            .inputFormat('matroska') // More generic than 'webm'
            .videoCodec(videoCodec)
            .audioCodec('aac')
            .outputOptions(outputOptions)
            .output(localRtmpUrl);

        // Setup Managed Relay via NMS is now handled by the global postPublish listener
        // in initNodeMediaServer, which triggers as soon as FFmpeg starts pushing to local NMS.

        session.hasStartedEncoding = false;

        // Clear any previous watchdog timer
        if (session.encoderWatchdogTimer) {
            clearTimeout(session.encoderWatchdogTimer);
            session.encoderWatchdogTimer = null;
        }

        session.startEncoderWatchdog = () => {
            if (session.encoderWatchdogTimer) return; // Already running

            Logger.info(`[Relay-Watchdog] Starting encoder startup watchdog (8s) for ${sessionId} using ${videoCodec}...`, 'StreamingService');

            session.encoderWatchdogTimer = setTimeout(async () => {
                if (!session.hasStartedEncoding && session.status === 'live') {
                    Logger.warn(`[Relay-Watchdog] Encoder hang/stalled detected on ${sessionId} using ${videoCodec} after receiving data. Force killing hanging process and falling back to libx264!`, 'StreamingService');

                    // Mark as restarting so the error handler handles it correctly
                    (session as any).isRestarting = true;

                    if (session.ffmpegProcess) {
                        try {
                            session.ffmpegProcess.kill('SIGKILL');
                            const proc = (session.ffmpegProcess as any).ffmpegProc;
                            const pid = proc ? proc.pid : null;
                            if (pid && process.platform === 'win32') {
                                // Dynamic import of exec if needed, or assume it's imported.
                                // It is imported at the top of the file as `import { exec } from 'child_process';`
                                const { exec } = await import('child_process');
                                exec(`taskkill /pid ${pid} /f /t`);
                            }
                        } catch (e) {
                            Logger.error(`[Relay-Watchdog] Error killing hanging FFmpeg: ${e}`, 'StreamingService');
                        }
                        session.ffmpegProcess = null;
                    }

                    session.encoderWatchdogTimer = null;
                    this.cachedCodec = 'libx264';
                    
                    // The error event handler will trigger the actual fallback.
                }
            }, 8000);
        };

        command.on('start', (cmd: string) => {
            Logger.info(`Relay FFmpeg process started: ${cmd}`, 'StreamingService');
            session.startTime = new Date();
        });

        command.on('stderr', (line: string) => {
            const lineString = line.trim();
            if (lineString.startsWith('frame=')) {
                if (!session.hasStartedEncoding) {
                    session.hasStartedEncoding = true;
                    Logger.info(`[Relay-Watchdog] Encoder successfully active, encoding frames for ${sessionId}. Watchdog disarmed.`, 'StreamingService');
                    if (session.encoderWatchdogTimer) {
                        clearTimeout(session.encoderWatchdogTimer);
                        session.encoderWatchdogTimer = null;
                    }
                    if (session.fsmOptions && !session.hasStartedFSM) {
                        session.hasStartedFSM = true;
                        this.checkAndStartAutonomousFSM(sessionId, session.fsmOptions).catch(e => {
                            Logger.error(`[StreamingService] Failed to start Autonomous FSM for ${sessionId}: ${e}`, 'StreamingService');
                        });
                    }
                }
            } else {
                Logger.info(`[Relay-Debug] ${lineString}`, 'StreamingService');
            }
        });

        command.on('error', (err: Error) => {
            if (session.encoderWatchdogTimer) {
                clearTimeout(session.encoderWatchdogTimer);
                session.encoderWatchdogTimer = null;
            }

            const isStartupFailure = (session as any).isRestarting || !session.startTime || (Date.now() - session.startTime.getTime() < 15000);
            if (isStartupFailure && videoCodec !== 'libx264') {
                Logger.warn(`[Relay-Fallback] Hardware codec ${videoCodec} failed or stalled: ${err.message}. Retrying with CPU encoder (libx264)...`, 'StreamingService');
                
                // Evict the cached codec so future sessions don't inherit the broken hardware codec
                this.cachedCodec = 'libx264';
                (session as any).isRestarting = false;

                // Clear the failed process from session
                session.ffmpegProcess = null;
                
                // Retry with CPU encoder
                this.initRelayFFmpeg(sessionId, session, targets, true);
                return;
            }

            Logger.error(`Relay FFmpeg error: ${err.message}`, 'StreamingService');
            session.status = 'error';
            this.emit('session:stopped', { sessionId, reason: err.message, status: 'error' });
            
            // Broadcast stream:error to client room
            const io = socketServer.getIO();
            if (io) {
                io.to(sessionId).emit('stream:error', { sessionId, reason: `FFmpeg crashed: ${err.message}` });
            }

            this.stopRestream(sessionId);
        });

        command.on('end', () => {
            if (session.encoderWatchdogTimer) {
                clearTimeout(session.encoderWatchdogTimer);
                session.encoderWatchdogTimer = null;
            }
            Logger.info(`Relay FFmpeg stream ended: ${sessionId}`, 'StreamingService');
            session.status = 'stopped';
            this.emit('session:stopped', { sessionId, reason: 'Stream ended cleanly', status: 'stopped' });
        });

        // Use command.run() to start, but we don't need the return value as a process here
        command.run();
        session.ffmpegProcess = command;
    }

    /**
     * Ingest binary data into a relay session
     */
    public ingestRelayChunk(sessionId: string, chunk: any): boolean {
        const session = this.sessions.get(sessionId);
        
        let buffer: Buffer;
        if (Buffer.isBuffer(chunk)) {
            buffer = chunk;
        } else if (chunk instanceof ArrayBuffer || chunk instanceof SharedArrayBuffer) {
            buffer = Buffer.from(chunk);
        } else if (chunk && typeof chunk === 'object' && chunk.type === 'Buffer' && Array.isArray(chunk.data)) {
            buffer = Buffer.from(chunk.data);
        } else {
            Logger.warn(`[Relay-Ingest] Received invalid chunk type ${typeof chunk} for ${sessionId}, ignoring.`, 'StreamingService');
            return true;
        }

        const bufferSize = buffer.length;
        Logger.info(`[Relay-Ingest] Called for ${sessionId}: sessionFound=${!!session}, hasInputStream=${!!(session?.inputStream)}, bufferSize=${bufferSize}`, 'StreamingService');

        if (bufferSize === 0) {
            return true; // Ignore empty buffer but return true to avoid socket error emit
        }

        if (session && session.inputStream) {
            try {
                // If stream is actively encoding, ignore any tiny noise/keep-alive packets (< 10 bytes)
                // that would desynchronize the Matroska/EBML parser in FFmpeg, causing track errors & audio dropouts.
                if (session.hasStartedEncoding && bufferSize < 10) {
                    Logger.warn(`[Relay-Ingest] Discarded post-startup tiny noise chunk of size ${bufferSize} bytes for ${sessionId} to prevent parser desync.`, 'StreamingService');
                    return true;
                }

                // Startup chunk accumulation to guarantee robust fallback recovery
                if (!session.hasReceivedFirstChunk) {
                    session.hasReceivedFirstChunk = true;
                    session.ebmlHeader = buffer;
                    if (session.startEncoderWatchdog) {
                        session.startEncoderWatchdog();
                    }
                } else if (session.ebmlHeader && session.ebmlHeader.length < 256000 && !session.hasStartedEncoding) {
                    session.ebmlHeader = Buffer.concat([session.ebmlHeader, buffer]);
                }

                // Debug EBML Header presence once we have accumulated at least 4 bytes
                if (session.ebmlHeader && !(session as any).hasLoggedEbmlCheck && session.ebmlHeader.length >= 4) {
                    (session as any).hasLoggedEbmlCheck = true;
                    const header = session.ebmlHeader.subarray(0, 4).toString('hex');
                    if (header === '1a45dfa3') {
                        Logger.info(`[Relay-Debug] Valid EBML Header successfully resolved in startup stream for ${sessionId}`, 'StreamingService');
                    } else {
                        Logger.warn(`[Relay-Debug] Startup stream for ${sessionId} does NOT start with EBML header (received bytes: ${header}). FFmpeg might hang waiting for a valid header!`, 'StreamingService');
                    }
                }

                session.inputStream.write(buffer);
                // Maintain rolling buffer for highlights
                highlightService.appendChunk(sessionId, buffer);
                return true;
            } catch (err: any) {
                Logger.warn(`Failed to write chunk to relay ${sessionId}: ${err.message}`, 'StreamingService');
                return false;
            }
        }
        return false;
    }
    public async generateGuestToken(sessionId: string): Promise<string> {
        const token = crypto.randomBytes(16).toString('hex');
        const key = `${this.GUEST_TOKEN_PREFIX}${token}`;
        const ttl = 2 * 60 * 60; // 2 hours
        const expiresAt = new Date(Date.now() + (ttl * 1000));

        // 1. Save to Database (Source of truth for multiple servers)
        try {
            await GuestToken.create({
                token,
                sessionId,
                expiresAt
            });
        } catch (error) {
            Logger.error(`Failed to save guest token to DB: ${error}`, 'StreamingService');
        }

        // 2. Save to Redis for high-speed cache (Optional)
        try {
            await redisService.set(key, sessionId, ttl);
        } catch (e) {
            // Redis error is fine
        }

        return token;
    }

    public async validateGuestToken(token: string): Promise<any> {
        const key = `${this.GUEST_TOKEN_PREFIX}${token}`;

        // 1. Check Redis (fast cache)
        try {
            const cachedSid = await redisService.get(key);
            if (cachedSid) return { sessionId: cachedSid };
        } catch (e) {
            // Redis miss or error
        }

        // 2. Check Database (Source of truth)
        try {
            const dbToken = await GuestToken.findOne({ token, expiresAt: { $gt: new Date() } });
            if (dbToken) {
                // Back-fill redis cache
                try { await redisService.set(key, dbToken.sessionId, 3600); } catch { }

                // Fetch host info
                const { User } = await import('../../models/User.js');
                const { UserPlatformAccount } = await import('../../models/UserPlatformAccount.js');
                const session = await StreamSessionModel.findOne({ sessionId: dbToken.sessionId });
                let hostName = 'A Host';
                let webrtc: { websocketUrl: string, appName: string } | null = null;

                if (session) {
                    const host = await User.findById(session.userId);
                    if (host) hostName = host.name;

                    // Fetch host's AMS info so guest knows where to publish
                    const amsAccount = await UserPlatformAccount.findOne({
                        userId: session.userId,
                        platform: SocialPlatform.ANT_MEDIA,
                        isActive: true
                    });

                    if (amsAccount && amsAccount.credentials?.serverUrl) {
                        const serverUrl = amsAccount.credentials.serverUrl;
                        const appName = amsAccount.credentials.appName || 'WebRTCAppEE';
                        const wsProtocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
                        const wsHost = new URL(serverUrl).host;
                        webrtc = {
                            websocketUrl: `${wsProtocol}//${wsHost}/${appName}/websocket`,
                            appName
                        };
                    }
                }

                return {
                    sessionId: dbToken.sessionId,
                    hostName,
                    webrtc
                };
            }
        } catch (error) {
            Logger.error(`DB validation error for guest token: ${error}`, 'StreamingService');
        }

        return null;
    }

    /**
     * Prepares a session before streaming starts so invites can be generated early.
     */
    public async prepareSession(userId: string, projectId?: string): Promise<string> {
        const sessionId = `stream_${Date.now()}`;
        const session: StreamSession = {
            id: sessionId,
            userId,
            projectId,
            targets: [],
            status: 'starting'
        };
        this.sessions.set(sessionId, session);

        // Register in DB so others know this session exists
        await this.syncSessionToDB(session, { mode: 'ams' });

        return sessionId;
    }

    /**
     * Stop a restreaming session and deduct credits based on duration.
     */
    public async stopRestream(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // 0. Disarm any pending encoder watchdog to prevent ghost fallback triggers
            if (session.encoderWatchdogTimer) {
                clearTimeout(session.encoderWatchdogTimer);
                session.encoderWatchdogTimer = null;
            }

            // 1. Stop the Ingest FFmpeg Process (WebRTC -> Internal RTMP)
            if (session.ffmpegProcess) {
                try {
                    // Start by sending SIGKILL to the known process wrapper
                    session.ffmpegProcess.kill('SIGKILL');
                    
                    const proc = session.ffmpegProcess.ffmpegProc;
                    const pid = proc ? proc.pid : null;

                    // On Windows, use taskkill to ensuring the entire process tree is dead (including child threads)
                    if (pid) {
                        if (process.platform === 'win32') {
                            Logger.info(`[Stop] Attempting taskkill for PID ${pid}`, 'StreamingService');
                            await new Promise<void>((resolve) => {
                                exec(`taskkill /pid ${pid} /f /t`, (err: any) => {
                                    if (err && !err.message.includes('not found') && !err.message.includes('no instance(s)')) {
                                        Logger.warn(`[Stop] taskkill error for ${sessionId}: ${err.message}`, 'StreamingService');
                                    } else {
                                        Logger.info(`[Stop] Force killed process tree for ${sessionId} (PID: ${pid})`, 'StreamingService');
                                    }
                                    resolve();
                                });
                            });
                        } else if (process.platform === 'linux' || process.platform === 'darwin') {
                            Logger.info(`[Stop] Attempting pkill for children of PID ${pid}`, 'StreamingService');
                            await new Promise<void>((resolve) => {
                                exec(`pkill -9 -P ${pid}`, (err: any) => {
                                    // pkill returns 1 if no processes matched; we can ignore that
                                    Logger.info(`[Stop] Deep kill (pkill) executed for ${sessionId}`, 'StreamingService');
                                    resolve();
                                });
                            });
                        }
                    }
                    Logger.info(`[Stop] Killed Ingest FFmpeg process for ${sessionId} (SIGKILL)`, 'StreamingService');
                } catch (e) {
                    Logger.warn(`[Stop] Failed to kill Ingest FFmpeg: ${e}`, 'StreamingService');
                }
            }

            // 2. Stop Manual FFmpeg Relay Processes (Push to YouTube/Facebook)
            if (session.relayProcesses && session.relayProcesses.length > 0) {
                Logger.info(`[Stop] Stopping ${session.relayProcesses.length} relay processes for ${sessionId}`, 'StreamingService');
                
                for (const relayProc of session.relayProcesses) {
                    try {
                        relayProc.kill('SIGKILL');
                        
                        // Deep kill on Windows
                        const pid = relayProc.ffmpegProc ? relayProc.ffmpegProc.pid : null;
                        if (pid) {
                            if (process.platform === 'win32') {
                                exec(`taskkill /pid ${pid} /f /t`, (err: any) => {
                                    if (!err) Logger.info(`[Stop] Relay process ${pid} killed via taskkill.`, 'StreamingService');
                                });
                            } else if (process.platform === 'linux' || process.platform === 'darwin') {
                                exec(`pkill -9 -P ${pid}`, (err: any) => {
                                    if (!err) Logger.info(`[Stop] Relay process ${pid} children killed via pkill.`, 'StreamingService');
                                });
                            }
                        }
                    } catch (e) {
                        Logger.warn(`[Stop] Error killing relay process: ${e}`, 'StreamingService');
                    }
                }
                session.relayProcesses = [];
            }

            // 3. Stop NMS Session (The internal RTMP session)
            try {
                // NMS session shutdown - iterate to find by id because getSession might rely on internal ID
                // NMS sessions is a Map<string, any>
                const nmsSessions = this.nms.sessions; 
                if (nmsSessions && nmsSessions.size > 0) {
                    nmsSessions.forEach((s: any, key: string) => {
                        // Check if this session matches our stream ID (often the last part of streamPath or name)
                        if (s.streamPath === `/live/${sessionId}` || s.id === sessionId || (s.id && s.id.id === sessionId)) {
                            Logger.info(`[Stop] Stopping NMS Session ${key} for stream ${sessionId}`, 'StreamingService');
                            s.stop();
                        }
                    });
                }
            } catch (e) { 
                Logger.error(`[Stop] Error clearing NMS sessions: ${e}`, 'StreamingService');
            }

            // Calculate Duration
            const endTime = new Date();
            const startTime = session.startTime || endTime;
            const durationMs = endTime.getTime() - startTime.getTime();
            const durationMinutes = Math.floor(durationMs / (1000 * 60));

            // Deduction logic...
            const creditsToDeduct = Math.max(1, Math.ceil(durationMinutes / 60));

            session.status = 'stopped';

            // Stop Autonomous Sales FSM loop if running
            try {
                liveSalesServiceV3.stopFSM(sessionId);
                Logger.info(`[Stop] Stopped Autonomous Sales FSM for session ${sessionId}`, 'StreamingService');
            } catch (err: any) {
                Logger.warn(`[Stop] Failed to stop Autonomous Sales FSM: ${err.message}`, 'StreamingService');
            }
            Logger.info(`Stopped stream ${sessionId}. Duration: ${durationMinutes} mins. Deducting ${creditsToDeduct} credits.`, 'StreamingService');

            // Broadcast stream:stopped to client room so frontend stops state immediately (Phase 96)
            const io = socketServer.getIO();
            if (io) {
                io.to(sessionId).emit('stream:stopped', { sessionId, reason: 'Stream stopped by server.' });
            }

            // Enforce Deduction
            await creditManager.deductCredits(
                session.userId,
                ServiceType.STREAMING,
                creditsToDeduct,
                `Live Broadcast: ${durationMinutes} minutes`,
                { sessionId, durationMinutes }
            );

            this.sessions.delete(sessionId);

            // Update DB Status
            await StreamSessionModel.findOneAndUpdate(
                { sessionId },
                { status: 'stopped', endTime: new Date() }
            );

            await redisService.removeSession(sessionId);
        }
    }

    private async checkAndStartAutonomousFSM(
        sessionId: string, 
        options: { autonomousMode?: boolean, influencerId?: string, productIds?: string[], language?: string }
    ) {
        if (options.autonomousMode) {
            try {
                
                const influencerId = options.influencerId || '';
                const productIds = options.productIds || [];
                const language = options.language || 'en-US';

                liveSalesServiceV3.startFSM(sessionId, influencerId, productIds, language);
                Logger.info(`🚀 [Start] Launched Autonomous Sales FSM for session ${sessionId} (Influencer: ${influencerId}, Products: ${productIds.length})`, 'StreamingService');
            } catch (err: any) {
                Logger.warn(`[Start] Failed to launch Autonomous Sales FSM: ${err.message}`, 'StreamingService');
            }
        }
    }

    public getSessionStatus(sessionId: string): StreamSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Shared persistence helper
     */
    private async syncSessionToDB(session: StreamSession, extra: any = {}) {
        try {
            const data = {
                sessionId: session.id,
                userId: session.userId,
                projectId: session.projectId,
                status: session.status,
                mode: extra.mode || 'ams',
                nodeId: this.nodeId,
                targets: session.targets.map(t => ({
                    url: t.url,
                    key: t.key,
                    platform: t.platform,
                    accountId: t.accountId,
                    externalChatId: t.externalChatId,
                    externalId: t.externalId
                })),
                startTime: session.startTime || new Date()
            };

            // 1. Save to MongoDB (Permanent truth)
            await StreamSessionModel.findOneAndUpdate(
                { sessionId: session.id },
                data,
                { upsert: true }
            );

            // 2. Save to Redis (Fast monitoring)
            await redisService.registerSession(session.id, data);
        } catch (e) {
            Logger.error(`Failed to sync session ${session.id} to distributed state: ${e}`, 'StreamingService');
        }
    }
}

export const streamingService = new StreamingService();
