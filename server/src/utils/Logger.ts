import { SystemLog } from '../models/SystemLog.js';
import { emailService } from '../services/system/EmailService.js';
import { alertService } from '../services/system/AlertService.js';
import { configService } from './ConfigService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Server } from 'socket.io';

export const ADMIN_LOG_ROOM = 'admin:system-logs';

class LoggerClass {
    private static instance: LoggerClass;
    private levels = ['debug', 'info', 'warn', 'error'];
    private logDir!: string;
    private currentLogFile!: string;
    private io: Server | null = null;
    // Buffered, non-blocking file output; rotated when the calendar day changes
    private logStream: fs.WriteStream | null = null;
    private logStreamDay = '';
    private lastCleanupAt = 0;
    private rotating: Promise<void> | null = null;

    private constructor() {
        this.initPaths();
    }

    public static getInstance(): LoggerClass {
        if (!LoggerClass.instance) {
            LoggerClass.instance = new LoggerClass();
        }
        return LoggerClass.instance;
    }

    private initPaths() {
        // Resolve log directory dynamically for Electron (APP_USER_DATA_PATH) and Standalone Node server
        let baseDir = process.env.APP_USER_DATA_PATH;

        if (!baseDir) {
            const resourcesPath = (process as any).resourcesPath;
            if (resourcesPath) {
                baseDir = path.join(resourcesPath, '..');
            } else {
                baseDir = process.cwd();
            }
        }

        this.logDir = path.join(baseDir, 'logs');
        this.currentLogFile = path.join(this.logDir, 'antstudio-system.log');
        this.ensureLogDir();
    }

    private ensureLogDir() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (err) {
            // Fallback to system temp directory if target directory is not writable
            try {
                this.logDir = path.join(os.tmpdir(), 'antstudio-logs');
                this.currentLogFile = path.join(this.logDir, 'antstudio-system.log');
                if (!fs.existsSync(this.logDir)) {
                    fs.mkdirSync(this.logDir, { recursive: true });
                }
            } catch (fallbackErr) {
                console.error('Failed to create log directory:', fallbackErr);
            }
        }
    }

    public setSocketServer(io: Server) {
        this.io = io;
    }

    private formatMetadata(metadata: any): any {
        if (!metadata) return null;
        
        // Handle Error objects
        if (metadata instanceof Error) {
            return {
                message: metadata.message,
                stack: metadata.stack,
                name: metadata.name
            };
        }

        // If metadata contains an Error object
        if (typeof metadata === 'object') {
            const processed: any = { ...metadata };
            for (const key in processed) {
                if (processed[key] instanceof Error) {
                    processed[key] = {
                        message: processed[key].message,
                        stack: processed[key].stack
                    };
                }
            }
            return processed;
        }

        return metadata;
    }

    public async log(
        level: 'debug' | 'info' | 'warn' | 'error',
        message: any,
        source: any = 'system',
        metadata: any = null
    ) {
        try {
            let finalMessage = message;
            let finalSource = typeof source === 'string' ? source : 'system';
            let finalMetadata = this.formatMetadata(metadata);

            // If source is an object and not a string, treat it as metadata
            if (source && typeof source === 'object') {
                const formattedSource = this.formatMetadata(source);
                if (!finalMetadata) {
                    finalMetadata = formattedSource;
                } else if (typeof finalMetadata === 'object' && typeof formattedSource === 'object') {
                    finalMetadata = { ...formattedSource, ...finalMetadata };
                }
            }

            // If message is an Error object
            if (message instanceof Error) {
                finalMessage = message.message;
                const errorMeta = { stack: message.stack, name: message.name };
                if (!finalMetadata) finalMetadata = errorMeta;
                else if (typeof finalMetadata === 'object') Object.assign(finalMetadata, errorMeta);
            }

            let settings: any = null;
            try {
                settings = configService.logs;
            } catch (e) {
                // Ignore configService read errors during early boot
            }

            const retentionDays = settings?.retentionDays || 30;
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + retentionDays);

            const timestamp = now.toISOString();
            const messageString = typeof finalMessage === 'object' ? JSON.stringify(finalMessage) : finalMessage;
            const logString = `[${timestamp}] [${level.toUpperCase()}] [${finalSource}] ${messageString}${finalMetadata ? ' ' + JSON.stringify(finalMetadata) : ''}\n`;

            await this.rotateAndWrite(logString);

            if (level === "error") {
                try {
                    const logEntry = new SystemLog({
                        level,
                        message: messageString,
                        source: finalSource,
                        metadata: finalMetadata,
                        expiresAt,
                    });
                    await logEntry.save();

                    if (settings?.emailNotificationsEnabled && settings?.notificationEmail) {
                        const minLevelIndex = this.levels.indexOf(settings.minNotificationLevel || 'error');
                        const currentLevelIndex = this.levels.indexOf(level);

                        if (currentLevelIndex >= minLevelIndex) {
                            await this.sendErrorNotification(logEntry);
                            await alertService.sendCriticalAlert(`System Error: ${messageString}`, {
                                source: finalSource,
                                metadata: finalMetadata,
                                logId: logEntry._id
                            });
                        }
                    }
                } catch (dbLogErr) {
                    // Suppress DB logging failure if database is not connected or available
                }
            }

            if (this.io) {
                // Only admins (joined to ADMIN_LOG_ROOM by SocketServer after a DB role check) receive logs
                this.io.to(ADMIN_LOG_ROOM).emit('system-log', {
                    level,
                    message: finalMessage,
                    source: finalSource,
                    metadata: finalMetadata,
                    timestamp: now
                });
            }

            const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
            const logPrefix = `[${level.toUpperCase()}] [${finalSource}]`;
            
            if (typeof finalMessage === 'object') {
                console[consoleMethod](logPrefix, finalMessage);
            } else {
                console[consoleMethod](`${logPrefix} ${finalMessage}`);
            }

            if (finalMetadata) {
                // If it's an error stack, print it prominently
                if (finalMetadata.stack) {
                    console[consoleMethod](finalMetadata.stack);
                } else if (typeof finalMetadata === 'object' && Object.keys(finalMetadata).length > 0) {
                    console[consoleMethod](finalMetadata);
                }
            }

            this.cleanupOldLogs(retentionDays);

        } catch (error) {
            console.error('Logger failed:', error);
        }
    }

    private static dayKey(date: Date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    private rotatedPathFor(dayKey: string) {
        const [yyyy, mm, dd] = dayKey.split('-');
        return path.join(this.logDir, `antstudio-system-${mm}-${dd}-${yyyy}.log`);
    }

    private openLogStream(today: string) {
        this.ensureLogDir();
        // A file left over from a previous day (e.g. after a restart) is rotated before reuse
        try {
            const stats = fs.statSync(this.currentLogFile);
            const fileDay = LoggerClass.dayKey(stats.mtime);
            if (fileDay !== today && stats.size > 0) {
                fs.renameSync(this.currentLogFile, this.rotatedPathFor(fileDay));
            }
        } catch {
            // No current file yet
        }
        this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a', encoding: 'utf8' });
        this.logStream.on('error', (err) => {
            console.error('File logging error:', err);
            this.logStream = null; // reopened on next write
        });
        this.logStreamDay = today;
    }

    private async rotateAndWrite(logString: string) {
        try {
            // Concurrent log calls wait for an in-progress rotation instead of racing it
            if (this.rotating) await this.rotating;
            const today = LoggerClass.dayKey(new Date());
            if (this.logStream && this.logStreamDay !== today) {
                const finished = this.logStream;
                const previousDay = this.logStreamDay;
                this.logStream = null;
                // Rename only after the old stream has flushed and closed its file
                this.rotating = new Promise<void>((resolve) => {
                    finished.end(() => {
                        fs.promises.rename(this.currentLogFile, this.rotatedPathFor(previousDay))
                            .catch(() => {})
                            .finally(() => resolve());
                    });
                }).finally(() => { this.rotating = null; });
                await this.rotating;
            }
            // openLogStream is synchronous, so waiters resuming after a rotation can't open twice
            if (!this.logStream) this.openLogStream(today);
            this.logStream!.write(logString);
        } catch (err) {
            console.error('File logging error:', err);
        }
    }

    private cleanupOldLogs(retentionDays: number) {
        // At most once an hour, fully async (this runs on every log call)
        const now = Date.now();
        if (now - this.lastCleanupAt < 60 * 60 * 1000) return;
        this.lastCleanupAt = now;
        const maxAge = retentionDays * 24 * 60 * 60 * 1000;

        (async () => {
            const files = await fs.promises.readdir(this.logDir);
            for (const file of files) {
                if (file === 'antstudio-system.log') continue;
                const filePath = path.join(this.logDir, file);
                const stats = await fs.promises.stat(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    await fs.promises.unlink(filePath);
                }
            }
        })().catch((err) => console.error('Log cleanup error:', err));
    }

    private async sendErrorNotification(log: any) {
        try {
            const settings = configService.logs;
            const to = settings?.notificationEmail;
            if (!to) return;

            const subject = `🚨 System Error Alert: [${log.source}]`;
            const html = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
                    <h2 style="color: #ef4444; margin-top: 0;">System Error Detected</h2>
                    <p>A new error has been logged in the system.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Timestamp:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.timestamp.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Source:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>${log.source}</code></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Message:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #ef4444;">${log.message}</td>
                        </tr>
                    </table>
                    ${log.metadata ? `
                        <div style="margin-top: 20px;">
                            <p style="font-weight: bold;">Metadata:</p>
                            <pre style="background: #f8fafc; padding: 15px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                    ` : ''}
                    <div style="margin-top: 30px;">
                        <a href="${configService.publicDomain}/admin/logs" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Logs on Dashboard</a>
                    </div>
                </div>
            `;

            await emailService.sendEmail(to, subject, html);
        } catch (error) {
            console.error('Failed to send error notification:', error);
        }
    }

    public debug(message: any, source?: any, metadata?: any) { return this.log('debug', message, source, metadata); }
    public info(message: any, source?: any, metadata?: any) { return this.log('info', message, source, metadata); }
    public warn(message: any, source?: any, metadata?: any) { return this.log('warn', message, source, metadata); }
    public error(message: any, source?: any, metadata?: any) { return this.log('error', message, source, metadata); }
}

export const Logger = LoggerClass.getInstance();
