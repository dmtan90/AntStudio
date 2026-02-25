import axios from 'axios';
import config from '../utils/config.js';

/**
 * Service for sending intelligent alerts to Slack, Telegram, or Email.
 */
export class AlertService {
    private slackWebhook?: string;
    private telegramBotToken?: string;
    private telegramChatId?: string;

    constructor() {
        this.slackWebhook = process.env.SLACK_WEBHOOK_URL;
        this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    }

    /**
     * Send a critical alert to configured channels.
     */
    async sendCriticalAlert(message: string, metadata: any = {}): Promise<void> {
        const fullMessage = `🚨 *CRITICAL ALERT: AntStudio Industrial Watchdog*\n\n*Message:* ${message}\n*Time:* ${new Date().toISOString()}\n*Environment:* ${process.env.NODE_ENV || 'development'}\n\n*Metadata:* \`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``;

        console.error(`[ALERT] ${message}`, metadata);

        const promises = [];
        if (this.slackWebhook) promises.push(this.sendToSlack(fullMessage));
        if (this.telegramBotToken && this.telegramChatId) promises.push(this.sendToTelegram(fullMessage));

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error('Failed to send alerts:', error);
        }
    }

    /**
     * Send a warning alert.
     */
    async sendWarningAlert(message: string, metadata: any = {}): Promise<void> {
        const fullMessage = `⚠️ *WARNING: AntStudio Watchdog*\n\n*Message:* ${message}\n*Metadata:* \`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``;

        console.warn(`[WARNING] ${message}`, metadata);

        if (this.slackWebhook) await this.sendToSlack(fullMessage);
        // Only send critical warnings to Telegram to avoid noise
    }

    private async sendToSlack(text: string): Promise<void> {
        if (!this.slackWebhook) return;
        try {
            await axios.post(this.slackWebhook, { text });
        } catch (error) {
            console.error('Slack alert failed:', error);
        }
    }

    private async sendToTelegram(text: string): Promise<void> {
        if (!this.telegramBotToken || !this.telegramChatId) return;
        try {
            await axios.post(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
                chat_id: this.telegramChatId,
                text: text,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Telegram alert failed:', error);
        }
    }
}

export const alertService = new AlertService();
