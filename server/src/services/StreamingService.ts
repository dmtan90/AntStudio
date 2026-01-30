import ffmpeg from 'fluent-ffmpeg';
/* @ts-ignore */
import { systemLogger } from '../utils/systemLogger.js';
import path from 'path';
import { PassThrough } from 'stream';
import { User } from '../models/User.js';
import { creditManager } from '../utils/CreditManager.js';

// Set FFmpeg path to your discovered binary
const FFMPEG_BIN = 'D:\\Tools\\vanthe_video\\bin\\ffmpeg.exe';
ffmpeg.setFfmpegPath(FFMPEG_BIN);

import axios from 'axios';
import crypto from 'crypto';
import { UserPlatformAccount, SocialPlatform } from '../models/UserPlatformAccount.js';

export interface StreamTarget {
    url: string;      // RTMP Base URL
    key: string;      // Stream Key
    platform: string; // e.g. "youtube"
    accountId?: string;
}

// Finalized targets
export interface StreamSession {
    id: string;
    userId: string;
    targets: StreamTarget[];
    status: 'starting' | 'live' | 'error' | 'stopped';
    startTime?: Date;
    ffmpegProcess?: any;
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
    private guestTokens: Map<string, string> = new Map(); // token -> sessionId

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
                    systemLogger.warn(` Failed to add AMS RTMP endpoint for ${target.platform}: ${err.message}`, 'StreamingService');
                });
            }

            systemLogger.info(`Configured AMS ${streamId} to restream to ${externalTargets.length} endpoints`, 'StreamingService');

        } catch (error: any) {
            systemLogger.error(`AMS Restream Setup Error: ${error.message}`, 'StreamingService');
            // Fallback: Do not fail, just log. System will just stream to AMS and fail to restream.
        }
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
        options: { loop?: boolean, quality?: any } = {}
    ): Promise<{ sessionId: string, mode: string }> {
        const sessionId = `stream_${Date.now()}`;

        systemLogger.info(`Starting restream for user ${userId} to ${targets.length} targets (Loop: ${options.loop})`, 'StreamingService');

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
            systemLogger.info('AMS detected. Offloading restreaming responsibility to AMS.', 'StreamingService');
            await this.setupAMSRestream(amsTarget, externalTargets);
            finalTargets = [amsTarget]; // FFmpeg only streams to AMS
        }

        const session: StreamSession = {
            id: sessionId,
            userId,
            targets: finalTargets,
            status: source === 'webrtc' ? 'live' : 'starting',
            startTime: source === 'webrtc' ? new Date() : undefined,
            guestTokens: []
        };

        if (source === 'webrtc') {
            if (amsTarget) {
                this.sessions.set(sessionId, session);
                systemLogger.info(`WebRTC session ${sessionId} initialized using AMS Bridge. Browser handles ingest.`, 'StreamingService');
                return { sessionId, mode: 'webrtc_ams' };
            } else {
                // Fallback: Use backend relay (WebRTC-to-RTMP)
                // This initializes FFmpeg to expect a piped input from the browser
                const session: StreamSession = {
                    id: sessionId,
                    userId,
                    targets: finalTargets,
                    status: source === 'webrtc' ? 'live' : 'starting',
                    startTime: source === 'webrtc' ? new Date() : undefined,
                    guestTokens: [],
                    config: options.quality
                };

                this.initRelayFFmpeg(sessionId, session, externalTargets);
                this.sessions.set(sessionId, session);
                systemLogger.info(`WebRTC session ${sessionId} initialized with BACKEND RELAY bridge.`, 'StreamingService');

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

            command.on('start', (cmd: string) => {
                systemLogger.info(`FFmpeg process started: ${cmd}`, 'StreamingService');
                session.status = 'live';
                session.startTime = new Date();
            });

            command.on('error', (err: Error) => {
                systemLogger.error(`FFmpeg streaming error: ${err.message}`, 'StreamingService');
                session.status = 'error';
                this.stopRestream(sessionId);
            });

            command.on('end', () => {
                systemLogger.info(`FFmpeg stream ended: ${sessionId}`, 'StreamingService');
                session.status = 'stopped';
            });

            const process = command.run();
            session.ffmpegProcess = process;

            this.sessions.set(sessionId, session);
            return { sessionId, mode: 'file_relay' };

        } catch (error: any) {
            systemLogger.error(`Failed to initialize stream: ${error.message}`, 'StreamingService');
            throw error;
        }
    }

    /**
     * Initialize FFmpeg for WebSocket ingestion (Internal Relay)
     */
    private initRelayFFmpeg(sessionId: string, session: StreamSession, targets: StreamTarget[]) {
        const rtmpUrls = targets.map(t => `[f=flv]${t.url}/${t.key}`).join('|');
        const teeOutput = `tee:${rtmpUrls}`;

        // Create a PassThrough stream to act as the ingest pipe
        session.inputStream = new PassThrough();

        const config = session.config || {
            width: 1280,
            height: 720,
            videoBitrate: 2500,
            audioBitrate: 128,
            fps: 30
        };

        systemLogger.info(`[Relay-Config] Session ${sessionId} Quality: ${config.width}x${config.height} @ ${config.videoBitrate}kbps`, 'StreamingService');

        const command = ffmpeg(session.inputStream)
            .inputOptions([
                '-analyzeduration 1000000',
                '-probesize 1000000',
                '-fflags +genpts+igndts',     // Generate PTS, ignore input DTS
                '-avoid_negative_ts make_zero', // Shift timestamps to start at 0
                '-max_delay 0'                  // Minimize muxing delay for live
            ])
            .inputFormat('webm')
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-f flv',
                '-preset ultrafast',
                '-tune zerolatency',
                '-flags +global_header',
                '-pix_fmt yuv420p',
                `-vf scale=${config.width}:-2`,
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
                '-vsync cfr'                   // Constant frame rate (duplicate/drop frames as needed)
            ])
            .output(teeOutput);

        command.on('start', (cmd: string) => {
            systemLogger.info(`Relay FFmpeg process started: ${cmd}`, 'StreamingService');
            session.startTime = new Date();
        });

        command.on('stderr', (line: string) => {
            // Log ALL messages from FFmpeg for debugging for now
            systemLogger.info(`[Relay-Debug] ${line.trim()}`, 'StreamingService');
        });

        command.on('error', (err: Error) => {
            systemLogger.error(`Relay FFmpeg error: ${err.message}`, 'StreamingService');
            session.status = 'error';
            this.emit('session:stopped', { sessionId, reason: err.message, status: 'error' });
            this.stopRestream(sessionId);
        });

        command.on('end', () => {
            systemLogger.info(`Relay FFmpeg stream ended: ${sessionId}`, 'StreamingService');
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
                session.inputStream.write(buffer);
            } catch (err: any) {
                systemLogger.warn(`Failed to write chunk to relay ${sessionId}: ${err.message}`, 'StreamingService');
            }
        }
    }
    public generateGuestToken(sessionId: string): string {
        const token = crypto.randomBytes(16).toString('hex');
        this.guestTokens.set(token, sessionId);

        // Auto-expire token after 2 hours
        setTimeout(() => this.guestTokens.delete(token), 2 * 60 * 60 * 1000);

        return token;
    }

    public validateGuestToken(token: string): { sessionId: string } | null {
        const sessionId = this.guestTokens.get(token);
        if (!sessionId) return null;
        return { sessionId };
    }

    /**
     * Stop a restreaming session and deduct credits based on duration.
     */
    public async stopRestream(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session && session.ffmpegProcess) {
            // Calculate Duration
            const endTime = new Date();
            const startTime = session.startTime || endTime;
            const durationMs = endTime.getTime() - startTime.getTime();
            const durationMinutes = Math.floor(durationMs / (1000 * 60));

            // Deduction: 1 Credit per 60 minutes (Minimum 1 credit)
            const creditsToDeduct = Math.max(1, Math.ceil(durationMinutes / 60));

            session.ffmpegProcess.kill('SIGKILL');
            session.status = 'stopped';

            systemLogger.info(`Stopped stream ${sessionId}. Duration: ${durationMinutes} mins. Deducting ${creditsToDeduct} credits.`, 'StreamingService');

            // Enforce Deduction
            await creditManager.deductCredits(
                session.userId,
                'streaming',
                creditsToDeduct,
                `Live Broadcast: ${durationMinutes} minutes`,
                { sessionId, durationMinutes }
            );

            this.sessions.delete(sessionId);
        }
    }

    public getSessionStatus(sessionId: string): StreamSession | undefined {
        return this.sessions.get(sessionId);
    }
}

export const streamingService = new StreamingService();
