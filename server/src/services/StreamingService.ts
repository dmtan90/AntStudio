import ffmpeg from 'fluent-ffmpeg';
/* @ts-ignore */
import NodeMediaServer from 'node-media-server';
/* @ts-ignore */
import { Logger } from '../utils/Logger.js';
import path from 'path';
import { PassThrough } from 'stream';
import { exec } from 'child_process';
import { User } from '../models/User.js';
import { GuestToken } from '../models/GuestToken.js';
import { StreamSessionModel } from '../models/StreamSession.js';
import { config } from '../utils/config.js';
import { creditManager } from '../utils/CreditManager.js';

// Set FFmpeg path from config
ffmpeg.setFfmpegPath(config.ffmpegPath);
const FFMPEG_BIN = config.ffmpegPath;

import axios from 'axios';
import crypto from 'crypto';
import { UserPlatformAccount, SocialPlatform } from '../models/UserPlatformAccount.js';
import { highlightService } from './HighlightService.js';
import { redisService } from './RedisService.js';
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
                        edge: 'rtmp://127.0.0.1/live',
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
                    if (session.targets && session.targets.length > 0) {
                        Logger.info(`[NMS-Relay] Stream detected for session ${sessionId}. Starting DIRECT FFmpeg push to ${session.targets.length} targets.`, 'StreamingService', JSON.stringify(session.targets));
                        
                        // Initialize relay array if needed
                        if (!session.relayProcesses) {
                            session.relayProcesses = [];
                        }

                        // Local Input URL (RTMP Loopback)
                        const inputUrl = `rtmp://127.0.0.1:${RTMP_PORT}${cleanPath}`;

                        session.targets.forEach((target, index) => {
                            const remoteUrl = `${target.url}/${target.key}`;
                            Logger.info(`[NMS-Relay] Spawning Relay Process ${index + 1}: ${sessionId} -> ${target.platform}`, 'StreamingService');
                            
                            // Spawn separate FFmpeg process for each target
                            // Logic: Read from local RTMP -> Copy Codec -> Push to Remote RTMP
                            const relayCommand = ffmpeg(inputUrl)
                                .inputOptions([
                                    '-f flv'
                                ])
                                .outputOptions([
                                    '-c copy', // Pass-through video/audio (very low CPU)
                                    '-f flv'
                                ])
                                .output(remoteUrl)
                                .on('start', (cmdLine: any) => {
                                    Logger.info(`[NMS-Relay] Relay started for ${target.platform}: ${cmdLine}`, 'StreamingService');
                                })
                                .on('error', (err: any, stdout: any, stderr: any) => {
                                    // Only log real errors, not kill signals
                                    if (err.message && !err.message.includes('SIGKILL') && !err.message.includes('exited with code 1')) {
                                        Logger.error(`[NMS-Relay] Error relaying to ${target.platform}: ${err.message}`, 'StreamingService');
                                        Logger.debug(`[NMS-Relay] Stderr: ${stderr}`, 'StreamingService');
                                    } else {
                                        Logger.info(`[NMS-Relay] Relay to ${target.platform} stopped normally.`, 'StreamingService');
                                    }
                                })
                                .on('end', () => {
                                    Logger.info(`[NMS-Relay] Relay to ${target.platform} finished.`, 'StreamingService');
                                });

                            // Execute and track
                            relayCommand.run();
                            session.relayProcesses?.push(relayCommand);
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
    private async setupAMSRestream(amsTarget: StreamTarget, externalTargets: StreamTarget[]) {
        try {
            const account = await UserPlatformAccount.findById(amsTarget.accountId);
            if (!account) return;

            const cookie = await this.getAMSCookie(account.credentials);
            const baseUrl = account.credentials.serverUrl!.replace(/\/$/, '');
            const appName = account.credentials.appName || 'LiveApp';
            const streamId = amsTarget.key;

            // Add each external target as an endpoint to AMS
            for (const target of externalTargets) {
                const rtmpUrl = `${target.url}/${target.key}`;
                // Correct Endpoint: /rtmp-endpoint (as per AMS 2.x docs)
                await axios.post(`${baseUrl}/${appName}/rest/v2/broadcasts/${streamId}/rtmp-endpoint`, {
                    rtmpUrl,
                    endpointServiceId: target.platform
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: cookie
                    }
                }).catch(err => {
                    Logger.warn(` Failed to add AMS RTMP endpoint for ${target.platform}: ${err.message}`, 'StreamingService');
                });
            }

            Logger.info(`Configured AMS ${streamId} to restream to ${externalTargets.length} endpoints`, 'StreamingService');

        } catch (error: any) {
            Logger.error(`AMS Restream Setup Error: ${error.message}`, 'StreamingService');
            // Fallback: Do not fail, just log. System will just stream to AMS and fail to restream.
        }
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
                } else if (hasIntel) {
                    codec = 'h264_qsv';
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
        options: { loop?: boolean, quality?: any, sessionId?: string, projectId?: string } = {}
    ): Promise<{ sessionId: string, mode: string }> {
        const sessionId = options.sessionId || `stream_${Date.now()}`;

        Logger.info(`Starting restream for user ${userId} to ${targets.length} targets (Loop: ${options.loop})`, 'StreamingService');

        // 0. Credit Check (Must have at least 1 credit to start)
        const user = await User.findById(userId);
        if (!user || user.credits.balance < 1) {
            throw new Error('Insufficient credits to start broadcast. Minimum 1 credit required.');
        }

        // AMS Offloading Check
        const amsTarget = targets.find(t => t.platform === SocialPlatform.ANT_MEDIA);
        const externalTargets = targets.filter(t => t.platform !== SocialPlatform.ANT_MEDIA);

        let finalTargets = targets;

        // If we have an AMS target and external targets, let AMS handle the distribution
        if (amsTarget && externalTargets.length > 0) {
            Logger.info('AMS detected. Offloading restreaming responsibility to AMS.', 'StreamingService');
            await this.setupAMSRestream(amsTarget, externalTargets);
            finalTargets = [amsTarget]; // FFmpeg only streams to AMS
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
                    inputStream: new PassThrough() // Create early to buffer ingest chunks
                };

                // CRITICAL: Register session BEFORE awaiting initRelayFFmpeg
                // so ingestRelayChunk can start writing to the buffer immediately
                this.sessions.set(sessionId, relaySession);

                await this.initRelayFFmpeg(sessionId, relaySession, externalTargets);

                this.syncSessionToDB(relaySession, { mode: 'webrtc_relay' }).catch(() => { });

                Logger.info(`WebRTC session ${sessionId} initialized with BACKEND RELAY bridge.`, 'StreamingService');

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
    private async initRelayFFmpeg(sessionId: string, session: StreamSession, targets: StreamTarget[]) {
        // Use existing inputStream if already created (to preserve buffered chunks)
        if (!session.inputStream) {
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
        const localRtmpUrl = `rtmp://127.0.0.1/live/${sessionId}`;

        // Hardware Acceleration Check (Phase 92) - Cross Platform & Hardware Aware
        const videoCodec = await this.getOptimalVideoCodec();

        const outputOptions = [
            '-f flv',
            '-tune zerolatency',
            '-flags +global_header',
            '-max_interleave_delta 0',
            '-max_muxing_queue_size 1024',
            // Enforce yuv420p pixel format for RTMP compatibility (fixes nv12 issues with QSV/NVENC)
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

        command.on('start', (cmd: string) => {
            Logger.info(`Relay FFmpeg process started: ${cmd}`, 'StreamingService');
            session.startTime = new Date();
        });

        command.on('stderr', (line: string) => {
            // Log ALL messages from FFmpeg for debugging for now
            const lineString = line.trim();
            if(!lineString.startsWith('frame=')){
                Logger.info(`[Relay-Debug] ${lineString}`, 'StreamingService');
            }
        });

        command.on('error', (err: Error) => {
            Logger.error(`Relay FFmpeg error: ${err.message}`, 'StreamingService');
            session.status = 'error';
            this.emit('session:stopped', { sessionId, reason: err.message, status: 'error' });
            this.stopRestream(sessionId);
        });

        command.on('end', () => {
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
    public ingestRelayChunk(sessionId: string, chunk: any) {
        const session = this.sessions.get(sessionId);
        if (session && session.inputStream) {
            try {
                // Ensure we have a proper Node.js Buffer
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                
                // Debug WebM Header presence
                if (buffer.length >= 4) {
                    const header = buffer.subarray(0, 4).toString('hex');
                    if (header === '1a45dfa3') {
                        Logger.info(`[Relay-Debug] Valid EBML Header found in chunk for ${sessionId}`, 'StreamingService');
                    } else {
                        // Only log if it's the very first chunk we are receiving
                        if (!session.startTime) {
                             Logger.warn(`[Relay-Debug] Chunk for ${sessionId} does NO START with EBML header: ${header}`, 'StreamingService');
                        }
                    }
                }

                session.inputStream.write(buffer);
                // Maintain rolling buffer for highlights
                highlightService.appendChunk(sessionId, buffer);
            } catch (err: any) {
                Logger.warn(`Failed to write chunk to relay ${sessionId}: ${err.message}`, 'StreamingService');
            }
        }
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
                const { User } = await import('../models/User.js');
                const { UserPlatformAccount } = await import('../models/UserPlatformAccount.js');
                const session = await StreamSessionModel.findOne({ sessionId: dbToken.sessionId });
                let hostName = 'A Host';
                let webrtc: { websocketUrl: string, appName: string } | null = null;

                if (session) {
                    const host = await User.findById(session.userId);
                    if (host) hostName = host.name;

                    // Fetch host's AMS info so guest knows where to publish
                    const amsAccount = await UserPlatformAccount.findOne({
                        userId: session.userId,
                        platform: 'ant_media',
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
            Logger.info(`Stopped stream ${sessionId}. Duration: ${durationMinutes} mins. Deducting ${creditsToDeduct} credits.`, 'StreamingService');

            // Enforce Deduction
            await creditManager.deductCredits(
                session.userId,
                'streaming',
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
