import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { StorageBackend, KeyStrategy } from './base.js';
import { KeyBuilder } from './key_builder.js';
import { StorageError } from '../exceptions.js';

export class AssetTransfer {
    private backend: StorageBackend;
    private prefix: string;
    private strategy: KeyStrategy;
    private kb: KeyBuilder;

    constructor(
        backend: StorageBackend,
        options: {
            prefix?: string;
            keyStrategy?: KeyStrategy;
            pipelinedTransfer?: boolean;
        } = {}
    ) {
        this.backend = backend;
        this.prefix = options.prefix || 'assets';
        this.strategy = options.keyStrategy || KeyStrategy.CONTENT_ADDRESSABLE;
        this.kb = KeyBuilder.fromPrefix(this.prefix);
    }

    public async transfer(
        asset: any,
        options: { tenant?: string; dateStr?: string; runId?: string } = {}
    ): Promise<string> {
        let buffer: Buffer;

        if (asset.url.startsWith('file://')) {
            const filePath = asset.url.replace(/^file:\/\//, '');
            buffer = fs.readFileSync(filePath);
        } else if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
            const res = await fetch(asset.url);
            if (!res.ok) throw new StorageError(`HTTP GET failed for ${asset.url}`);
            const arrayBuf = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
        } else {
            buffer = Buffer.from(asset.url, 'utf-8');
        }

        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const sizeBytes = buffer.length;

        let ext = '.bin';
        if (asset.mediaType) {
            if (asset.mediaType.includes('png')) ext = '.png';
            else if (asset.mediaType.includes('jpeg') || asset.mediaType.includes('jpg')) ext = '.jpg';
            else if (asset.mediaType.includes('mp4')) ext = '.mp4';
            else if (asset.mediaType.includes('mpeg') || asset.mediaType.includes('mp3')) ext = '.mp3';
            else if (asset.mediaType.includes('wav')) ext = '.wav';
        }

        let key: string;
        if (this.strategy === KeyStrategy.CONTENT_ADDRESSABLE) {
            key = this.kb.build(sha256.slice(0, 2), sha256.slice(2, 4), `${sha256}${ext}`);
        } else {
            const parts: string[] = [];
            if (options.tenant) parts.push(options.tenant);
            if (options.dateStr) parts.push(options.dateStr);
            if (options.runId) parts.push(options.runId);
            parts.push('assets', `${asset.assetId || crypto.randomUUID()}${ext}`);
            key = this.kb.build(...parts);
        }

        if (this.strategy === KeyStrategy.CONTENT_ADDRESSABLE && await this.backend.exists(key)) {
            // Asset already exists
        } else {
            await this.backend.put(key, buffer, {
                contentType: asset.mediaType || 'application/octet-stream'
            });
        }

        asset.sha256 = sha256;
        asset.sizeBytes = sizeBytes;
        asset.url = this.backend.getDurableUrl(key);

        return key;
    }
}
