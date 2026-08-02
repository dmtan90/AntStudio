import { Buffer } from 'buffer';
import { IMediaEmbedder } from './base.js';

export class Mp4Embedder implements IMediaEmbedder {
    readonly mimeTypes = ['video/mp4'];

    public embed(buffer: Buffer, canonicalHash: string): Buffer {
        const payload = Buffer.from(`Genblaze-Canonical-Hash:${canonicalHash}`, 'utf-8');
        const uuidMagic = Buffer.from('gblzhashmeta1234', 'ascii');
        
        const atomLength = Buffer.alloc(4);
        atomLength.writeUInt32BE(payload.length + 8 + 16, 0);
        const atomType = Buffer.from('uuid', 'ascii');

        const uuidAtom = Buffer.concat([atomLength, atomType, uuidMagic, payload]);
        return Buffer.concat([buffer, uuidAtom]);
    }

    public extract(buffer: Buffer): string | null {
        try {
            const contentStr = buffer.toString('utf-8', Math.max(0, buffer.length - 8192));
            const match = contentStr.match(/Genblaze-Canonical-Hash:([a-f0-9]{64})/i);
            return match ? match[1] : null;
        } catch (_) {
            return null;
        }
    }
}
