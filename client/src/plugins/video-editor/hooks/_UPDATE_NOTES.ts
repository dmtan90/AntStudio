// Script to update all video editor hooks to use backend API endpoints
// This file documents the changes needed for each hook

/**
 * HOOKS TO UPDATE:
 *
 * 1. use-giphy-sticker.ts ✅ (import updated, need to replace GET_STICKER calls)
 *    - Replace GET_STICKER with api.get
 *    - Update URLs: /api/giphy -> /api/media/giphy/stickers
 *
 * 2. use-emoji.ts
 *    - Replace GET_EMOJI with api.get
 *    - Update URLs: /api/giphy -> /api/media/giphy/emoji
 *
 * 3. use-pixels-image.ts
 *    - Replace GET with api.get
 *    - Update URLs: /api/pexels -> /api/media/pexels/images
 *
 * 4. use-pixels-video.ts
 *    - Replace GET with api.get
 *    - Update URLs: /api/pexels -> /api/media/pexels/videos
 *
 * 5. use-unsplash-image.ts
 *    - Replace GET with api.get
 *    - Update URLs: /api/unsplash -> /api/media/unsplash/images
 *
 * 6. use-public-template.ts
 *    - Already uses api.get('/video-templates/all') - verify it works
 */

// Common pattern for all updates:
// 1. Replace import from 'video-editor/api/X' with import api from '@/utils/api'
// 2. Replace await GET_X(url) with await api.get(url)
// 3. Update response handling: response.data -> response.data.data
// 4. Update error handling: err.message -> err.response?.data?.error || err.message
// 5. Update endpoint URLs to use /api/media/* prefix
