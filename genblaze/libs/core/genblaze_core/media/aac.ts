/**
 * AAC/M4A media handler — embed/extract manifests via MP4 freeform atoms.
 * 1:1 port of media/aac.py
 */

export const AAC_FREEFORM_KEY = '----:genblaze:manifest';

export const AAC_CAPABILITIES = ['audio/aac', 'audio/mp4', 'audio/x-m4a'];

export interface AacHandlerOptions {
    maxManifestBytes?: number;
}

/**
 * AacHandler — Embed and extract manifests in AAC/M4A files via MP4 freeform atoms.
 *
 * Requires a native MP4 tag library (e.g., node-id3 or ffmpeg) to be available.
 * This port provides the interface and validation logic; actual byte-level
 * embed/extract can be wired to any compatible MP4 tag library.
 */
export class AacHandler {
    private maxManifestBytes: number;

    constructor(options: AacHandlerOptions = {}) {
        this.maxManifestBytes = options.maxManifestBytes ?? 10 * 1024 * 1024; // 10 MB
    }

    capabilities(): string[] {
        return AAC_CAPABILITIES;
    }

    mediaCapabilities(): Array<{
        mimeType: string;
        maxPayloadBytes: number | null;
        metadataLocation: string;
        stripRisk: string;
    }> {
        return AAC_CAPABILITIES.map(mime => ({
            mimeType: mime,
            maxPayloadBytes: null,
            metadataLocation: 'MP4 freeform atom',
            stripRisk: 'medium'
        }));
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
