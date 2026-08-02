import fs from 'fs';
import path from 'path';
import { canonicalHash } from '../canonical/json.js';

export function stepCacheKey(step: any, tenantId?: string | null): string {
    const keyData: Record<string, any> = {
        provider: step.provider,
        model: step.model,
        prompt: step.prompt,
        params: step.params,
        seed: step.seed,
        modality: step.modality
    };
    if (tenantId) keyData.tenant_id = tenantId;
    return canonicalHash(keyData);
}

export class StepCache {
    private cacheDir: string;
    public corruptionCount = 0;

    constructor(cacheDir: string) {
        this.cacheDir = cacheDir;
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    private getPath(key: string): string {
        return path.join(this.cacheDir, `${key}.json`);
    }

    public get(step: any, tenantId?: string | null): any | null {
        const key = stepCacheKey(step, tenantId);
        const file = this.getPath(key);
        if (fs.existsSync(file)) {
            try {
                return JSON.parse(fs.readFileSync(file, 'utf-8'));
            } catch (_) {
                this.corruptionCount++;
                return null;
            }
        }
        return null;
    }

    public put(step: any, result: any, tenantId?: string | null): void {
        const key = stepCacheKey(step, tenantId);
        const file = this.getPath(key);
        fs.writeFileSync(file, JSON.stringify(result, null, 2), 'utf-8');
    }

    public clear(): void {
        if (fs.existsSync(this.cacheDir)) {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(this.cacheDir, file));
                }
            }
        }
    }
}
