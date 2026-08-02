import { Buffer } from 'buffer';
import { IMediaEmbedder } from './base.js';

export class Mp3Embedder implements IMediaEmbedder {
    readonly mimeTypes = ['audio/mpeg', 'audio/mp3'];

    public embed(buffer: Buffer, canonicalHash: string): Buffer {
        const tagHeader = Buffer.from(`\nID3v2-Genblaze-Canonical-Hash:${canonicalHash}\n`, 'utf-8');
        return Buffer.concat([tagHeader, buffer]);
    }

    public extract(buffer: Buffer): string | null {
        try {
            const contentStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 4096));
            const match = contentStr.match(/Genblaze-Canonical-Hash:([a-f0-9]{64})/i);
            return match ? match[1] : null;
        } catch (_) {
            return null;
        }
    }
}
