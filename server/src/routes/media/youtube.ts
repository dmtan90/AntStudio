// YouTube music search, metadata and audio (moved verbatim from routes/media.ts).
// Mounted by media.ts.
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { YouTubeMusicService } from '../../services/streaming/YouTubeMusicService.js';
import { LyricsService, LyricsLine } from '../../services/streaming/LyricsService.js';
import { AudioExtractionService } from '../../services/streaming/AudioExtractionService.js';
import { Logger } from '../../utils/Logger.js';

const router = Router();

/**
 * Search YouTube music
 * POST /api/media/youtube/search
 */
router.post('/youtube/search', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { query, preferCovers, language, maxResults } = req.body;
        const userId = req.user?.userId;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const results = await YouTubeMusicService.searchMusic(userId, query, {
            preferCovers: preferCovers !== false, // Default to true
            language: language || 'vietnamese',
            maxResults: maxResults || 10
        });

        res.json(results);
    } catch (error: any) {
        Logger.error('YouTube search error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ error: error.message || 'Failed to search YouTube music', requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * Get trending YouTube music
 * GET /api/media/youtube/trending
 */
router.get('/youtube/trending', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { region, maxResults } = req.query;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const results = await YouTubeMusicService.getTrendingMusic(userId, {
            regionCode: region as string || 'VN',
            maxResults: parseInt(maxResults as string) || 20
        });

        res.json(results);
    } catch (error: any) {
        Logger.error('YouTube trending error:', error);
        res.status(error.requiresReauth ? 401 : 500).json({ error: error.message || 'Failed to fetch trending music', requiresReauth: error.requiresReauth || false, platform: error.platform });
    }
});

/**
 * Get video metadata and lyrics
 * POST /api/media/youtube/metadata
 */
router.post('/youtube/metadata', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { videoId, fetchLyrics, songTitle, lyricsLanguage } = req.body;
        const userId = req.user?.userId;

        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get video metadata
        const metadata = await YouTubeMusicService.getVideoMetadata(userId, videoId);

        // Fetch lyrics if requested
        let lyrics = '';
        let lyricsLines: LyricsLine[] = [];

        if (fetchLyrics) {
            try {
                const preferredLang = lyricsLanguage || 'en';
                const preferredLangs = preferredLang ? preferredLang.split(',').map((l: string) => l.trim()) : ['vi', 'en'];

                // 1. Primary: getLyricsV2 via @playzone/youtube-transcript + Invidious (fastest, exact captions)
                lyrics = await AudioExtractionService.getLyricsV2(videoId, preferredLangs) || '';
                if (lyrics) {
                    Logger.info(`[MediaRoute] Found getLyricsV2 captions for ${videoId}`);
                }

                // 2. Fallback: Gemini AI with Google Search grounding (best for songs without official captions)
                if (!lyrics && (songTitle || metadata.title)) {
                    Logger.info(`[MediaRoute] getLyricsV2 failed for ${videoId}, trying Gemini...`);
                    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    lyrics = await LyricsService.searchLyrics(songTitle || metadata.title, metadata.channelTitle, youtubeUrl, preferredLang);
                    if (lyrics) {
                        Logger.info(`[MediaRoute] Found Gemini grounded lyrics for ${videoId}`);
                    }
                }

                // 3. Last resort: yt-dlp subprocess (slowest, but works when others fail)
                if (!lyrics) {
                    Logger.info(`[MediaRoute] Gemini failed for ${videoId}, falling back to yt-dlp...`);
                    lyrics = await AudioExtractionService.getLyrics(videoId, preferredLangs.join(',')) || '';
                    if (lyrics) {
                        Logger.info(`[MediaRoute] Found yt-dlp fallback lyrics for ${videoId}`);
                    }
                }

                if (lyrics) {
                    lyricsLines = await LyricsService.syncLyrics(lyrics, metadata.duration);
                }
            } catch (error) {
                Logger.warn('Lyrics fetch failed:', error);
                // Continue without lyrics
            }
        }

        Logger.info(`[MediaRoute] Returning metadata for ${videoId}: found ${lyricsLines.length} lyrics lines`);

        res.json({
            ...metadata,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            lyrics,
            lyricsLines
        });
    } catch (error: any) {
        Logger.error('Metadata fetch error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch video metadata' });
    }
});

/**
 * Extract audio from YouTube
 * POST /api/media/youtube/extract-audio
 */
router.post('/youtube/extract-audio', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { videoId } = req.body;
        const userId = req.user?.userId;

        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const result = await AudioExtractionService.extractAudio(videoId, userId);
        res.json(result);
    } catch (error: any) {
        Logger.error('Audio extraction error:', error);
        res.status(500).json({ error: error.message || 'Failed to extract audio' });
    }
});

/**
 * Stream audio from YouTube
 * GET /api/media/youtube/stream/:videoId
 */
router.get('/youtube/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).send('Video ID is required');
        }
        await AudioExtractionService.streamAudio(videoId, res);
    } catch (error: any) {
        Logger.error('Audio streaming error:', error);
        res.status(500).send('Streaming failed');
    }
});

export default router;
