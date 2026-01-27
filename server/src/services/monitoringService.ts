import si from 'systeminformation';
import { SystemMetric } from '../models/SystemMetric.js';
import { systemLogger } from '../utils/systemLogger.js';
import { ClientLog } from '../models/ClientLog.js';
import { SystemLog } from '../models/SystemLog.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { emailService } from './email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MonitoringService {
    private static instance: MonitoringService;
    private collectionInterval: any = null;

    private constructor() { }

    public static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    /**
     * Start the background metric collection task
     */
    public startMonitoring(intervalMs: number = 60000) {
        if (this.collectionInterval) return;

        console.log(`[Monitoring] Starting metric collection every ${intervalMs / 1000}s...`);
        this.collectionInterval = setInterval(() => this.collectAndSaveMetrics(), intervalMs);

        // Immediate first run
        this.collectAndSaveMetrics();
    }

    /**
     * Stop the monitoring task
     */
    public stopMonitoring() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
    }

    /**
     * Gather current system stats
     */
    public async getRealtimeStats() {
        try {
            const [cpu, mem, disk, net] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize(),
                si.networkStats()
            ]);

            // For disk, get the main root or largest partition
            const rootDisk = disk.find((d: any) => d.mount === '/') || disk[0];

            // For network, aggregate or pick primary
            const primaryNet = net[0];

            return {
                cpuUsage: Math.round(cpu.currentLoad),
                memory: {
                    total: mem.total,
                    used: mem.active,
                    free: mem.available
                },
                disk: {
                    total: rootDisk?.size || 0,
                    used: rootDisk?.used || 0
                },
                network: {
                    tx_bytes: primaryNet?.tx_bytes || 0,
                    rx_bytes: primaryNet?.rx_bytes || 0,
                    tx_sec: primaryNet?.tx_sec || 0,
                    rx_sec: primaryNet?.rx_sec || 0
                },
                timestamp: new Date()
            };
        } catch (error: any) {
            console.error('[Monitoring] Failed to get realtime stats:', error.message);
            return null;
        }
    }

    /**
     * Collect and persist a metric snapshot
     */
    private async collectAndSaveMetrics() {
        try {
            const stats = await this.getRealtimeStats();
            if (stats) {
                await SystemMetric.create(stats);
            }
        } catch (error: any) {
            systemLogger.error(`Metric collection failed: ${error.message}`, 'MonitoringService');
        }
    }

    public async getHistory(limit: number = 60) {
        return await SystemMetric.find()
            .sort({ timestamp: -1 })
            .limit(limit);
    }

    /**
     * Packages system and client logs into a ZIP file and sends to developer email.
     */
    public async exportAndEmailDiagnostics(developerEmail: string = 'dmtan90@gmail.com') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const bundleDir = path.join(__dirname, '../../tmp/diagnostics');
        const zipPath = path.join(bundleDir, `diagnostics-${timestamp}.zip`);

        if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir, { recursive: true });

        // 1. Fetch Logs
        const [sysLogs, clientLogs] = await Promise.all([
            SystemLog.find().sort({ timestamp: -1 }).limit(1000),
            ClientLog.find().sort({ timestamp: -1 }).limit(1000)
        ]);

        // 2. Format as TXT
        const sysTxt = sysLogs.map(l => `[${l.timestamp.toISOString()}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join('\n');
        const clientTxt = clientLogs.map(l => `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] [${l.url}] ${JSON.stringify(l.details)}`).join('\n');

        // 3. Create ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise<void>((resolve, reject) => {
            output.on('close', async () => {
                try {
                    // 4. Send Email
                    await emailService.sendEmail({
                        to: developerEmail,
                        subject: `🔍 AntStudio Diagnostic Bundle - ${timestamp}`,
                        text: `Attached is the diagnostic bundle for AntStudio.\n\nSystem Logs: ${sysLogs.length}\nClient Logs: ${clientLogs.length}`,
                        attachments: [{
                            filename: `diagnostics-${timestamp}.zip`,
                            path: zipPath
                        }]
                    });

                    // 5. Cleanup
                    fs.unlinkSync(zipPath);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            archive.on('error', (err: any) => reject(err));
            archive.pipe(output);
            archive.append(sysTxt, { name: 'system_logs.txt' });
            archive.append(clientTxt, { name: 'client_logs.txt' });
            archive.finalize();
        });
    }
}

export const monitoringService = MonitoringService.getInstance();
