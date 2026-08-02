/**
 * S3StorageBackend — works with any S3-compatible service (B2, R2, MinIO, AWS).
 * 1:1 port of connectors/s3/genblaze_s3/backend.py
 *
 * Requires @aws-sdk/client-s3 to be installed:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage
 */

export interface S3Config {
    bucket: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicUrlBase?: string;
    prefix?: string;
    forcePathStyle?: boolean;
}

export interface FileEntry {
    key: string;
    size: number;
    lastModified: Date;
    etag?: string;
    storageClass?: string;
}

export interface ListPage {
    entries: FileEntry[];
    continuationToken?: string | null;
    isTruncated: boolean;
}

export interface ObjectMetadata {
    key: string;
    size: number;
    lastModified: Date;
    etag?: string;
    contentType?: string;
    metadata?: Record<string, string>;
}

export interface DeleteResult {
    deleted: string[];
    errors: Array<{ key: string; error: string }>;
}

export interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: 'private' | 'public-read';
    cacheControl?: string;
    contentEncoding?: string;
    tagging?: string;
}

export interface PresignedUrlOptions {
    expiresIn?: number;
    method?: 'GET' | 'PUT';
}

const MULTIPART_THRESHOLD = 16 * 1024 * 1024; // 16 MB

export class S3StorageBackend {
    private config: Required<S3Config>;
    private client: any = null;  // @aws-sdk/client-s3 S3Client

    constructor(config: S3Config) {
        this.config = {
            bucket: config.bucket,
            region: config.region ?? 'us-east-1',
            endpoint: config.endpoint ?? '',
            accessKeyId: config.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID ?? '',
            secretAccessKey: config.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
            publicUrlBase: config.publicUrlBase ?? '',
            prefix: config.prefix ?? '',
            forcePathStyle: config.forcePathStyle ?? false
        };
    }

    private async getClient(): Promise<any> {
        if (this.client) return this.client;
        try {
            const { S3Client } = await import('@aws-sdk/client-s3' as any);
            const clientConfig: Record<string, any> = {
                region: this.config.region,
                credentials: {
                    accessKeyId: this.config.accessKeyId,
                    secretAccessKey: this.config.secretAccessKey
                }
            };
            if (this.config.endpoint) clientConfig.endpoint = this.config.endpoint;
            if (this.config.forcePathStyle) clientConfig.forcePathStyle = true;
            this.client = new S3Client(clientConfig);
        } catch {
            throw new Error(
                'S3StorageBackend requires @aws-sdk/client-s3. ' +
                'Install with: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage'
            );
        }
        return this.client;
    }

    private resolveKey(key: string): string {
        if (this.config.prefix) {
            return `${this.config.prefix.replace(/\/$/, '')}/${key}`;
        }
        return key;
    }

    async upload(key: string, body: Buffer | NodeJS.ReadableStream, options: UploadOptions = {}): Promise<string> {
        const client = await this.getClient();
        const { PutObjectCommand } = await import('@aws-sdk/client-s3' as any);

        const resolvedKey = this.resolveKey(key);
        const cmd = new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: resolvedKey,
            Body: body,
            ContentType: options.contentType,
            Metadata: options.metadata,
            ACL: options.acl,
            CacheControl: options.cacheControl,
            ContentEncoding: options.contentEncoding
        });

        await client.send(cmd);

        if (this.config.publicUrlBase) {
            return `${this.config.publicUrlBase.replace(/\/$/, '')}/${resolvedKey}`;
        }
        if (this.config.endpoint) {
            return `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${resolvedKey}`;
        }
        return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${resolvedKey}`;
    }

    async download(key: string): Promise<Buffer> {
        const client = await this.getClient();
        const { GetObjectCommand } = await import('@aws-sdk/client-s3' as any);

        const res = await client.send(new GetObjectCommand({
            Bucket: this.config.bucket,
            Key: this.resolveKey(key)
        }));

        const chunks: Buffer[] = [];
        for await (const chunk of res.Body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }

    async delete(key: string): Promise<void> {
        const client = await this.getClient();
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3' as any);
        await client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: this.resolveKey(key) }));
    }

    async deleteMany(keys: string[]): Promise<DeleteResult> {
        if (keys.length === 0) return { deleted: [], errors: [] };
        const client = await this.getClient();
        const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3' as any);

        const res = await client.send(new DeleteObjectsCommand({
            Bucket: this.config.bucket,
            Delete: { Objects: keys.map(k => ({ Key: this.resolveKey(k) })), Quiet: false }
        }));

        return {
            deleted: (res.Deleted ?? []).map((d: any) => d.Key ?? ''),
            errors: (res.Errors ?? []).map((e: any) => ({ key: e.Key ?? '', error: e.Message ?? 'unknown' }))
        };
    }

    async head(key: string): Promise<ObjectMetadata> {
        const client = await this.getClient();
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3' as any);

        const res = await client.send(new HeadObjectCommand({
            Bucket: this.config.bucket,
            Key: this.resolveKey(key)
        }));

        return {
            key,
            size: res.ContentLength ?? 0,
            lastModified: res.LastModified ?? new Date(),
            etag: res.ETag,
            contentType: res.ContentType,
            metadata: res.Metadata
        };
    }

    async list(prefix?: string, continuationToken?: string): Promise<ListPage> {
        const client = await this.getClient();
        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3' as any);

        const resolvedPrefix = prefix
            ? this.resolveKey(prefix)
            : this.config.prefix || undefined;

        const res = await client.send(new ListObjectsV2Command({
            Bucket: this.config.bucket,
            Prefix: resolvedPrefix,
            ContinuationToken: continuationToken
        }));

        return {
            entries: (res.Contents ?? []).map((obj: any) => ({
                key: obj.Key ?? '',
                size: obj.Size ?? 0,
                lastModified: obj.LastModified ?? new Date(),
                etag: obj.ETag,
                storageClass: obj.StorageClass
            })),
            continuationToken: res.NextContinuationToken ?? null,
            isTruncated: res.IsTruncated ?? false
        };
    }

    async getPresignedUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
        const client = await this.getClient();
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner' as any);
        const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3' as any);

        const expiresIn = options.expiresIn ?? 3600;
        const method = options.method ?? 'GET';
        const resolvedKey = this.resolveKey(key);

        const cmd = method === 'PUT'
            ? new PutObjectCommand({ Bucket: this.config.bucket, Key: resolvedKey })
            : new GetObjectCommand({ Bucket: this.config.bucket, Key: resolvedKey });

        return getSignedUrl(client, cmd, { expiresIn });
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.head(key);
            return true;
        } catch {
            return false;
        }
    }

    async copy(sourceKey: string, destKey: string): Promise<void> {
        const client = await this.getClient();
        const { CopyObjectCommand } = await import('@aws-sdk/client-s3' as any);
        await client.send(new CopyObjectCommand({
            Bucket: this.config.bucket,
            CopySource: `${this.config.bucket}/${this.resolveKey(sourceKey)}`,
            Key: this.resolveKey(destKey)
        }));
    }
}
