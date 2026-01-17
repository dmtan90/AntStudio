import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let s3Client: S3Client | null = null

export const getS3Client = () => {
    if (s3Client) {
        return s3Client
    }

    const config = useRuntimeConfig()

    s3Client = new S3Client({
        region: config.awsRegion,
        credentials: {
            accessKeyId: config.awsAccessKeyId || '',
            secretAccessKey: config.awsSecretAccessKey || ''
        },
        endpoint: config.awsS3Endpoint || undefined,
        forcePathStyle: true,
    })

    return s3Client
}

export const uploadToS3 = async (
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
) => {
    const config = useRuntimeConfig()
    const client = getS3Client()

    const command = new PutObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType
    })

    await client.send(command)

    let url = `https://${config.awsS3Bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`
    if (config.awsS3Endpoint) {
        url = `${config.awsS3Endpoint}/${config.awsS3Bucket}/${key}`
    }

    return {
        key,
        url
    }
}

export const getFromS3 = async (key: string) => {
    const config = useRuntimeConfig()
    const client = getS3Client()

    const command = new GetObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key
    })

    const response = await client.send(command)
    return response.Body
}

export const deleteFromS3 = async (key: string) => {
    const config = useRuntimeConfig()
    const client = getS3Client()

    const command = new DeleteObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key
    })

    await client.send(command)
}

/**
 * Delete all objects with a specific prefix
 */
export const deleteFolderFromS3 = async (prefix: string) => {
    const config = useRuntimeConfig()
    const client = getS3Client()

    // 1. List all objects with prefix
    const listCommand = new ListObjectsV2Command({
        Bucket: config.awsS3Bucket,
        Prefix: prefix
    })

    const listResponse = await client.send(listCommand)

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return
    }

    // 2. Prepare for delete
    const objectsToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key }))

    const deleteCommand = new DeleteObjectsCommand({
        Bucket: config.awsS3Bucket,
        Delete: {
            Objects: objectsToDelete
        }
    })

    await client.send(deleteCommand)
}

export const getSignedS3Url = async (key: string, expiresIn: number = 3600) => {
    const config = useRuntimeConfig()
    const client = getS3Client()

    const command = new GetObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key
    })

    return await getSignedUrl(client, command, { expiresIn })
}

export const getFileInfo = async (key: string) => {
    const config = useRuntimeConfig()
    const client = getS3Client()

    const command = new HeadObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key
    })

    return await client.send(command)
}
