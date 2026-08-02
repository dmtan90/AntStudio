import { Buffer } from 'buffer';
import { IMediaEmbedder } from './base.js';

export class WavEmbedder implements IMediaEmbedder {
    readonly mimeTypes = ['audio/wav'];

    public embed(buffer: Buffer, canonicalHash: string): Buffer {
        const tagHeader = Buffer.from(`RIFF-Genblaze-Canonical-Hash:${canonicalHash}`, 'utf-8');
        return Buffer.concat([buffer, tagHeader]);
    }

    public extract(buffer: Buffer): string | null {
        try {
            const contentStr = buffer.toString('utf-8', Math.max(0, buffer.length - 4096));
            const match = contentStr.match(/Genblaze-Canonical-Hash:([a-f0-9]{64})/i);
            return match ? match[1] : null;
        } catch (_) {
            return null;
        }
    }
}
