// Helpers and constants shared by the media feature routers (moved from media.ts).
import multer from 'multer';
import { AuthRequest } from '../../middleware/auth.js';

export const PROXY_MAX_BYTES = 512 * 1024 * 1024;

// Define the file filter function to update the filename encoding
export const fileFilter = (req: AuthRequest, file: any, callback: any) => {
    // Re-encode from latin1 (Multer's default behavior in older versions) to utf8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    callback(null, true); // Accept the file
};

export const upload = multer({
    fileFilter, storage: multer.memoryStorage(),
    // Buffered in memory (storage adapters take Buffers); keep well below the heap size
    limits: { fileSize: 1024 * 1024 * 1024, files: 2 }
}); // 1GB limit

// ============================================================================
// EXTERNAL APIS (GIPHY, PEXELS, UNSPLASH)
// ============================================================================

export const GIPHY_API_GIF_TRENDING = 'https://api.giphy.com/v1/gifs/trending';
export const GIPHY_API_GIF_SEARCH = 'https://api.giphy.com/v1/gifs/search';
export const GIPHY_API_STICKER_TRENDING = 'https://api.giphy.com/v1/stickers/trending';
export const GIPHY_API_STICKER_SEARCH = 'https://api.giphy.com/v1/stickers/search';
export const GIPHY_API_EMOJI = 'https://api.giphy.com/v2/emoji';

export enum GiphyType {
    GIF = 'gif',
    STICKER = 'sticker',
    EMOJI = 'emoji',
}

// ============================================================================
// PEXELS APIs
// ============================================================================

export const PEXELS_API_BASE_URL = 'https://api.pexels.com/v1';

// ============================================================================
// UNSPLASH APIs
// ============================================================================

export const UNSPLASH_API_BASE_URL = 'https://api.unsplash.com';
