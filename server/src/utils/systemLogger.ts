import { SystemLog } from '../models/SystemLog.js';
import { emailService } from '../services/email.js';
import { alertService } from '../services/AlertService.js';
import { configService } from './configService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SystemLogger {
    private static instance: SystemLogger;
    private levels = ['debug', 'info', 'warn', 'error'];
    private logDir: string;
    private currentLogFile: string;
    private io: Server | null = null;

    private constructor() {
        this.logDir = path.join(__dirname, '../../logs');
        this.currentLogFile = path.join(this.logDir, 'antstudio-system.log');
        this.ensureLogDir();
    }

    public static getInstance(): SystemLogger {
        if (!SystemLogger.instance) {
            SystemLogger.instance = new SystemLogger();
        }
        return SystemLogger.instance;
    }

    private ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Set Socket.IO instance for real-time streaming
     */
    public setSocketServer(io: Server) {
        this.io = io;
    }

    /**
     * Core logging method
     */
    public async log(
        level: 'debug' | 'info' | 'warn' | 'error',
        message: string,
        source: string = 'system',
        metadata: any = null
    ) {
        try {
            const settings = configService.logs;
            const retentionDays = settings?.retentionDays || 30;
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + retentionDays);

            const timestamp = now.toISOString();
            const logString = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}${metadata ? ' ' + JSON.stringify(metadata) : ''}\n`;

            // 1. Write to File (Daily Rotation)
            await this.rotateAndWrite(logString);

            // 2. Persist to Database (Errors only)
            if (level === "error") {
                const logEntry = new SystemLog({
                    level,
                    message,
                    source,
                    metadata,
                    timestamp: now,
                    expiresAt
                });
                await logEntry.save();

                // Check Email Notification Rules
                if (settings?.emailNotificationsEnabled && settings?.notificationEmail) {
                    const minLevelIndex = this.levels.indexOf(settings.minNotificationLevel || 'error');
                    const currentLevelIndex = this.levels.indexOf(level);

                    if (currentLevelIndex >= minLevelIndex) {
                        await this.sendErrorNotification(logEntry);
                        // Also send to AlertService (Slack/Telegram)
                        await alertService.sendCriticalAlert(`System Error: ${message}`, {
                            source,
                            metadata,
                            logId: logEntry._id
                        });
                    }
                }
            }

            // 3. WebSocket Emission (Real-time Monitoring)
            if (this.io) {
                this.io.emit('system-log', {
                    level,
                    message,
                    source,
                    metadata,
                    timestamp: now
                });
            }

            // 4. Fallback to console for visibility in standard logs
            const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[${level.toUpperCase()}] [${source}] ${message}`);

            // 5. Cleanup old files
            this.cleanupOldLogs(retentionDays);

        } catch (error) {
            // Fail silent to prevent logging loops, but output to console
            console.error('SystemLogger failed:', error);
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

            // Simple check: if birthtime is not today, rotate
            // Note: birthtime might be updated by fs.rename depending on OS, but usually correct for new files
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

    // Sugar methods
    public debug(message: string, source?: string, metadata?: any) { return this.log('debug', message, source, metadata); }
    public info(message: string, source?: string, metadata?: any) { return this.log('info', message, source, metadata); }
    public warn(message: string, source?: string, metadata?: any) { return this.log('warn', message, source, metadata); }
    public error(message: string, source?: string, metadata?: any) { return this.log('error', message, source, metadata); }
}

export const systemLogger = SystemLogger.getInstance();
