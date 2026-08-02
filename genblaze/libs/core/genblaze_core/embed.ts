import crypto from 'crypto';
import { Buffer } from 'buffer';

export class MediaProvenanceEmbedder {
    public static embedProvenance(buffer: Buffer, mimeType: string, canonicalHash: string): Buffer {
        if (mimeType === 'image/png') {
            return this.embedPngChunk(buffer, canonicalHash);
        } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            return this.embedJpegApp1(buffer, canonicalHash);
        } else if (mimeType === 'video/mp4') {
            return this.embedMp4UuidAtom(buffer, canonicalHash);
        }
        
        const tagBuffer = Buffer.from(`\n<!-- Genblaze-Canonical-Hash:${canonicalHash} -->\n`, 'utf-8');
        return Buffer.concat([buffer, tagBuffer]);
    }

    public static extractProvenance(buffer: Buffer): string | null {
        const contentStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 8192)) +
                           buffer.toString('utf-8', Math.max(0, buffer.length - 8192));
                           
        const match = contentStr.match(/Genblaze-Canonical-Hash:([a-f0-9]{64})/i);
        return match ? match[1] : null;
    }

    private static embedPngChunk(pngBuffer: Buffer, hash: string): Buffer {
        const key = 'Genblaze-Canonical-Hash';
        const textData = Buffer.from(`${key}\0${hash}`, 'latin1');
        
        const chunkLength = Buffer.alloc(4);
        chunkLength.writeUInt32BE(textData.length, 0);

        const chunkType = Buffer.from('tEXt', 'ascii');
        const crc = this.crc32(Buffer.concat([chunkType, textData]));
        const crcBuffer = Buffer.alloc(4);
        crcBuffer.writeUInt32BE(crc, 0);

        const tEXtChunk = Buffer.concat([chunkLength, chunkType, textData, crcBuffer]);
        return Buffer.concat([pngBuffer.subarray(0, 8), tEXtChunk, pngBuffer.subarray(8)]);
    }

    private static embedJpegApp1(jpegBuffer: Buffer, hash: string): Buffer {
        const header = Buffer.from('Genblaze-Canonical-Hash:', 'utf-8');
        const hashBuf = Buffer.from(hash, 'utf-8');
        const payload = Buffer.concat([header, hashBuf]);

        const markerLength = Buffer.alloc(2);
        markerLength.writeUInt16BE(payload.length + 2, 0);

        const app1Marker = Buffer.concat([Buffer.from([0xff, 0xe1]), markerLength, payload]);
        return Buffer.concat([jpegBuffer.subarray(0, 2), app1Marker, jpegBuffer.subarray(2)]);
    }

    private static embedMp4UuidAtom(mp4Buffer: Buffer, hash: string): Buffer {
        const payload = Buffer.from(`Genblaze-Canonical-Hash:${hash}`, 'utf-8');
        const uuidMagic = Buffer.from('gblzhashmeta1234', 'ascii');
        
        const atomLength = Buffer.alloc(4);
        atomLength.writeUInt32BE(payload.length + 8 + 16, 0);
        const atomType = Buffer.from('uuid', 'ascii');

        const uuidAtom = Buffer.concat([atomLength, atomType, uuidMagic, payload]);
        return Buffer.concat([mp4Buffer, uuidAtom]);
    }

    private static crc32(buf: Buffer): number {
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
