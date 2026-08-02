export enum TrustMode {
    CANONICAL_HASH = 'canonical_hash',
    EMBEDDED_METADATA = 'embedded_metadata',
    STRICT_VERIFY = 'strict_verify'
}

export enum KeyStrategy {
    HIERARCHICAL = 'hierarchical',
    FLAT = 'flat',
    CONTENT_ADDRESSABLE = 'content_addressable'
}

export interface GenblazeAsset {
    id: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    modality: string;
    createdAt: string;
    embeddedProvenance?: boolean;
}

export interface StepParams {
    model: string;
    prompt: string;
    modality: string;
    params?: Record<string, any>;
    fallbackModels?: string[];
}
