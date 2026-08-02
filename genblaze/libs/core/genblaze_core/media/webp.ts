/**
 * WebP media handler — embed/extract manifests via XMP metadata.
 * 1:1 port of media/webp.py
 */

export const WEBP_CAPABILITIES = ['image/webp'];

export interface WebPHandlerOptions {
    maxManifestBytes?: number;
}

/**
 * WebPHandler — Embed and extract manifests in WebP files via XMP metadata.
 *
 * WebP images support XMP metadata which can store arbitrary XML/RDF data.
 * The manifest JSON is embedded as a custom XMP field.
 */
export class WebPHandler {
    private maxManifestBytes: number;

    constructor(options: WebPHandlerOptions = {}) {
        this.maxManifestBytes = options.maxManifestBytes ?? 10 * 1024 * 1024;
    }

    capabilities(): string[] {
        return WEBP_CAPABILITIES;
    }

    mediaCapabilities(): Array<{
        mimeType: string;
        maxPayloadBytes: number | null;
        metadataLocation: string;
        stripRisk: string;
    }> {
        return [{
            mimeType: 'image/webp',
            maxPayloadBytes: null,
            metadataLocation: 'XMP metadata',
            stripRisk: 'medium'
        }];
    }

    buildXmpPayload(manifestJson: string): string {
        const escaped = manifestJson
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:genblaze="https://genblaze.ai/xmp/1.0/">
      <genblaze:manifest>${escaped}</genblaze:manifest>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
    }

    extractFromXmp(xmpStr: string): string | null {
        const match = xmpStr.match(/<genblaze:manifest>([\s\S]*?)<\/genblaze:manifest>/);
        if (!match) return null;
        return match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
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
