import schedule from 'node-schedule';
import { License } from '../models/License.js';
import { emailService } from './email.js';
import config from '../utils/config.js';
import { Logger } from '../utils/Logger.js';

export class NotificationWorker {
    /**
     * Start the automated expiry alert scheduler (Master Mode Only).
     */
    static startScheduler() {
        if (config.systemMode !== 'master') return;

        // Run daily at 09:00 AM
        schedule.scheduleJob('0 9 * * *', async () => {
            Logger.info('📧 NotificationWorker: Scanning for expiring licenses...');
            await this.processExpiryAlerts();
        });
    }

    private static async processExpiryAlerts() {
        try {
            const warningThreshold = new Date();
            warningThreshold.setDate(warningThreshold.getDate() + 7); // 7 days ahead

            const expiringLicenses = await License.find({
                status: 'valid',
                endDate: { $lte: warningThreshold, $gte: new Date() }
            });

            for (const lic of expiringLicenses) {
                // Check if we already sent a warning recently (optional logic, omitted for brevity)
                await emailService.sendEmail({
                    to: lic.owner,
                    subject: 'Action Required: AntStudio License Expiry Imminent',
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #d32f2f;">License Expiry Warning</h2>
                            <p>Your AntStudio license <strong>${lic.key}</strong> is scheduled to expire on <strong>${lic.endDate.toLocaleDateString()}</strong>.</p>
                            <p>To avoid interruption to your production fleet, please renew your subscription immediately via the License Hub.</p>
                            <br>
                            <a href="${config.public.baseUrl}/license-portal" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Now</a>
                        </div>
                    `
                });
                Logger.info(`📧 Alert dispatched to ${lic.owner}`);
            }
        } catch (error: any) {
            Logger.error(`📧 NotificationWorker Failure: ${error.message}`);
        }
    }
}
