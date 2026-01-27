import { Redis } from 'ioredis';

class RedisService {
    private client: Redis;
    private isConnected = false;
    private hits = 0;
    private misses = 0;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            lazyConnect: true
        });

        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Redis connected');
        });

        this.client.on('error', (err) => {
            console.error('❌ Redis error:', err);
            this.isConnected = false;
        });
    }

    async connect() {
        if (!this.isConnected) {
            try {
                await this.client.connect();
            } catch (e) {
                console.warn('Redis connection failed, continuing without cache:', e);
            }
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.isConnected) return null;

        try {
            const data = await this.client.get(key);
            if (data) {
                this.hits++;
                return JSON.parse(data);
            } else {
                this.misses++;
                return null;
            }
        } catch (e) {
            console.error('Redis GET error:', e);
            return null;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (!this.isConnected) return;

        try {
            const serialized = JSON.stringify(value);
            if (ttl) {
                await this.client.setex(key, ttl, serialized);
            } else {
                await this.client.set(key, serialized);
            }
        } catch (e) {
            console.error('Redis SET error:', e);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.isConnected) return;
        try {
            await this.client.del(key);
        } catch (e) {
            console.error('Redis DEL error:', e);
        }
    }

    async invalidatePattern(pattern: string): Promise<void> {
        if (!this.isConnected) return;

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (e) {
            console.error('Redis invalidate pattern error:', e);
        }
    }

    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = 300
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) return cached;

        const fresh = await fetcher();
        await this.set(key, fresh, ttl);
        return fresh;
    }

    getHitRate(): number {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
    }

    getStats() {
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: this.getHitRate(),
            isConnected: this.isConnected
        };
    }
    async ping(): Promise<string> {
        if (!this.isConnected) return 'DISCONNECTED';
        try {
            return await this.client.ping();
        } catch (e) {
            return 'ERROR';
        }
    }
}

export const redisService = new RedisService();
