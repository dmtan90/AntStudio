import Redis from 'ioredis';
import { systemLogger } from '../utils/systemLogger.js';
import { NodeHeartbeat } from '../models/NodeHeartbeat.js';

/**
 * Service to manage distributed state across the AntFlow cluster.
 */
export class RedisService {
    private client: any | null = null;
    private readonly nodeId: string;
    private readonly SESSION_KEY_PREFIX = 'antflow:session:';
    private readonly HEARTBEAT_KEY_PREFIX = 'antflow:node:';

    constructor() {
        this.nodeId = process.env.NODE_ID || `node_${Math.random().toString(36).substring(2, 9)}`;
    }

    public async connect() {
        try {
            const host = process.env.REDIS_HOST || 'localhost';
            const port = parseInt(process.env.REDIS_PORT || '6379');
            const password = process.env.REDIS_PASSWORD || undefined;
            const db = parseInt(process.env.REDIS_DB || '0');
            const redisUri = process.env.REDIS_URI;

            // @ts-ignore
            if (redisUri) {
                this.client = new Redis(redisUri);
            } else {
                this.client = new Redis({
                    host,
                    port,
                    password,
                    db,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    }
                });
            }

            this.client.on('error', (err: any) => {
                // Log only once per disconnect to avoid spam
                if (this.client?.status === 'ready') {
                    systemLogger.error(`[Redis] Connection Error: ${err.message}`, 'RedisService');
                }
            });

            this.client.on('connect', () => {
                systemLogger.info(`[Redis] Connecting to cluster state...`, 'RedisService');
            });

            this.client.on('ready', () => {
                systemLogger.info(`[Redis] Connected and Ready.`, 'RedisService');
            });

            // Start heartbeat
            this.startHeartbeat();
        } catch (error: any) {
            systemLogger.error(`[Redis] Failed to initialize: ${error.message}`, 'RedisService');
        }
    }

    public isReady(): boolean {
        return this.client !== null && this.client.status === 'ready';
    }

    public async ping(): Promise<string> {
        if (!this.isReady()) return 'OFFLINE';
        try {
            return await this.client.ping();
        } catch (e) {
            return 'ERROR';
        }
    }

    private startHeartbeat() {
        // 1. Redis Heartbeat (Fast - 10s)
        setInterval(async () => {
            if (!this.isReady()) return;
            try {
                const nodeInfo = {
                    id: this.nodeId,
                    status: 'healthy',
                    lastSeen: Date.now(),
                    ip: process.env.NODE_IP || '127.0.0.1'
                };
                await this.client.set(`${this.HEARTBEAT_KEY_PREFIX}${this.nodeId}`, JSON.stringify(nodeInfo), 'EX', 15);
            } catch (e) { }
        }, 10000);

        // 2. MongoDB Heartbeat (Persistent - 30s)
        setInterval(async () => {
            try {
                await NodeHeartbeat.findOneAndUpdate(
                    { nodeId: this.nodeId },
                    {
                        status: 'healthy',
                        ip: process.env.NODE_IP || '127.0.0.1',
                        lastSeen: new Date()
                    },
                    { upsert: true }
                );
            } catch (e) { }
        }, 30000);
    }

    /**
     * Tries to get value from cache. If missing, runs the callback, caches the result, and returns it.
     * @param key Cache key
     * @param callback Async function to fetch data if cache miss
     * @param ttlSeconds Time to live in seconds
     */
    public async getOrSet<T>(key: string, callback: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
        if (!this.client || this.client.status !== 'ready') {
            // If Redis is down, just fetch directly
            return await callback();
        }

        try {
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            systemLogger.warn(`[Redis] Cache miss/error for ${key}, fetching fresh properly.`, 'RedisService');
        }

        // Fetch fresh data
        const data = await callback();

        if (data) {
            try {
                await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
            } catch (err) {
                systemLogger.warn(`[Redis] Failed to set cache for ${key}`, 'RedisService');
            }
        }

        return data;
    }

    public async registerSession(sessionId: string, data: any) {
        if (!this.client || this.client.status !== 'ready') return;
        try {
            const key = `${this.SESSION_KEY_PREFIX}${sessionId}`;
            await this.client.set(key, JSON.stringify({
                ...data,
                nodeId: this.nodeId,
                registeredAt: Date.now()
            }), 'EX', 3600 * 2); // 2h expiry for sessions
        } catch (e) {
            systemLogger.error(`[Redis] Failed to register session`, 'RedisService');
        }
    }

    public async getSession(sessionId: string): Promise<any> {
        if (!this.client || this.client.status !== 'ready') return null;
        const data = await this.client.get(`${this.SESSION_KEY_PREFIX}${sessionId}`);
        return data ? JSON.parse(data) : null;
    }

    public async removeSession(sessionId: string) {
        if (!this.client || this.client.status !== 'ready') return;
        try {
            await this.client.del(`${this.SESSION_KEY_PREFIX}${sessionId}`);
        } catch (e) {
            // Silence error
        }
    }

    public async getActiveNodes(): Promise<any[]> {
        if (!this.client || this.client.status !== 'ready') return [];
        try {
            const keys = await this.client.keys(`${this.HEARTBEAT_KEY_PREFIX}*`);
            const nodes = await Promise.all(keys.map((key: string) => this.client!.get(key)));
            return nodes.filter(Boolean).map((n: string | null) => JSON.parse(n!));
        } catch (e) {
            return [];
        }
    }

    public async getAllSessions(): Promise<any[]> {
        if (!this.client || this.client.status !== 'ready') return [];
        try {
            const keys = await this.client.keys(`${this.SESSION_KEY_PREFIX}*`);
            const sessions = await Promise.all(keys.map((key: string) => this.client!.get(key)));
            return sessions.filter(Boolean).map((s: string | null) => JSON.parse(s!));
        } catch (e) {
            return [];
        }
    }

    /**
     * Helper to get a value from cache
     */
    public async get(key: string): Promise<any> {
        if (!this.client || this.client.status !== 'ready') return null;
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Helper to set a value in cache
     */
    public async set(key: string, value: any, ttl: number = 3600): Promise<void> {
        if (!this.client || this.client.status !== 'ready') return;
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
        } catch (e) {
            // Silence error
        }
    }

    /**
     * Helper to delete a value from cache
     */
    public async del(key: string): Promise<void> {
        if (!this.isReady()) return;
        try {
            await this.client.del(key);
        } catch (e) {
            // Silence
        }
    }

    /**
     * Invalidate all keys matching a pattern
     */
    public async invalidatePattern(pattern: string): Promise<void> {
        if (!this.isReady()) return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (e) {
            systemLogger.warn(`[Redis] Failed to invalidate pattern ${pattern}`, 'RedisService');
        }
    }
}

export const redisService = new RedisService();
