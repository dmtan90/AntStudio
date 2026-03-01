import axios from 'axios';
import { Logger } from '../../utils/Logger.js';

interface YouTubeLiveConfig {
    apiKey: string;
    accessToken: string;
}

interface LiveBroadcast {
    id: string;
    title: string;
    description: string;
    streamKey: string;
    streamUrl: string;
    status: string;
}

class YouTubeLiveService {
    private apiKey: string;
    private accessToken: string;
    private baseUrl = 'https://www.googleapis.com/youtube/v3';

    constructor(config: YouTubeLiveConfig) {
        this.apiKey = config.apiKey;
        this.accessToken = config.accessToken;
    }

    // Create a new live broadcast
    async createBroadcast(title: string, description: string, privacy: 'public' | 'unlisted' | 'private'): Promise<LiveBroadcast> {
        try {
            // Create broadcast
            const broadcastResponse = await axios.post(
                `${this.baseUrl}/liveBroadcasts`,
                {
                    snippet: {
                        title,
                        description,
                        scheduledStartTime: new Date().toISOString(),
                    },
                    status: {
                        privacyStatus: privacy,
                    },
                    contentDetails: {
                        enableAutoStart: true,
                        enableAutoStop: true,
                    },
                },
                {
                    params: {
                        part: 'snippet,status,contentDetails',
                        key: this.apiKey,
                    },
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const broadcast = broadcastResponse.data;

            // Create stream
            const streamResponse = await axios.post(
                `${this.baseUrl}/liveStreams`,
                {
                    snippet: {
                        title: `${title} - Stream`,
                    },
                    cdn: {
                        frameRate: '30fps',
                        ingestionType: 'rtmp',
                        resolution: '720p',
                    },
                },
                {
                    params: {
                        part: 'snippet,cdn',
                        key: this.apiKey,
                    },
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const stream = streamResponse.data;

            // Bind broadcast to stream
            await axios.post(
                `${this.baseUrl}/liveBroadcasts/bind`,
                {},
                {
                    params: {
                        id: broadcast.id,
                        streamId: stream.id,
                        part: 'id,snippet,status',
                        key: this.apiKey,
                    },
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                }
            );

            return {
                id: broadcast.id,
                title: broadcast.snippet.title,
                description: broadcast.snippet.description,
                streamKey: stream.cdn.ingestionInfo.streamName,
                streamUrl: stream.cdn.ingestionInfo.ingestionAddress,
                status: broadcast.status.lifeCycleStatus,
            };
        } catch (error) {
            Logger.error('Failed to create YouTube broadcast:', 'YouTubeLiveService', error);
            throw new Error('Failed to create YouTube live broadcast');
        }
    }

    // Update broadcast status
    async updateBroadcastStatus(broadcastId: string, status: 'live' | 'complete'): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/liveBroadcasts/transition`,
                {},
                {
                    params: {
                        broadcastStatus: status,
                        id: broadcastId,
                        part: 'status',
                        key: this.apiKey,
                    },
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                }
            );
        } catch (error) {
            Logger.error('Failed to update broadcast status:', 'YouTubeLiveService', error);
            throw new Error('Failed to update YouTube broadcast status');
        }
    }

    // Get broadcast analytics
    async getBroadcastAnalytics(broadcastId: string): Promise<any> {
        try {
            const response = await axios.get(`${this.baseUrl}/videos`, {
                params: {
                    part: 'statistics,liveStreamingDetails',
                    id: broadcastId,
                    key: this.apiKey,
                },
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });

            const video = response.data.items[0];

            return {
                viewCount: parseInt(video.statistics.viewCount || '0'),
                likeCount: parseInt(video.statistics.likeCount || '0'),
                commentCount: parseInt(video.statistics.commentCount || '0'),
                concurrentViewers: parseInt(video.liveStreamingDetails?.concurrentViewers || '0'),
            };
        } catch (error) {
            Logger.error('Failed to get broadcast analytics:', 'YouTubeLiveService', error);
            return null;
        }
    }

    // Upload video to YouTube
    async uploadVideo(params: {
        videoUrl: string;
        title: string;
        description: string;
        tags: string[];
        privacyStatus: string;
    }): Promise<{ id: string }> {
        try {
            // For file-based uploads, we need to use resumable upload
            // This is a simplified version - in production, implement resumable upload protocol
            const response = await axios.post(
                `${this.baseUrl}/videos`,
                {
                    snippet: {
                        title: params.title,
                        description: params.description,
                        tags: params.tags,
                        categoryId: '22', // People & Blogs
                    },
                    status: {
                        privacyStatus: params.privacyStatus,
                        selfDeclaredMadeForKids: false,
                    },
                },
                {
                    params: {
                        part: 'snippet,status',
                        key: this.apiKey,
                    },
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                id: response.data.id,
            };
        } catch (error: any) {
            Logger.error('Failed to upload video to YouTube:', 'YouTubeLiveService', error.response?.data || error);
            throw new Error(error.response?.data?.error?.message || 'Failed to upload video to YouTube');
        }
    }

    // Delete broadcast
    async deleteBroadcast(broadcastId: string): Promise<void> {
        try {
            await axios.delete(`${this.baseUrl}/liveBroadcasts`, {
                params: {
                    id: broadcastId,
                    key: this.apiKey,
                },
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
        } catch (error) {
            Logger.error('Failed to delete broadcast:', 'YouTubeLiveService', error);
            throw new Error('Failed to delete YouTube broadcast');
        }
    }
}

export default YouTubeLiveService;
