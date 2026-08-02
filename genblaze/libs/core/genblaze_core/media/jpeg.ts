import { Buffer } from 'buffer';
import { IMediaEmbedder } from './base.js';

export class JpegEmbedder implements IMediaEmbedder {
    readonly mimeTypes = ['image/jpeg', 'image/jpg'];

    public embed(buffer: Buffer, canonicalHash: string): Buffer {
        const header = Buffer.from('Genblaze-Canonical-Hash:', 'utf-8');
        const hashBuf = Buffer.from(canonicalHash, 'utf-8');
        const payload = Buffer.concat([header, hashBuf]);

        const markerLength = Buffer.alloc(2);
        markerLength.writeUInt16BE(payload.length + 2, 0);

        const app1Marker = Buffer.concat([Buffer.from([0xff, 0xe1]), markerLength, payload]);

        return Buffer.concat([
            buffer.subarray(0, 2),
            app1Marker,
            buffer.subarray(2)
        ]);
    }

    public extract(buffer: Buffer): string | null {
        try {
            const contentStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 8192));
            const match = contentStr.match(/Genblaze-Canonical-Hash:([a-f0-9]{64})/i);
            return match ? match[1] : null;
        } catch (_) {
            return null;
        }
    }
}
