import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_DIR = path.join(__dirname, '../../../tmp/ai-memory');

/**
 * Adapter for local, encrypted AI vector memory (Project RAG).
 */
export class VectorStoreAdapter {
    constructor() {
        if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    /**
     * Stores a memory chunk with encryption.
     */
    public async addMemory(userId: string, projectId: string, content: string, userKey: string) {
        const memoryId = crypto.randomUUID();
        const encryptedContent = this.encrypt(content, userKey);

        const memoryFile = path.join(MEMORY_DIR, `${projectId}_${memoryId}.mem`);
        fs.writeFileSync(memoryFile, JSON.stringify({
            userId,
            projectId,
            content: encryptedContent,
            createdAt: new Date()
        }));

        console.log(`💾 [VectorStore] Encrypted memory added for project: ${projectId}`);
    }

    /**
     * Retrieves all memories for a project and decrypts them.
     */
    public async recallMemories(projectId: string, userKey: string) {
        const files = fs.readdirSync(MEMORY_DIR).filter(f => f.startsWith(projectId));

        return files.map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, f), 'utf-8'));
            try {
                return { ...data, content: this.decrypt(data.content, userKey) };
            } catch {
                return { ...data, content: "[DECRYPTION FAILED]" };
            }
        });
    }

    private encrypt(text: string, key: string) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    private decrypt(text: string, key: string) {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}

export const vectorStoreAdapter = new VectorStoreAdapter();
