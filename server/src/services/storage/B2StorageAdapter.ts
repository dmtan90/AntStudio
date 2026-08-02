import { B2Client, BufferSource } from '@backblaze-labs/b2-sdk';
import { IStorageAdapter } from './StorageAdapter.js';
import { configService } from '../../utils/ConfigService.js';
import { Logger } from '../../utils/Logger.js';

export class B2StorageAdapter implements IStorageAdapter {
    private client: B2Client | null = null;
    private bucketName: string = '';
    private isInitialized = false;
    private authPromise: Promise<void> | null = null;
    private static instance: B2StorageAdapter | null;
        
    public static getInstance(): B2StorageAdapter {
        if (this.instance == null) {
            this.instance = new B2StorageAdapter();
        }
        return this.instance;
    }

    public destroy() {
        this.client = null;
        this.isInitialized = false;
        this.authPromise = null;
        B2StorageAdapter.instance = null;
        Logger.info("Backblaze B2 is destroyed");
    }

    constructor() {
        // Deferred initialization in ensureAuthorized() to handle async authorize()
    }

    private async ensureAuthorized(): Promise<void> {
        if (this.isInitialized && this.client) {
            return;
        }

        if (!this.authPromise) {
            this.authPromise = (async () => {
                const b2Config = configService.storage.b2;
                if (!b2Config || !b2Config.applicationKeyId || !b2Config.applicationKey || !b2Config.bucketName) {
                    throw new Error('Backblaze B2 is not configured properly.');
                }

                this.bucketName = b2Config.bucketName;
                this.client = new B2Client({
                    applicationKeyId: b2Config.applicationKeyId,
                    applicationKey: b2Config.applicationKey,
                });

                await this.client.authorize();
                this.isInitialized = true;
                Logger.info('✅ Backblaze B2 Client authorized successfully', 'B2StorageAdapter');
            })().catch(err => {
                this.authPromise = null;
                throw err;
            });
        }

        await this.authPromise;
    }

    private async getBucket() {
        await this.ensureAuthorized();
        const bucket = await this.client!.getBucket(this.bucketName);
        if (!bucket) {
            throw new Error(`Bucket ${this.bucketName} not found in Backblaze B2.`);
        }
        return bucket;
    }

    public async uploadFile(
        key: string,
        body: Buffer | Uint8Array | string,
        contentType: string = 'application/octet-stream'
    ): Promise<{ key: string; url: string }> {
        const bucket = await this.getBucket();
        
        let data: Uint8Array;
        if (typeof body === 'string') {
            data = new TextEncoder().encode(body);
        } else if (Buffer.isBuffer(body)) {
            data = new Uint8Array(body);
        } else {
            data = body;
        }

        try {
            await bucket.upload({
                fileName: key,
                source: new BufferSource(data),
                contentType: contentType,
            });
        } catch (err: any) {
            Logger.warn(`[B2StorageAdapter] Upload attempt failed: ${err.message}. Re-authorizing B2 client and retrying...`, 'B2StorageAdapter');
            this.isInitialized = false;
            this.authPromise = null;
            const freshBucket = await this.getBucket();
            await freshBucket.upload({
                fileName: key,
                source: new BufferSource(data),
                contentType: contentType,
            });
        }

        const url = await this.getFileUrl(key);
        return { key, url };
    }

    public async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
        await this.ensureAuthorized();
        const bucket = await this.getBucket();

        const downloadUrl = this.client!.accountInfo.getDownloadUrl();
        const baseFileUrl = `${downloadUrl}/file/${this.bucketName}/${key}`;

        try {
            const authResponse = await this.client!.raw.getDownloadAuthorization(
                this.client!.accountInfo.getApiUrl(),
                this.client!.accountInfo.getAuthToken(),
                {
                    bucketId: bucket.id,
                    fileNamePrefix: key,
                    validDurationInSeconds: expiresIn,
                }
            );
            return `${baseFileUrl}?Authorization=${authResponse.authorizationToken}`;
        } catch (error) {
            Logger.error('Failed to get download authorization, returning public URL:', 'B2StorageAdapter', error);
            return baseFileUrl;
        }
    }

    public async deleteFile(key: string): Promise<void> {
        const bucket = await this.getBucket();
        const fileInfo = await bucket.getFileInfoByName(key);
        if (fileInfo) {
            await bucket.deleteFileVersion(key, fileInfo.fileId);
        }
    }

    public async deleteFolder(prefix: string): Promise<void> {
        const bucket = await this.getBucket();
        for await (const event of bucket.deleteAll({ prefix })) {
            if (event.type === 'error') {
                Logger.error(`Failed to delete version of ${event.fileName}: ${event.message}`, 'B2StorageAdapter');
            }
        }
    }

    public async exists(key: string): Promise<boolean> {
        try {
            const bucket = await this.getBucket();
            await bucket.head(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    public async listFiles(prefix?: string): Promise<Array<{ key: string; url: string; size?: number; lastModified?: Date }>> {
        await this.ensureAuthorized();
        const bucket = await this.getBucket();
        const downloadUrl = this.client!.accountInfo.getDownloadUrl();
        
        const files: Array<{ key: string; url: string; size?: number; lastModified?: Date }> = [];
        
        for await (const file of bucket.paginateFileNames({ prefix })) {
            const key = file.fileName;
            const url = `${downloadUrl}/file/${this.bucketName}/${key}`;
            files.push({
                key,
                url,
                size: file.contentLength,
                lastModified: file.uploadTimestamp ? new Date(file.uploadTimestamp) : undefined,
            });
        }
        return files;
    }

    public async getFileStream(key: string): Promise<any> {
        const url = await this.getFileUrl(key);
        const axios = (await import('axios')).default;
        const response = await axios.get(url, { responseType: 'stream' });
        return response.data;
    }

    public async getUploadUrl(key: string, contentType?: string, expiresIn?: number): Promise<string> {
        await this.ensureAuthorized();
        const bucket = await this.getBucket();
        const resp = await this.client!.raw.getUploadUrl(
            this.client!.accountInfo.getApiUrl(),
            this.client!.accountInfo.getAuthToken(),
            {
                bucketId: bucket.id
            }
        );
        return resp.uploadUrl;
    }
}
