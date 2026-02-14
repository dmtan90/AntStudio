import { GoogleGenAI, Modality } from '@google/genai';
import { AdminSettings, IAdminSettings } from '../models/AdminSettings.js';

export interface GeminiKeyInfo {
    key: string;
    label: string;
    isActive: boolean;
    quotas: Map<string, { used: number; limit: number; resetAt?: Date }>;
}

export class GeminiPool {
    private static instance: GeminiPool;
    private clients: Map<string, GoogleGenAI> = new Map();

    private constructor() {}

    public static getInstance(): GeminiPool {
        if (!GeminiPool.instance) {
            GeminiPool.instance = new GeminiPool();
        }
        return GeminiPool.instance;
    }

    /**
     * Get all available Gemini keys from AdminSettings
     */
    private async getAllKeys(): Promise<GeminiKeyInfo[]> {
        const settings = await AdminSettings.findOne();
        if (!settings) return [];

        let allKeys: GeminiKeyInfo[] = [];

        // 1. Keys from explicit geminiApiKeys array
        if (settings.geminiApiKeys && settings.geminiApiKeys.length > 0) {
            allKeys = settings.geminiApiKeys.map(k => ({
                key: k.key,
                label: k.label,
                isActive: k.isActive,
                quotas: k.quotas || new Map()
            }));
        }

        // 2. Discover keys from AI Providers (supporting comma-separated)
        const providers = settings.aiSettings?.providers || [];
        for (const provider of providers) {
            if (provider.isActive && (provider.id.includes('gemini') || provider.id.includes('google') || provider.id.includes('aistudio'))) {
                if (provider.apiKey && provider.apiKey.includes(',')) {
                    const splitKeys = provider.apiKey.split(',').map(k => k.trim()).filter(k => k);
                    for (const k of splitKeys) {
                        // Avoid duplicates
                        if (!allKeys.find(ak => ak.key === k)) {
                            allKeys.push({
                                key: k,
                                label: `${provider.name} (Pooled)`,
                                isActive: true,
                                quotas: new Map()
                            });
                        }
                    }
                } else if (provider.apiKey) {
                    if (!allKeys.find(ak => ak.key === provider.apiKey)) {
                        allKeys.push({
                            key: provider.apiKey,
                            label: provider.name,
                            isActive: true,
                            quotas: new Map()
                        });
                    }
                }
            }
        }

        // 3. Fallback to ENV if nothing in DB
        if (allKeys.length === 0 && process.env.GOOGLE_API_KEY) {
            allKeys.push({
                key: process.env.GOOGLE_API_KEY,
                label: 'Environment Fallback',
                isActive: true,
                quotas: new Map()
            });
        }

        return allKeys.filter(k => k.isActive);
    }

    /**
     * Select the best key for the requested model based on quota
     */
    public async getOptimalClient(modelId: string = 'gemini-2.5-flash'): Promise<{ client: GoogleGenAI, key: string }> {
        const keys = await this.getAllKeys();
        if (keys.length === 0) {
            throw new Error('No active Gemini API keys found in Admin Settings or Environment');
        }

        // Simple strategy for now: Least used or first available with quota
        // In a real multi-key scenario, we'd check resetAt and used vs limit.
        // For now, we'll use a round-robin or first-ready approach.
        
        // Find keys that are not "exhausted" (placeholder logic until quota sync is fully implemented)
        const availableKeys = keys; // Assume all are available if we don't have hard limits synced yet

        // Round robin or random selection to distribute load
        const selectedKeyInfo = availableKeys[Math.floor(Math.random() * availableKeys.length)];
        
        if (!this.clients.has(selectedKeyInfo.key)) {
            this.clients.set(selectedKeyInfo.key, new GoogleGenAI({apiKey: selectedKeyInfo.key}));
        }

        return {
            client: this.clients.get(selectedKeyInfo.key)!,
            key: selectedKeyInfo.key
        };
    }

    /**
     * Record usage for a specific key and model to manage quotas
     */
    public async recordUsage(apiKey: string, modelId: string): Promise<void> {
        try {
            const settings = await AdminSettings.findOne();
            if (!settings) return;

            // Update in geminiApiKeys if present
            const keyInPool = settings.geminiApiKeys?.find(k => k.key === apiKey);
            if (keyInPool) {
                keyInPool.usageCount = (keyInPool.usageCount || 0) + 1;
                keyInPool.lastUsed = new Date();
                
                // Update quota map
                if (!keyInPool.quotas) keyInPool.quotas = new Map();
                const safeModelId = modelId.replace(/\./g, '_');
                const q = keyInPool.quotas.get(safeModelId) || { used: 0, limit: 15 }; // Default limit
                q.used++;
                keyInPool.quotas.set(safeModelId, q);
                
                settings.markModified('geminiApiKeys');
                await settings.save();
            }
        } catch (error) {
            console.error('[GeminiPool] Failed to record usage:', error);
        }
    }
}

export const geminiPool = GeminiPool.getInstance();
