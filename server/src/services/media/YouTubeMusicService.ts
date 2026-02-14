import axios from 'axios';
import { UserPlatformAccount } from '../../models/UserPlatformAccount.js';
import { PlatformAuthService } from '../PlatformAuthService.js';

export interface YouTubeMusicSearchResult {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    publishedAt: string;
    url: string;
    duration?: number;
}

export class YouTubeMusicService {
    /**
     * Search for music on YouTube using user's connected account
     * @param userId - User ID
     * @param query - Search query
     * @param options - Search options
     */
    static async searchMusic(userId: string, query: string, options: {
        preferCovers?: boolean;
        language?: string;
        maxResults?: number;
    } = {}): Promise<YouTubeMusicSearchResult[]> {
        try {
            // Get user's YouTube account
            const account = await UserPlatformAccount.findOne({
                userId,
                platform: 'youtube',
                status: 'connected'
            });

            if (!account) {
                throw new Error('No connected YouTube account found. Please connect your YouTube account first.');
            }

            // Ensure valid token
            const credentials = await PlatformAuthService.getValidCredentials(account);

            // Build search query
            const searchQuery = options.preferCovers 
                ? `${query} cover ${options.language || ''}`
                : query;

            // Search YouTube Music category (10 = Music)
            const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: searchQuery,
                    type: 'video',
                    videoCategoryId: '10', // Music category
                    maxResults: options.maxResults || 10,
                    order: 'relevance',
                    safeSearch: 'none'
                },
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`
                }
            });

            const items = response.data.items || [];

            // Get video durations (requires separate API call)
            const videoIds = items.map((item: any) => item.id.videoId).join(',');
            let durationsMap = new Map();

            if (videoIds) {
                const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        part: 'contentDetails',
                        id: videoIds
                    },
                    headers: {
                        'Authorization': `Bearer ${credentials.accessToken}`
                    }
                });

                detailsResponse.data.items?.forEach((item: any) => {
                    const duration = this.parseDuration(item.contentDetails.duration);
                    durationsMap.set(item.id, duration);
                });
            }

            // Map to unified format
            return items.map((item: any) => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                duration: durationsMap.get(item.id.videoId)
            }));
        } catch (error: any) {
            console.error('YouTube music search error:', error);
            throw new Error(`Failed to search YouTube music: ${error.message}`);
        }
    }

    /**
     * Get video metadata including duration
     */
    static async getVideoMetadata(userId: string, videoId: string) {
        try {
            const account = await UserPlatformAccount.findOne({
                userId,
                platform: 'youtube',
                status: 'connected'
            });

            if (!account) {
                throw new Error('No connected YouTube account found');
            }

            const credentials = await PlatformAuthService.getValidCredentials(account);

            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'contentDetails,snippet,statistics',
                    id: videoId
                },
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`
                }
            });

            const video = response.data.items?.[0];
            if (!video) {
                throw new Error('Video not found');
            }

            return {
                duration: this.parseDuration(video.contentDetails.duration),
                title: video.snippet.title,
                channelTitle: video.snippet.channelTitle,
                viewCount: video.statistics.viewCount,
                likeCount: video.statistics.likeCount
            };
        } catch (error: any) {
            console.error('Metadata fetch error:', error);
            throw error;
        }
    }

    /**
     * Parse ISO 8601 duration to seconds
     * Example: PT1M30S -> 90 seconds
     */
    private static parseDuration(duration: string): number {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        return hours * 3600 + minutes * 60 + seconds;
    }
}
