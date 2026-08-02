import { Buffer } from 'buffer';
import { IMediaEmbedder } from './base.js';

export class PngEmbedder implements IMediaEmbedder {
    readonly mimeTypes = ['image/png'];

    public embed(buffer: Buffer, canonicalHash: string): Buffer {
        const key = 'Genblaze-Canonical-Hash';
        const textData = Buffer.from(`${key}\0${canonicalHash}`, 'latin1');
        
        const chunkLength = Buffer.alloc(4);
        chunkLength.writeUInt32BE(textData.length, 0);

        const chunkType = Buffer.from('tEXt', 'ascii');
        const crc = this.crc32(Buffer.concat([chunkType, textData]));
        const crcBuffer = Buffer.alloc(4);
        crcBuffer.writeUInt32BE(crc, 0);

        const tEXtChunk = Buffer.concat([chunkLength, chunkType, textData, crcBuffer]);
        
        // Insert after PNG Magic Header (8 bytes)
        return Buffer.concat([
            buffer.subarray(0, 8),
            tEXtChunk,
            buffer.subarray(8)
        ]);
    }

    public extract(buffer: Buffer): string | null {
        try {
            if (buffer.length < 8 || buffer.toString('hex', 0, 4) !== '89504e47') return null;
            let offset = 8;
            while (offset < buffer.length - 12) {
                const length = buffer.readUInt32BE(offset);
                const type = buffer.toString('ascii', offset + 4, offset + 8);
                if (type === 'tEXt') {
                    const textData = buffer.toString('latin1', offset + 8, offset + 8 + length);
                    if (textData.startsWith('Genblaze-Canonical-Hash\0')) {
                        return textData.split('\0')[1] || null;
                    }
                }
                offset += 12 + length;
            }
        } catch (_) {}
        return null;
    }

    private crc32(buf: Buffer): number {
        let crc = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            crc ^= buf[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
            }
        }
        return (crc ^ 0xffffffff) >>> 0;
    }
}
