import { SystemLog } from '../models/SystemLog.js';
import { emailService } from '../services/email.js';
import { alertService } from '../services/AlertService.js';
import { configService } from './configService.js';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

class LoggerClass {
    private static instance: LoggerClass;
    private levels = ['debug', 'info', 'warn', 'error'];
    private logDir: string;
    private currentLogFile: string;
    private io: Server | null = null;

    private constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.currentLogFile = path.join(this.logDir, 'antstudio-system.log');
        this.ensureLogDir();
    }

    public static getInstance(): LoggerClass {
        if (!LoggerClass.instance) {
            LoggerClass.instance = new LoggerClass();
        }
        return LoggerClass.instance;
    }

    private ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
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

            const settings = configService.logs;
            const retentionDays = settings?.retentionDays || 30;
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + retentionDays);

            const timestamp = now.toISOString();
            const messageString = typeof finalMessage === 'object' ? JSON.stringify(finalMessage) : finalMessage;
            const logString = `[${timestamp}] [${level.toUpperCase()}] [${finalSource}] ${messageString}${finalMetadata ? ' ' + JSON.stringify(finalMetadata) : ''}\n`;

            await this.rotateAndWrite(logString);

            if (level === "error") {
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
            }

            if (this.io) {
                this.io.emit('system-log', {
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

    private async rotateAndWrite(logString: string) {
        try {
            if (!fs.existsSync(this.currentLogFile)) {
                fs.writeFileSync(this.currentLogFile, '', 'utf8');
            }

            const stats = fs.statSync(this.currentLogFile);
            const today = new Date();
            const fileDate = stats.birthtime;

            if (fileDate.getDate() !== today.getDate() ||
                fileDate.getMonth() !== today.getMonth() ||
                fileDate.getFullYear() !== today.getFullYear()) {

                const mm = String(fileDate.getMonth() + 1).padStart(2, '0');
                const dd = String(fileDate.getDate()).padStart(2, '0');
                const yyyy = fileDate.getFullYear();
                const rotatedPath = path.join(this.logDir, `antstudio-system-${mm}-${dd}-${yyyy}.log`);

                fs.renameSync(this.currentLogFile, rotatedPath);
                fs.writeFileSync(this.currentLogFile, '', 'utf8');
            }

            fs.appendFileSync(this.currentLogFile, logString, 'utf8');
        } catch (err) {
            console.error('File logging error:', err);
        }
    }

    private cleanupOldLogs(retentionDays: number) {
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            const maxAge = retentionDays * 24 * 60 * 60 * 1000;

            files.forEach(file => {
                if (file === 'antstudio-system.log') return;
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                }
            });
        } catch (err) {
            console.error('Log cleanup error:', err);
        }
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
                        <a href="${process.env.PUBLIC_URL || 'http://localhost:3000'}/admin/logs" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Logs on Dashboard</a>
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
