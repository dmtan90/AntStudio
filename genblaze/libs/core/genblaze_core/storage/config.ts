export interface StorageConfigOptions {
    maxPoolConnections?: number;
    connectTimeoutSec?: number;
    readTimeoutSec?: number;
    multipartThreshold?: number;
    multipartChunkSize?: number;
    retries?: number;
    userAgentExtra?: string;
    signingAddressingStyle?: 'virtual' | 'path';
}

export class StorageConfig {
    readonly maxPoolConnections: number;
    readonly connectTimeoutSec: number;
    readonly readTimeoutSec: number;
    readonly multipartThreshold: number;
    readonly multipartChunkSize: number;
    readonly retries: number;
    readonly userAgentExtra?: string;
    readonly signingAddressingStyle: 'virtual' | 'path';

    constructor(options: StorageConfigOptions = {}) {
        this.maxPoolConnections = options.maxPoolConnections ?? 20;
        this.connectTimeoutSec = options.connectTimeoutSec ?? 30.0;
        this.readTimeoutSec = options.readTimeoutSec ?? 300.0;
        this.multipartThreshold = options.multipartThreshold ?? (16 * 1024 * 1024);
        this.multipartChunkSize = options.multipartChunkSize ?? (16 * 1024 * 1024);
        this.retries = options.retries ?? 3;
        this.userAgentExtra = options.userAgentExtra;
        this.signingAddressingStyle = options.signingAddressingStyle ?? 'virtual';

        if (this.maxPoolConnections < 1) throw new Error('maxPoolConnections must be >= 1');
        if (this.connectTimeoutSec <= 0) throw new Error('connectTimeoutSec must be > 0');
        if (this.readTimeoutSec <= 0) throw new Error('readTimeoutSec must be > 0');
        if (this.multipartThreshold < 1) throw new Error('multipartThreshold must be >= 1');
        if (this.multipartChunkSize < 1) throw new Error('multipartChunkSize must be >= 1');
        if (this.retries < 0) throw new Error('retries must be >= 0');
    }
}
