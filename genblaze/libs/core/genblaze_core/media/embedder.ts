import { Buffer } from 'buffer';
import { PngEmbedder } from './png.js';
import { JpegEmbedder } from './jpeg.js';
import { Mp4Embedder } from './mp4.js';
import { Mp3Embedder } from './mp3.js';
import { WavEmbedder } from './wav.js';

export class MediaProvenanceEmbedder {
    private static png = new PngEmbedder();
    private static jpeg = new JpegEmbedder();
    private static mp4 = new Mp4Embedder();
    private static mp3 = new Mp3Embedder();
    private static wav = new WavEmbedder();

    public static embedProvenance(buffer: Buffer, mimeType: string, canonicalHash: string): Buffer {
        if (mimeType === 'image/png') {
            return this.png.embed(buffer, canonicalHash);
        } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            return this.jpeg.embed(buffer, canonicalHash);
        } else if (mimeType === 'video/mp4') {
            return this.mp4.embed(buffer, canonicalHash);
        } else if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') {
            return this.mp3.embed(buffer, canonicalHash);
        } else if (mimeType === 'audio/wav') {
            return this.wav.embed(buffer, canonicalHash);
        }
        
        const tagBuffer = Buffer.from(`\n<!-- Genblaze-Canonical-Hash:${canonicalHash} -->\n`, 'utf-8');
        return Buffer.concat([buffer, tagBuffer]);
    }

    public static extractProvenance(buffer: Buffer): string | null {
        const pngHash = this.png.extract(buffer);
        if (pngHash) return pngHash;

        const jpegHash = this.jpeg.extract(buffer);
        if (jpegHash) return jpegHash;

        const mp4Hash = this.mp4.extract(buffer);
        if (mp4Hash) return mp4Hash;

        const mp3Hash = this.mp3.extract(buffer);
        if (mp3Hash) return mp3Hash;

        const wavHash = this.wav.extract(buffer);
        if (wavHash) return wavHash;

        const contentStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 8192)) +
                           buffer.toString('utf-8', Math.max(0, buffer.length - 8192));
                           
        const match = contentStr.match(/Genblaze-Canonical-Hash:([a-f0-9]{64})/i);
        return match ? match[1] : null;
    }
}
