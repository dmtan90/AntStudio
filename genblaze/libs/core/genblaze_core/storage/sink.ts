import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';
import { BaseSink } from '../sinks.js';
import { StorageBackend, KeyStrategy } from './base.js';
import { KeyBuilder } from './key_builder.js';
import { URLPolicy, URLPolicyError } from './url_policy.js';
import { ManifestError } from '../exceptions.js';

export class ObjectStorageSink extends BaseSink {
    private backend: StorageBackend;
    private prefix: string;
    private keyStrategy: KeyStrategy;
    private kb: KeyBuilder;
    private assetUrlPolicy: URLPolicy;

    constructor(
        backend: StorageBackend,
        options: {
            prefix?: string;
            keyStrategy?: KeyStrategy;
            assetUrlPolicy?: URLPolicy;
        } = {}
    ) {
        super();
        this.backend = backend;
        this.prefix = options.prefix || 'genblaze';
        this.keyStrategy = options.keyStrategy || KeyStrategy.CONTENT_ADDRESSABLE;
        this.assetUrlPolicy = options.assetUrlPolicy || URLPolicy.AUTO;
        this.kb = KeyBuilder.fromPrefix(this.prefix);

        if (this.assetUrlPolicy === URLPolicy.PRESIGNED) {
            throw new URLPolicyError(
                'asset_url_policy=URLPolicy.PRESIGNED is not supported on ObjectStorageSink. Call backend.presigned_get_url(key) directly.'
            );
        }
    }

    public manifestKeyFor(run: any): string {
        if (this.keyStrategy === KeyStrategy.HIERARCHICAL) {
            const parts = ['runs'];
            if (run.tenantId) parts.push(run.tenantId);
            const dateStr = run.createdAt ? run.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
            parts.push(dateStr, run.runId, 'manifest.json');
            return this.kb.build(...parts);
        }
        return this.kb.build('manifests', `${run.runId}.json`);
    }

    public async writeRun(run: any, manifest: any): Promise<void> {
        const manifestKey = this.manifestKeyFor(run);
        const manifestJson = typeof manifest.toCanonicalJson === 'function'
            ? manifest.toCanonicalJson()
            : JSON.stringify(manifest);

        await this.backend.put(manifestKey, Buffer.from(manifestJson, 'utf-8'), {
            contentType: 'application/json'
        });

        manifest.manifestUri = this.backend.getDurableUrl(manifestKey);
    }

    public async readManifest(run: any): Promise<any> {
        const key = this.manifestKeyFor(run);
        const buffer = await this.backend.get(key);
        return JSON.parse(buffer.toString('utf-8'));
    }
}
