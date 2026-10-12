// Helpers shared by the ai feature routers (moved from ai.ts).
import mongoose from 'mongoose';
import multer from 'multer';
import axios from 'axios';
import { getFromS3 } from '../../utils/s3.js';
import { Media } from '../../models/Media.js';

// Buffered in memory: cap size so a single request can't exhaust the heap
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024, files: 5 } });


// Helper to clean and validate response
export const cleanResponse = (data: any[]) => {
    return data.map(item => typeof item === 'string' ? item.trim() : item).filter(item => item && item.length > 0);
};

/**
 * Helper to resolve media input (file upload or mediaId string) to Buffer and MimeType.
 * mediaId can be: Database ID, S3 Key, URL, or Base64 string.
 */
export async function resolveMediaInput(file?: Express.Multer.File, mediaId?: string): Promise<{ buffer: Buffer, mimeType: string }> {
    if (file) {
        return { buffer: file.buffer, mimeType: file.mimetype };
    }

    if (!mediaId) {
        throw new Error('No media input provided');
    }

    // 1. Check for Base64 (Data URI)
    if (mediaId.startsWith('data:')) {
        const matches = mediaId.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            return {
                mimeType: matches[1],
                buffer: Buffer.from(matches[2], 'base64')
            };
        }
    }

    // 2. Check if it's a Database ID
    let key = mediaId;
    let mimeType = 'video/mp4'; // Default fallback

    // Attempt to guess mimeType from extension if it's a URL/Key
    const ext = mediaId.split('.').pop()?.split('?')[0].toLowerCase();
    if (ext) {
        if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        else if (['mp4', 'webm', 'mov'].includes(ext)) mimeType = `video/${ext === 'mov' ? 'quicktime' : ext}`;
        else if (['mp3', 'wav', 'aac', 'ogg'].includes(ext)) mimeType = `audio/${ext === 'mp3' ? 'mpeg' : ext}`;
    }

    if (mediaId.length === 24 && mongoose.Types.ObjectId.isValid(mediaId)) {
        const media = await Media.findById(mediaId);
        if (media) {
            key = media.key;
            mimeType = media.contentType;
        }
    }

    // 3. Resolve Key/URL to Buffer
    if (key.startsWith('http')) {
        const response = await axios.get(key, { responseType: 'arraybuffer' });
        return { buffer: Buffer.from(response.data), mimeType };
    } else {
        const stream = await getFromS3(key);
        const chunks: any[] = [];
        for await (const chunk of (stream as any)) {
            chunks.push(chunk);
        }
        return { buffer: Buffer.concat(chunks), mimeType };
    }
}
