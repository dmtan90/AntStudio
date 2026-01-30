import { apiClient } from '../api/client';
import RNFS from 'react-native-fs';

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram';

interface UploadConfig {
    platform: SocialPlatform;
    videoPath: string;
    title: string;
    description: string;
    tags?: string[];
    privacy?: 'public' | 'unlisted' | 'private';
    thumbnailPath?: string;
}

class SocialSharingService {
    // Upload to YouTube
    async uploadToYouTube(config: Omit<UploadConfig, 'platform'>): Promise<{ videoId: string; url: string }> {
        try {
            // Read video file
            const videoData = await RNFS.readFile(config.videoPath, 'base64');

            // Upload to backend, which will handle YouTube API
            const response = await apiClient.post('/social/youtube/upload', {
                videoData,
                title: config.title,
                description: config.description,
                tags: config.tags || [],
                privacy: config.privacy || 'public',
            });

            return {
                videoId: response.data.videoId,
                url: response.data.url,
            };
        } catch (error) {
            console.error('YouTube upload failed:', error);
            throw new Error('Failed to upload to YouTube');
        }
    }

    // Upload to TikTok
    async uploadToTikTok(config: Omit<UploadConfig, 'platform'>): Promise<{ videoId: string; url: string }> {
        try {
            const videoData = await RNFS.readFile(config.videoPath, 'base64');

            const response = await apiClient.post('/social/tiktok/upload', {
                videoData,
                title: config.title,
                description: config.description,
                privacy: config.privacy || 'public',
            });

            return {
                videoId: response.data.videoId,
                url: response.data.url,
            };
        } catch (error) {
            console.error('TikTok upload failed:', error);
            throw new Error('Failed to upload to TikTok');
        }
    }

    // Upload to Instagram
    async uploadToInstagram(config: Omit<UploadConfig, 'platform'>): Promise<{ mediaId: string; url: string }> {
        try {
            const videoData = await RNFS.readFile(config.videoPath, 'base64');

            const response = await apiClient.post('/social/instagram/upload', {
                videoData,
                caption: `${config.title}\n\n${config.description}`,
            });

            return {
                mediaId: response.data.mediaId,
                url: response.data.url,
            };
        } catch (error) {
            console.error('Instagram upload failed:', error);
            throw new Error('Failed to upload to Instagram');
        }
    }

    // Generic upload method
    async upload(config: UploadConfig, onProgress?: (progress: number) => void): Promise<{ id: string; url: string }> {
        // Simulate progress
        const progressInterval = setInterval(() => {
            const currentProgress = Math.random() * 100;
            onProgress?.(currentProgress);
        }, 500);

        try {
            let result;

            switch (config.platform) {
                case 'youtube':
                    result = await this.uploadToYouTube(config);
                    break;
                case 'tiktok':
                    result = await this.uploadToTikTok(config);
                    break;
                case 'instagram':
                    result = await this.uploadToInstagram(config);
                    break;
                default:
                    throw new Error('Unsupported platform');
            }

            clearInterval(progressInterval);
            onProgress?.(100);

            return { id: result.videoId || result.mediaId, url: result.url };
        } catch (error) {
            clearInterval(progressInterval);
            throw error;
        }
    }

    // Check if platform is configured
    async isPlatformConfigured(platform: SocialPlatform): Promise<boolean> {
        try {
            const response = await apiClient.get(`/social/${platform}/status`);
            return response.data.configured;
        } catch (error) {
            return false;
        }
    }
}

export const socialSharingService = new SocialSharingService();
