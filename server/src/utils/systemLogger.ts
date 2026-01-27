import { SystemLog } from '../models/SystemLog.js';
import { emailService } from '../services/email.js';
import { alertService } from '../services/AlertService.js';
import { configService } from './configService.js';

export class SystemLogger {
    private static instance: SystemLogger;
    private levels = ['debug', 'info', 'warn', 'error'];

    private constructor() { }

    public static getInstance(): SystemLogger {
        if (!SystemLogger.instance) {
            SystemLogger.instance = new SystemLogger();
        }
        return SystemLogger.instance;
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
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + retentionDays);

            // 1. Persist to Database
            const logEntry = await SystemLog.create({
                level,
                message,
                source,
                metadata,
                timestamp: new Date(),
                expiresAt
            });

            // 2. Check Email Notification Rules
            if (settings?.emailNotificationsEnabled && settings?.notificationEmail) {
                const minLevelIndex = this.levels.indexOf(settings.minNotificationLevel || 'error');
                const currentLevelIndex = this.levels.indexOf(level);

                if (currentLevelIndex >= minLevelIndex && level === 'error') {
                    await this.sendErrorNotification(logEntry);
                    // Also send to AlertService (Slack/Telegram)
                    await alertService.sendCriticalAlert(`System Error: ${message}`, {
                        source,
                        metadata,
                        logId: logEntry._id
                    });
                }
            }

            // 3. Fallback to console for visibility in standard logs
            const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[${level.toUpperCase()}] [${source}] ${message}`);

            return logEntry;
        } catch (error) {
            // Fail silent to prevent logging loops, but output to console
            console.error('SystemLogger failed:', error);
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
