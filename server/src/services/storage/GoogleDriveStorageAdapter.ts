import { google, drive_v3 } from 'googleapis';
import { IStorageAdapter } from './StorageAdapter.js';
import { configService } from '../../utils/configService.js';

/**
 * Google Drive Storage Provider implementation.
 * Uses Service Account credentials for server-side management.
 */
export class GoogleDriveStorageAdapter implements IStorageAdapter {
    private drive: drive_v3.Drive;
    private rootFolderId: string;

    constructor() {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: configService.storage.googleDrive.clientEmail,
                private_key: configService.storage.googleDrive.privateKey?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        this.drive = google.drive({ version: 'v3', auth });
        this.rootFolderId = configService.storage.googleDrive.rootFolderId || 'root';
    }

    async uploadFile(key: string, body: Buffer | Uint8Array | string, contentType: string = 'application/octet-stream'): Promise<{ key: string, url: string }> {
        // 1. Check if folder structure exists (simplification: store everything in root or flat with key-prefix)
        const fileMetadata = {
            name: key,
            parents: [this.rootFolderId],
        };

        const media = {
            mimeType: contentType,
            body: typeof body === 'string' ? body : Buffer.from(body),
        };

        const file = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        const fileId = file.data.id!;

        // 2. Make file publicly readable (required for CDN / web viewing)
        await this.drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Use webContentLink for direct streaming/downloading
        return {
            key: fileId,
            url: file.data.webContentLink || `https://drive.google.com/uc?id=${fileId}`
        };
    }

    async getFileUrl(key: string): Promise<string> {
        // In GDrive, the key *is* usually the fileId in this adapter context
        return `https://drive.google.com/uc?id=${key}`;
    }

    async deleteFile(key: string): Promise<void> {
        await this.drive.files.delete({ fileId: key });
    }

    async deleteFolder(prefix: string): Promise<void> {
        // GDrive is not strictly prefix-based like S3. 
        // We'd have to search for files with names starting with prefix.
        const response = await this.drive.files.list({
            q: `name contains '${prefix}' and '${this.rootFolderId}' in parents`,
            fields: 'files(id, name)',
        });

        const files = response.data.files || [];
        for (const file of files) {
            if (file.id) await this.deleteFile(file.id);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.drive.files.get({ fileId: key });
            return true;
        } catch (e) {
            return false;
        }
    }

    async listFiles(prefix?: string): Promise<Array<{ key: string, url: string, size?: number, lastModified?: Date }>> {
        let q = `'${this.rootFolderId}' in parents and trashed = false`;
        if (prefix) {
            q += ` and name contains '${prefix}'`;
        }

        const response = await this.drive.files.list({
            q: q,
            fields: 'files(id, name, size, modifiedTime, webContentLink)',
            orderBy: 'modifiedTime desc'
        });

        const files = response.data.files || [];

        return files.map((file: drive_v3.Schema$File) => ({
            key: file.id!,
            url: file.webContentLink || `https://drive.google.com/uc?id=${file.id}`,
            size: file.size ? parseInt(file.size) : undefined,
            lastModified: file.modifiedTime ? new Date(file.modifiedTime) : undefined
        }));
    }
}
