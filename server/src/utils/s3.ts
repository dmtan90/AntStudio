import { StorageFactory } from '../services/storage/StorageFactory.js';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter.js';
import { Logger } from './Logger.js';

export const uploadToS3 = async (
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
) => {
    try {
        const adapter = await StorageFactory.getActiveAdapter();
        const result = await adapter.uploadFile(key, body, contentType);
        return {
            key: result.key,
            url: result.url
        };
    } catch (error: any) {
        Logger.warn(`[Storage] Primary cloud storage upload failed (${error?.message || error}). Falling back to local disk storage...`, 'uploadToS3');
        const localAdapter = LocalStorageAdapter.getInstance();
        const result = await localAdapter.uploadFile(key, body, contentType);
        return {
            key: result.key,
            url: result.url
        };
    }
};

export const getFromS3 = async (key: string) => {
    try {
        const adapter = await StorageFactory.getActiveAdapter();
        return await adapter.getFileStream(key);
    } catch (error) {
        const localAdapter = LocalStorageAdapter.getInstance();
        return await localAdapter.getFileStream(key);
    }
};

export const deleteFromS3 = async (key: string) => {
    try {
        const adapter = await StorageFactory.getActiveAdapter();
        await adapter.deleteFile(key);
    } catch (error) {
        const localAdapter = LocalStorageAdapter.getInstance();
        await localAdapter.deleteFile(key);
    }
};

export const deleteFolderFromS3 = async (prefix: string) => {
    try {
        const adapter = await StorageFactory.getActiveAdapter();
        await adapter.deleteFolder(prefix);
    } catch (error) {
        const localAdapter = LocalStorageAdapter.getInstance();
        await localAdapter.deleteFolder(prefix);
    }
};

export const getSignedS3Url = async (key: string, expiresIn: number = 3600) => {
    try {
        const adapter = await StorageFactory.getActiveAdapter();
        return await adapter.getFileUrl(key, expiresIn);
    } catch (error) {
        const localAdapter = LocalStorageAdapter.getInstance();
        return await localAdapter.getFileUrl(key, expiresIn);
    }
};

export const getFileInfo = async (key: string) => {
    try {
        const adapter = await StorageFactory.getActiveAdapter();
        const exists = await adapter.exists(key);
        if (exists) return { exists: true };
    } catch (error) {}

    const localAdapter = LocalStorageAdapter.getInstance();
    const localExists = await localAdapter.exists(key);
    if (!localExists) {
        throw new Error('File not found');
    }
    return { exists: true };
};

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

    sceneAudio: (projectId: string, segmentOrder: number) => `projects/${projectId}/scenes/segment_${segmentOrder}.mp3`,

    finalVideo: (projectId: string, ext = 'mp4') => `projects/${projectId}/final.${ext}`,

    audio: (projectId: string, type: 'bgm' | 'voice' | 'sfx', name: string, ext = 'mp3') => {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        return `projects/${projectId}/audio/${type}_${cleanName}.${ext}`;
    },

    // Generic asset fallback
    asset: (projectId: string, entityType: string, entityId: string, ext: string) => {
        return `projects/${projectId}/assets/${entityType}_${entityId}.${ext}`;
    },

    timelapse: (projectId: string) => `projects/${projectId}/timelapse.mp4`,

    userAvatar: (userId: string) => `users/${userId}/avatar.png`,

    tempFile: (filename: string) => `temp/${Date.now()}_${filename}`
};
