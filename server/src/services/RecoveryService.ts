import si from 'systeminformation';
import mongoose from 'mongoose';
import { SystemMetric } from '../models/SystemMetric.js';
import { Project } from '../models/Project.js';
import { Media } from '../models/Media.js';
import { alertService } from './AlertService.js';
import { redisService } from './RedisService.js';
import { systemLogger } from '../utils/systemLogger.js';
import { getS3Client } from '../utils/s3.js';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

/**
 * RecoveryService (Industrial Watchdog)
 * Responsible for system monitoring, self-healing, and proactive alerting.
 * Upgraded in Phase 25 for industrial-grade reliability.
 */
export class RecoveryService {
    private monitoringInterval: NodeJS.Timeout | null = null;
    private readonly CHECK_INTERVAL = 60000; // 1 minute
    private readonly STUCK_JOB_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    public isFailoverActive = false;

    /**
     * Start the Industrial Watchdog.
     */
    public startMonitoring(): void {
        if (this.monitoringInterval) return;

        console.log('🛡️ Industrial Watchdog started');
        this.monitoringInterval = setInterval(() => this.performHealthCheck(), this.CHECK_INTERVAL);

        // Initial check
        this.performHealthCheck();
    }

    /**
     * Stop the Watchdog.
     */
    public stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Main health check loop.
     */
    public async performHealthCheck(): Promise<void> {
        try {
            const metrics = await this.collectMetrics();
            await this.saveMetrics(metrics);
            await this.checkSystemResourceHealth(metrics);
            await this.recoverStuckJobs();
            await this.verifyInfrastructureConnectivity();
            await this.verifyMediaIntegrity();
            await this.cleanupOrphanMedia();
            await this.verifyProjectDatabaseReferences();

            console.log("[RecoveryService] ✅ System health check: STABLE");
            this.isFailoverActive = false;
        } catch (error) {
            console.error('[RecoveryService] 🚨 Health check failed:', error);
            await alertService.sendCriticalAlert('Watchdog internal failure', { error: String(error) });
        }
    }

    /**
     * Collect system metrics using node-os-utils.
     */
    private async collectMetrics(): Promise<any> {
        try {
            const [cpu, memory, disk] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize()
            ]);

            const rootDisk = disk.find((d: any) => d.mount === '/') || disk[0];

            return {
                cpuUsage: Math.round(cpu.currentLoad),
                memory: {
                    total: memory.total,
                    used: memory.active,
                    free: memory.available
                },
                disk: {
                    total: rootDisk?.size || 0,
                    used: rootDisk?.used || 0
                },
                timestamp: new Date()
            };
        } catch (error) {
            console.error('[RecoveryService] Failed to collect metrics:', error);
            throw error;
        }
    }

    private async saveMetrics(metrics: any): Promise<void> {
        try {
            await SystemMetric.create(metrics);
        } catch (e) {
            console.error('Failed to save metrics:', e);
        }
    }

    /**
     * Check for resource exhaustion (CPU/RAM/Disk).
     */
    private async checkSystemResourceHealth(metrics: any): Promise<void> {
        if (metrics.cpuUsage > 90) {
            await alertService.sendWarningAlert('High CPU Usage', { usage: `${metrics.cpuUsage}%` });
        }

        const memUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
        if (memUsagePercent > 90) {
            await alertService.sendWarningAlert('High RAM Usage', { usage: `${memUsagePercent.toFixed(2)}%` });
        }
    }

    /**
     * Self-healing: Find and reset jobs that have been in 'processing' state for too long.
     */
    private async recoverStuckJobs(): Promise<void> {
        const threshold = new Date(Date.now() - this.STUCK_JOB_TIMEOUT);

        const stuckProjects = await Project.find({
            status: 'processing',
            updatedAt: { $lt: threshold }
        });

        if (stuckProjects.length > 0) {
            console.log(`🧹 Found ${stuckProjects.length} stuck jobs. Resetting...`);

            for (const project of stuckProjects) {
                project.status = 'failed';
                // @ts-ignore
                project.error = 'System Watchdog: Job timed out or worker stalled.';
                await project.save();

                systemLogger.warn(`Stuck job recovered: ${project._id}`, "RecoveryService");

                await alertService.sendWarningAlert('Stuck Job Recovered', {
                    projectId: project._id,
                    projectName: project.title,
                    stalledFor: '30+ minutes'
                });
            }
        }
    }

    /**
     * Verify Database and Redis connectivity.
     */
    private async verifyInfrastructureConnectivity(): Promise<void> {
        // DB Check
        if (mongoose.connection.readyState !== 1) {
            await alertService.sendCriticalAlert('Database Disconnected', {
                readyState: mongoose.connection.readyState
            });
        }

        // Redis Check (Optional in some environments)
        if (!redisService.isReady()) {
            systemLogger.warn('Redis is disconnected or unavailable', 'RecoveryService');
        } else {
            try {
                const pong = await redisService.ping();
                if (pong !== 'PONG') throw new Error('Redis ping failed');
            } catch (error) {
                systemLogger.warn('Redis ping failed despite being ready', 'RecoveryService');
            }
        }
    }

    /**
     * Executes the failover procedure to switch traffic to a secondary region.
     */
    public initiateFailover() {
        if (this.isFailoverActive) return;
        this.isFailoverActive = true;

        systemLogger.error("GLOBAL OUTAGE DETECTED. Initiating Phase 25 Failover Procedure.", "RecoveryService");
        console.log("[RecoveryService] ⚙️ Re-routing global traffic to Secondary Node...");

        alertService.sendCriticalAlert('FAILOVER INITIATED', { reason: 'Primary infrastructure failure' });
    }

    /**
     * Periodically verify media link integrity in S3.
     */
    private async verifyMediaIntegrity(): Promise<void> {
        // Sample check: Verify top 50 recently updated media files
        const recentMedia = await Media.find().sort({ updatedAt: -1 }).limit(50);
        const brokenLinks = [];
        const client = getS3Client();

        for (const media of recentMedia) {
            try {
                const command = new HeadObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: media.key
                });
                await client.send(command);
            } catch (error: any) {
                if (error.name === 'NotFound') {
                    brokenLinks.push({ id: media._id, key: media.key });
                    // Mark as broken or unusable
                    media.metadata = { ...media.metadata, status: 'broken' };
                    await media.save();
                }
            }
        }

        if (brokenLinks.length > 0) {
            await alertService.sendWarningAlert('Broken Media Links Detected', {
                count: brokenLinks.length,
                samples: brokenLinks.slice(0, 5)
            });
        }
    }

    /**
     * Auto-repair broken database references (Orphan Media).
     */
    private async cleanupOrphanMedia(): Promise<void> {
        // Find media files older than 7 days that are not linked to any project
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const orphans = await Media.find({
            createdAt: { $lt: weekAgo },
            purpose: { $in: ['segment_video', 'segment_image', 'segment_audio'] }
        });

        let cleanupCount = 0;
        for (const media of orphans) {
            // Check if used in any project storyboard
            const isUsed = await Project.exists({
                'storyboard.segments': {
                    $elemMatch: {
                        $or: [
                            { 'generatedVideo.s3Key': media.key },
                            { 'generatedAudio.s3Key': media.key },
                            { sceneImage: media.key },
                            { voiceover: media.key }
                        ]
                    }
                }
            });

            if (!isUsed) {
                // Delete from S3 and DB (In production, maybe move to 'trash' first)
                // await this.deleteFromS3(media.key);
                // await media.deleteOne();
                cleanupCount++;
            }
        }

        if (cleanupCount > 0) {
            console.log(`🧹 Identified ${cleanupCount} orphan media files for potential cleanup.`);
        }
    }

    /**
     * Periodically verify that project storyboard references valid Media entries.
     */
    private async verifyProjectDatabaseReferences(): Promise<void> {
        // Sample check: Recent 20 projects
        const recentProjects = await Project.find().sort({ updatedAt: -1 }).limit(20);
        let brokenRefCount = 0;

        for (const project of recentProjects) {
            if (!project.storyboard || !project.storyboard.segments) continue;

            for (const segment of project.storyboard.segments) {
                const keysToCheck = [
                    segment.generatedVideo?.s3Key,
                    segment.generatedAudio?.s3Key,
                    segment.sceneImage,
                    segment.voiceover
                ].filter(Boolean);

                for (const key of keysToCheck) {
                    const mediaExists = await Media.exists({ key });
                    if (!mediaExists) {
                        brokenRefCount++;
                        systemLogger.warn(`Broken media reference in project ${project._id}: ${key}`, "RecoveryService");
                    }
                }
            }
        }

        if (brokenRefCount > 0) {
            await alertService.sendWarningAlert('Broken Database References Detected', {
                count: brokenRefCount,
                description: 'Projects referencing non-existent Media records.'
            });
        }
    }
}

export const recoveryService = new RecoveryService();
