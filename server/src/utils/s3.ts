import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { configService } from './configService.js'

let s3Client: S3Client | null = null

export const getS3Client = () => {
    // Always recreate client if needed, or we can cache it and clear cache on config refresh.
    // For now, let's allow it to be dynamic but simple. Since typical usage is per-request, 
    // creating a client is cheap if we don't cache deeply or if we handle 'reset' properly.
    // However, existing singleton pattern (let s3Client...) prevents updates.
    // So we should verify if config changed.
    // Simpler approach: Just always return the singleton, but provide a way to reset it.

    if (s3Client) {
        return s3Client
    }

    const awsConfig = configService.aws;

    s3Client = new S3Client({
        region: awsConfig.region,
        credentials: {
            accessKeyId: awsConfig.accessKeyId || '',
            secretAccessKey: awsConfig.secretAccessKey || ''
        },
        endpoint: awsConfig.endpoint || undefined,
        forcePathStyle: true,
    })

    return s3Client
}

export const resetS3Client = () => {
    s3Client = null;
}

export const uploadToS3 = async (
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
) => {
    const client = getS3Client()

    const command = new PutObjectCommand({
        Bucket: configService.aws.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType
    })

    await client.send(command)

    let url = `https://${configService.aws.bucketName}.s3.${configService.aws.region}.amazonaws.com/${key}`
    if (configService.aws.endpoint) {
        url = `${configService.aws.endpoint}/${configService.aws.bucketName}/${key}`
    }

    return {
        key,
        url
    }
}

export const getFromS3 = async (key: string) => {
    const client = getS3Client()

    const command = new GetObjectCommand({
        Bucket: configService.aws.bucketName,
        Key: key
    })

    const response = await client.send(command)
    return response.Body
}

export const deleteFromS3 = async (key: string) => {
    const client = getS3Client()

    const command = new DeleteObjectCommand({
        Bucket: configService.aws.bucketName,
        Key: key
    })

    await client.send(command)
}

/**
 * Delete all objects with a specific prefix
 */
export const deleteFolderFromS3 = async (prefix: string) => {
    const client = getS3Client()

    // 1. List all objects with prefix
    const listCommand = new ListObjectsV2Command({
        Bucket: configService.aws.bucketName,
        Prefix: prefix
    })

    const listResponse = await client.send(listCommand)

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return
    }

    // 2. Prepare for delete
    const objectsToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key }))

    const deleteCommand = new DeleteObjectsCommand({
        Bucket: configService.aws.bucketName,
        Delete: {
            Objects: objectsToDelete
        }
    })

    await client.send(deleteCommand)
}

export const getSignedS3Url = async (key: string, expiresIn: number = 3600) => {
    const client = getS3Client()

    const command = new GetObjectCommand({
        Bucket: configService.aws.bucketName,
        Key: key
    })

    return await getSignedUrl(client, command, { expiresIn })
}

export const getFileInfo = async (key: string) => {
    const client = getS3Client()

    const command = new HeadObjectCommand({
        Bucket: configService.aws.bucketName,
        Key: key
    })

    return await client.send(command)
}

/**
 * Standardized S3 Key Generator
 * Designed to be deterministic (no timestamps) to allow overwriting.
 */
export const S3KeyGenerator = {
    projectThumbnail: (projectId: string) => `projects/${projectId}/thumbnail.jpg`,

    characterImage: (projectId: string, charName: string) => {
        const cleanName = charName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        return `projects/${projectId}/characters/${cleanName}.png`;
    },

    sceneImage: (projectId: string, segmentOrder: number) => `projects/${projectId}/scenes/segment_${segmentOrder}.png`,

    sceneVideo: (projectId: string, segmentOrder: number) => `projects/${projectId}/scenes/segment_${segmentOrder}.mp4`,

    finalVideo: (projectId: string, ext = 'mp4') => `projects/${projectId}/final.${ext}`,

    audio: (projectId: string, type: 'bgm' | 'voice' | 'sfx', name: string, ext = 'mp3') => {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        return `projects/${projectId}/audio/${type}_${cleanName}.${ext}`;
    },

    // Generic asset fallback
    asset: (projectId: string, entityType: string, entityId: string, ext: string) => {
        return `projects/${projectId}/assets/${entityType}_${entityId}.${ext}`;
    },

    timelapse: (projectId: string) => `projects/${projectId}/timelapse.mp4`
}
