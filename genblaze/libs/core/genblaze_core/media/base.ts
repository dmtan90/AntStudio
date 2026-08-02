import { Buffer } from 'buffer';

export interface IMediaEmbedder {
    readonly mimeTypes: string[];
    embed(buffer: Buffer, canonicalHash: string, metadata?: Record<string, any>): Buffer;
    extract(buffer: Buffer): string | null;
}
