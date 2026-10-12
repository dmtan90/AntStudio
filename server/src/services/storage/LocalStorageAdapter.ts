import fs from 'fs';
import path from 'path';
import { IStorageAdapter } from './StorageAdapter.js';
import { Logger } from '../../utils/Logger.js';
import { configService } from '../../utils/ConfigService.js';

export class LocalStorageAdapter implements IStorageAdapter {
    private static instance: LocalStorageAdapter;
    private uploadDir: string;

    private constructor() {
        this.uploadDir = path.resolve(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    public static getInstance(): LocalStorageAdapter {
        if (!LocalStorageAdapter.instance) {
            LocalStorageAdapter.instance = new LocalStorageAdapter();
        }
        return LocalStorageAdapter.instance;
    }

    public destroy(): void {}

    /**
     * Maps a storage key to a path inside the upload directory.
     * Keys can contain user-supplied file names, so reject anything that escapes uploadDir.
     */
    private resolveKey(key: string): string {
        const filePath = path.resolve(this.uploadDir, String(key).replace(/^[\\/]+/, ''));
        if (filePath !== this.uploadDir && !filePath.startsWith(this.uploadDir + path.sep)) {
            throw new Error(`Invalid storage key: ${key}`);
        }
        return filePath;
    }

    public async uploadFile(
        key: string,
        body: Buffer | Uint8Array | string,
        contentType: string = 'application/octet-stream'
    ): Promise<{ key: string; url: string }> {
        const filePath = this.resolveKey(key);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let data: Buffer;
        if (typeof body === 'string') {
            data = Buffer.from(body, 'utf-8');
        } else if (Buffer.isBuffer(body)) {
            data = body;
        } else {
            data = Buffer.from(body);
        }

        await fs.promises.writeFile(filePath, data);
        const url = await this.getFileUrl(key);
        Logger.info(`[LocalStorageAdapter] Saved file locally: ${key}`);
        return { key, url };
    }

    public async uploadFromPath(key: string, filePath: string, contentType: string = 'application/octet-stream'): Promise<{ key: string; url: string }> {
        const target = this.resolveKey(key);
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.copyFile(filePath, target);
        const url = await this.getFileUrl(key);
        Logger.info(`[LocalStorageAdapter] Saved file locally: ${key}`);
        return { key, url };
    }

    public async getFileUrl(key: string, expiresIn?: number): Promise<string> {
        const domain = configService.domain || 'http://localhost:4000';
        return `${domain}/uploads/${key}`;
    }

    public async deleteFile(key: string): Promise<void> {
        const filePath = this.resolveKey(key);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }

    public async deleteFolder(prefix: string): Promise<void> {
        const folderPath = this.resolveKey(prefix);
        if (folderPath === this.uploadDir) throw new Error('Refusing to delete the upload root');
        if (fs.existsSync(folderPath)) {
            await fs.promises.rm(folderPath, { recursive: true, force: true });
        }
    }

    public async exists(key: string): Promise<boolean> {
        const filePath = this.resolveKey(key);
        return fs.existsSync(filePath);
    }

    public async listFiles(prefix?: string): Promise<Array<{ key: string; url: string; size?: number; lastModified?: Date }>> {
        return [];
    }

    public async getFileStream(key: string): Promise<any> {
        const filePath = this.resolveKey(key);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Local file not found: ${key}`);
        }
        return fs.createReadStream(filePath);
    }

    public async getUploadUrl(key: string, contentType?: string, expiresIn?: number): Promise<string> {
        return this.getFileUrl(key);
    }
}
