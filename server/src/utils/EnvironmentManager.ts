import { SystemConfig } from '../models/SystemConfig.js';
import { systemLogger } from './systemLogger.js';

/**
 * EnvironmentManager: Centralized class to manage process.env variables
 * with dynamic DB overrides (SystemConfig) and fallbacks.
 */
export class EnvironmentManager {
    private static instance: EnvironmentManager;
    private cache: Map<string, string> = new Map();
    private isInitialized: boolean = false;

    private constructor() {}

    public static getInstance(): EnvironmentManager {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }

    /**
     * Initialize the manager by loading all DB overrides into memory.
     */
    public async initialize() {
        try {
            const configs = await SystemConfig.find().lean();
            this.cache.clear();
            for (const config of configs) {
                this.cache.set(config.key, config.value);
            }
            this.isInitialized = true;
            systemLogger.info(`📂 EnvManager initialized with ${this.cache.size} DB overrides`, 'EnvManager');
        } catch (error: any) {
            systemLogger.error(`❌ EnvManager failed to initialize: ${error.message}`, 'EnvManager');
        }
    }

    /**
     * Refresh the cache from the database.
     */
    public async refresh() {
        await this.initialize();
    }

    /**
     * Get a configuration value with the following priority:
     * 1. Database Override (SystemConfig)
     * 2. process.env
     * 3. Default value provided
     */
    public get(key: string, defaultValue?: any): string {
        // 1. Check DB Cache
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        // 2. Fallback to process.env
        const envValue = process.env[key];
        if (envValue !== undefined) {
            return envValue;
        }

        // 3. Fallback to default
        return defaultValue !== undefined ? String(defaultValue) : '';
    }

    /**
     * Set a configuration value in the database and update the local cache.
     */
    public async set(key: string, value: string, description?: string, isPublic: boolean = false) {
        try {
            await SystemConfig.findOneAndUpdate(
                { key },
                { 
                    $set: { 
                        value, 
                        description,
                        isPublic 
                    } 
                },
                { upsert: true, new: true }
            );
            this.cache.set(key, value);
            systemLogger.info(`📝 Config updated: ${key} = ${value}`, 'EnvManager');
        } catch (error: any) {
            systemLogger.error(`❌ Failed to set config ${key}: ${error.message}`, 'EnvManager');
            throw error;
        }
    }

    /**
     * Delete an override from the database.
     */
    public async delete(key: string) {
        try {
            await SystemConfig.deleteOne({ key });
            this.cache.delete(key);
            systemLogger.info(`🗑️ Config override removed: ${key}`, 'EnvManager');
        } catch (error: any) {
            systemLogger.error(`❌ Failed to delete config ${key}: ${error.message}`, 'EnvManager');
            throw error;
        }
    }

    /**
     * Helper to get boolean values safely
     */
    public getBool(key: string, defaultValue: boolean = false): boolean {
        const val = this.get(key, defaultValue);
        return String(val).toLowerCase() === 'true' || String(val) === '1';
    }

    /**
     * Helper to get number values safely
     */
    public getInt(key: string, defaultValue: number = 0): number {
        const val = this.get(key, defaultValue);
        return parseInt(val, 10);
    }
}

export const envManager = EnvironmentManager.getInstance();
