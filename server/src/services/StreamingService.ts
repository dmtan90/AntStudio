import ffmpeg from 'fluent-ffmpeg';
/* @ts-ignore */
import { systemLogger } from '../utils/systemLogger.js';
import path from 'path';
import { User } from '../models/User.js';
import { creditManager } from '../utils/CreditManager.js';

// Set FFmpeg path to your discovered binary
const FFMPEG_BIN = 'D:\\Tools\\vanthe_video\\bin\\ffmpeg.exe';
ffmpeg.setFfmpegPath(FFMPEG_BIN);

export interface StreamTarget {
    url: string;      // RTMP Base URL
    key: string;      // Stream Key
    platform: string; // e.g. "youtube"
}

export interface StreamSession {
    id: string;
    userId: string;
    targets: StreamTarget[];
    status: 'starting' | 'live' | 'stopped' | 'error';
    startTime?: Date;
    ffmpegProcess?: any;
    guestTokens: string[];
}

export class StreamingService {
    private sessions: Map<string, StreamSession> = new Map();
    private guestTokensMap: Map<string, { sessionId: string, role: string }> = new Map();

    /**
     * Generate a guest invite token for a session
     */
    public generateGuestToken(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        const token = `guest_${Math.random().toString(36).substring(2, 11)}`;
        this.guestTokensMap.set(token, { sessionId, role: 'participant' });
        session.guestTokens.push(token);

        systemLogger.info(`Generated guest token ${token} for session ${sessionId}`, 'StreamingService');
        return token;
    }

    /**
     * Validate guest token
     */
    public validateGuestToken(token: string): { sessionId: string, role: string } | null {
        return this.guestTokensMap.get(token) || null;
    }

    /**
     * Start a restreaming session
     * @param source - Incoming stream URL or local file path
     * @param targets - Array of RTMP destinations
     * @param options - Additional settings (loop, etc.)
     */
    public async startRestream(userId: string, source: string, targets: StreamTarget[], options: { loop?: boolean } = {}): Promise<string> {
        const sessionId = `stream_${Date.now()}`;

        systemLogger.info(`Starting restream for user ${userId} to ${targets.length} targets (Loop: ${options.loop})`, 'StreamingService');

        // 0. Credit Check (Must have at least 1 credit to start)
        const user = await User.findById(userId);
        if (!user || user.credits.balance < 1) {
            throw new Error('Insufficient credits to start broadcast. Minimum 1 credit required.');
        }

        const session: StreamSession = {
            id: sessionId,
            userId,
            targets,
            status: 'starting',
            guestTokens: []
        };

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

            // Multiplexing logic: Send to all RTMP targets
            // In FFmpeg, this is usually done via tee muxer: [f=flv]rtmp1|[f=flv]rtmp2
            const rtmpUrls = targets.map(t => `[f=flv]${t.url}/${t.key}`).join('|');
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
            return sessionId;

        } catch (error: any) {
            systemLogger.error(`Failed to initialize stream: ${error.message}`, 'StreamingService');
            throw error;
        }
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
