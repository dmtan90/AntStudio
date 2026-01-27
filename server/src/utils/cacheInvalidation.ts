import { redisService } from '../services/RedisService.js';

export class CacheInvalidator {
    static async onProjectUpdate(projectId: string, userId: string) {
        await Promise.all([
            redisService.invalidatePattern(`projects:list:*:user:${userId}*`),
            redisService.invalidatePattern(`project:${projectId}*`)
        ]);
    }

    static async onUserUpdate(userId: string) {
        await redisService.invalidatePattern(`user:profile:*:user:${userId}`);
    }

    static async onTransactionCreate(userId: string) {
        await Promise.all([
            redisService.invalidatePattern(`admin:stats*`),
            redisService.invalidatePattern(`user:credits:${userId}`)
        ]);
    }

    static async onLicenseUpdate() {
        await redisService.invalidatePattern(`admin:stats*`);
    }
}
