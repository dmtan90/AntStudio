import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageAdapter } from './StorageAdapter.js';
import { configService } from '../../utils/configService.js';

/**
 * AWS S3 Storage Provider implementation.
 */
export class S3StorageAdapter implements IStorageAdapter {
    private client: S3Client;
    private bucket: string;

    constructor() {
        this.bucket = configService.aws.bucketName;
        this.client = new S3Client({
            region: configService.aws.region,
            credentials: {
                accessKeyId: configService.aws.accessKeyId || '',
                secretAccessKey: configService.aws.secretAccessKey || ''
            },
            endpoint: configService.aws.endpoint || undefined,
            forcePathStyle: true,
        });
    }

    async uploadFile(key: string, body: Buffer | Uint8Array | string, contentType: string = 'application/octet-stream'): Promise<{ key: string, url: string }> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType
        });

        await this.client.send(command);

        let url = `https://${this.bucket}.s3.${configService.aws.region}.amazonaws.com/${key}`;
        if (configService.aws.endpoint) {
            url = `${configService.aws.endpoint}/${this.bucket}/${key}`;
        }

        return { key, url };
    }

    async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        return await getSignedUrl(this.client, command, { expiresIn });
    }

    async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        await this.client.send(command);
    }

    async deleteFolder(prefix: string): Promise<void> {
        const listCommand = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix
        });

        const listResponse = await this.client.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) return;

        const objectsToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key }));

        const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
                Objects: objectsToDelete
            }
        });

        await this.client.send(deleteCommand);
    }

    async exists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key
            });
            await this.client.send(command);
            return true;
        } catch (e: any) {
            if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
            throw e;
        }
    }

    async listFiles(prefix?: string): Promise<Array<{ key: string, url: string, size?: number, lastModified?: Date }>> {
        const command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix
        });

        const response = await this.client.send(command);
        const contents = response.Contents || [];

        return await Promise.all(contents.map(async (obj) => {
            let url = `https://${this.bucket}.s3.${configService.aws.region}.amazonaws.com/${obj.Key}`;
            if (configService.aws.endpoint) {
                url = `${configService.aws.endpoint}/${this.bucket}/${obj.Key}`;
            }

            return {
                key: obj.Key!,
                url: url,
                size: obj.Size,
                lastModified: obj.LastModified
            };
        }));
    }
}
