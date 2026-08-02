/**
 * FLAC media handler — embed/extract manifests via VORBIS_COMMENT blocks.
 * 1:1 port of media/flac.py
 */

export const FLAC_COMMENT_KEY = 'GENBLAZE_MANIFEST';

export const FLAC_CAPABILITIES = ['audio/flac', 'audio/x-flac'];

export interface FlacHandlerOptions {
    maxManifestBytes?: number;
}

/**
 * FlacHandler — Embed and extract manifests in FLAC files via VORBIS_COMMENT blocks.
 *
 * FLAC stores text tags as UTF-8 key=value pairs in a VORBIS_COMMENT block.
 * The manifest JSON is base64-encoded and stored as GENBLAZE_MANIFEST.
 */
export class FlacHandler {
    private maxManifestBytes: number;

    constructor(options: FlacHandlerOptions = {}) {
        this.maxManifestBytes = options.maxManifestBytes ?? 10 * 1024 * 1024;
    }

    capabilities(): string[] {
        return FLAC_CAPABILITIES;
    }

    mediaCapabilities(): Array<{
        mimeType: string;
        maxPayloadBytes: number | null;
        metadataLocation: string;
        stripRisk: string;
    }> {
        return FLAC_CAPABILITIES.map(mime => ({
            mimeType: mime,
            maxPayloadBytes: null,
            metadataLocation: 'VORBIS_COMMENT block',
            stripRisk: 'medium'
        }));
    }

    encodePayload(jsonStr: string): string {
        return Buffer.from(jsonStr, 'utf-8').toString('base64');
    }

    decodePayload(b64: string): string {
        return Buffer.from(b64, 'base64').toString('utf-8');
    }

    validateManifestPayload(payload: Buffer): void {
        if (payload.length > this.maxManifestBytes) {
            throw new Error(
                `Embedded manifest exceeds size limit ` +
                `(${payload.length} > ${this.maxManifestBytes} bytes)`
            );
        }
    }
}
