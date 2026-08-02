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

    public async uploadFile(
        key: string,
        body: Buffer | Uint8Array | string,
        contentType: string = 'application/octet-stream'
    ): Promise<{ key: string; url: string }> {
        const filePath = path.join(this.uploadDir, key);
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

    public async getFileUrl(key: string, expiresIn?: number): Promise<string> {
        const domain = configService.domain || 'http://localhost:4000';
        return `${domain}/uploads/${key}`;
    }

    public async deleteFile(key: string): Promise<void> {
        const filePath = path.join(this.uploadDir, key);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }

    public async deleteFolder(prefix: string): Promise<void> {
        const folderPath = path.join(this.uploadDir, prefix);
        if (fs.existsSync(folderPath)) {
            await fs.promises.rm(folderPath, { recursive: true, force: true });
        }
    }

    public async exists(key: string): Promise<boolean> {
        const filePath = path.join(this.uploadDir, key);
        return fs.existsSync(filePath);
    }

    public async listFiles(prefix?: string): Promise<Array<{ key: string; url: string; size?: number; lastModified?: Date }>> {
        return [];
    }

    public async getFileStream(key: string): Promise<any> {
        const filePath = path.join(this.uploadDir, key);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Local file not found: ${key}`);
        }
        return fs.createReadStream(filePath);
    }

    public async getUploadUrl(key: string, contentType?: string, expiresIn?: number): Promise<string> {
        return this.getFileUrl(key);
    }
}
