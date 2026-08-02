import crypto from 'crypto';
import { GenblazeRun } from './run.js';

export interface GenblazeManifest {
    version: string;
    runId: string;
    pipelineName: string;
    canonicalHash: string;
    manifestUri?: string;
    createdAt: string;
    steps: {
        provider: string;
        model: string;
        prompt: string;
        params: Record<string, any>;
        assetHashes: string[];
    }[];
}

export class ManifestBuilder {
    public static calculateCanonicalHash(run: GenblazeRun): string {
        const canonicalObject = {
            pipelineName: run.pipelineName,
            runId: run.runId,
            steps: run.steps.map(step => ({
                provider: step.provider,
                model: step.model,
                prompt: step.prompt,
                params: step.params || {},
                assetHashes: step.assets.map(a => a.sha256).sort()
            }))
        };

        const jsonString = JSON.stringify(canonicalObject, Object.keys(canonicalObject).sort());
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    public static createManifest(run: GenblazeRun, manifestUri?: string): GenblazeManifest {
        const canonicalHash = this.calculateCanonicalHash(run);
        
        return {
            version: '0.3.2-ts',
            runId: run.runId,
            pipelineName: run.pipelineName,
            canonicalHash,
            manifestUri,
            createdAt: new Date().toISOString(),
            steps: run.steps.map(step => ({
                provider: step.provider,
                model: step.model,
                prompt: step.prompt,
                params: step.params || {},
                assetHashes: step.assets.map(a => a.sha256)
            }))
        };
    }

    public static verify(manifest: GenblazeManifest, run: GenblazeRun): boolean {
        const recalculatedHash = this.calculateCanonicalHash(run);
        return manifest.canonicalHash === recalculatedHash;
    }
}
