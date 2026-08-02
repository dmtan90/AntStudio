/** Asset model — a generated media artifact. 1:1 port of models/asset.py */

import crypto from 'crypto';
import { Buffer } from 'buffer';

const SHA256_HEX_CHARS = new Set('0123456789abcdef'.split(''));
const MEDIA_TYPE_RE = /^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.+-]*$/;

export function isValidSha256(value: string | null | undefined): boolean {
    return (
        typeof value === 'string' &&
        value.length === 64 &&
        value.split('').every(c => SHA256_HEX_CHARS.has(c))
    );
}

function isPositive(value: number | null | undefined): boolean {
    return value == null || value > 0;
}

function isFiniteNonnegative(value: number | null | undefined): boolean {
    return value == null || (isFinite(value) && value >= 0);
}

export interface WordTiming {
    word: string;
    start: number;
    end: number;
    confidence?: number | null;
}

export interface VideoMetadata {
    frameRate?: number | null;
    codec?: string | null;
    bitrate?: number | null;
    colorSpace?: string | null;
    hasAudio?: boolean | null;
    resolution?: string | null;
}

export interface AudioMetadata {
    sampleRate?: number | null;
    channels?: number | null;
    codec?: string | null;
    bitrate?: number | null;
    wordTimings?: WordTiming[] | null;
}

export interface Track {
    kind: string;
    codec?: string | null;
    label?: string | null;
}

export interface Asset {
    assetId: string;
    url: string;
    mediaType: string;
    sha256?: string | null;
    sizeBytes?: number | null;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    video?: VideoMetadata | null;
    audio?: AudioMetadata | null;
    tracks?: Track[] | null;
    metadata: Record<string, any>;
}

export function createAsset(data: Partial<Asset> & { url: string; mediaType: string }): Asset {
    return {
        assetId: data.assetId ?? crypto.randomUUID(),
        url: data.url,
        mediaType: data.mediaType,
        sha256: data.sha256 ?? null,
        sizeBytes: data.sizeBytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        duration: data.duration ?? null,
        video: data.video ?? null,
        audio: data.audio ?? null,
        tracks: data.tracks ?? null,
        metadata: data.metadata ?? {}
    };
}

export function setAssetHash(asset: Asset, data: Buffer): void {
    asset.sha256 = crypto.createHash('sha256').update(data).digest('hex');
    asset.sizeBytes = data.length;
}

export function isValidAssetMetadata(asset: Asset): boolean {
    if (!isPositive(asset.width) || !isPositive(asset.height)) return false;
    if (!isFiniteNonnegative(asset.duration)) return false;
    if (!MEDIA_TYPE_RE.test(asset.mediaType)) return false;
    if (asset.video != null) {
        if (!isFiniteNonnegative(asset.video.frameRate) || !isPositive(asset.video.bitrate)) {
            return false;
        }
    }
    if (asset.audio != null) {
        if (
            !isPositive(asset.audio.sampleRate) ||
            !isPositive(asset.audio.channels) ||
            !isPositive(asset.audio.bitrate)
        ) {
            return false;
        }
    }
    return true;
}
