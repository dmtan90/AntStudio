import axios from 'axios';
import crypto from 'crypto';
import { SocialPlatform, UserPlatformAccount } from '../models/UserPlatformAccount.js';
import { getAdminSettings } from '../models/AdminSettings.js';

interface PlatformConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    scope: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Fallback for dev

export class PlatformAuthService {
    /**
     * Get OAuth Configuration dynamically
     */
    private static async getConfig(platform: SocialPlatform) {
        const settings = await getAdminSettings();
        const apiConfig = settings.apiConfigs;
        const oauth = apiConfig.oauth;
        const domain = apiConfig.publicDomain || process.env.FRONTEND_URL || 'http://localhost:5173';

        // Ensure NO trailing slash for domain
        const baseUrl = domain.replace(/\/$/, '');

        switch (platform) {
            case SocialPlatform.YOUTUBE:
            case 'google' as any: // Handle legacy or generic google
                if (!oauth.google.enabled) throw new Error('Google OAuth is disabled in Admin Settings');
                return {
                    clientId: oauth.google.clientId,
                    clientSecret: oauth.google.clientSecret,
                    redirectUri: oauth.google.redirectUriOverride || `${baseUrl}/platforms/callback/youtube`,
                    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                    tokenUrl: 'https://oauth2.googleapis.com/token',
                    scope: 'openid email https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload'
                };
            case SocialPlatform.FACEBOOK:
                if (!oauth.facebook.enabled) throw new Error('Facebook OAuth is disabled in Admin Settings');
                return {
                    clientId: oauth.facebook.appId,
                    clientSecret: oauth.facebook.appSecret,
                    redirectUri: `${baseUrl}/platforms/callback/facebook`,
                    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
                    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
                    scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts'
                };
            case SocialPlatform.TIKTOK:
                if (!oauth.tiktok.enabled) throw new Error('TikTok OAuth is disabled in Admin Settings');
                return {
                    clientId: oauth.tiktok.clientKey,
                    clientSecret: oauth.tiktok.clientSecret, // Fix typo in previous thought, wait schema key is tiktok
                    redirectUri: `${baseUrl}/platforms/callback/tiktok`,
                    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
                    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
                    scope: 'user.info.basic,video.list,video.upload'
                };
            default:
                throw new Error(`Platform ${platform} configuration not found`);
        }
    }

    /**
     * Get OAuth Authorization URL
     */
    static async getAuthUrl(platform: SocialPlatform): Promise<string> {
        const config = await this.getConfig(platform);

        // Handle TikTok slight diff if needed, but standard params usually work. 
        // TikTok uses client_key instead of client_id in some docs, but let's check.
        // TikTok V2 Auth: client_key, redirect_uri, scope, response_type=code, state

        const params: any = {
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scope,
            state: 'random_state_string'
        };

        if (platform === SocialPlatform.TIKTOK) {
            params.client_key = config.clientId;
        } else {
            params.client_id = config.clientId;
            params.access_type = 'offline'; // Google specific
            params.prompt = 'consent'; // Force consent to ensure refresh_token is provided
            params.include_granted_scopes = 'true'; // Google specific
        }

        const qs = new URLSearchParams(params).toString();
        return `${config.authUrl}?${qs}`;
    }

    /**
     * Exchange code for tokens
     */
    static async exchangeCode(platform: SocialPlatform, code: string): Promise<any> {
        const config = await this.getConfig(platform);

        const params = new URLSearchParams();
        params.append('code', code);
        params.append('redirect_uri', config.redirectUri);
        params.append('grant_type', 'authorization_code');

        if (platform === SocialPlatform.TIKTOK) {
            params.append('client_key', config.clientId);
            params.append('client_secret', config.clientSecret);
        } else {
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);
        }

        const response = await axios.post(config.tokenUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        return response.data;
    }

    /**
     * Refresh OAuth Token
     */
    static async refreshOAuthToken(platform: SocialPlatform, refreshToken: string): Promise<any> {
        const config = await this.getConfig(platform);

        const params = new URLSearchParams();
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);
        params.append('refresh_token', refreshToken);
        params.append('grant_type', 'refresh_token');

        try {
            const response = await axios.post(config.tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            return response.data;
        } catch (error: any) {
            console.error(`Failed to refresh token for ${platform}:`, error.response?.data || error.message);
            throw new Error('Failed to refresh access token');
        }
    }

    /**
     * Ensure Account has Valid Token (Refresh if needed)
     * Updates the database if token is refreshed
     */
    static async getValidCredentials(account: any, forceRefresh: boolean = false): Promise<any> {
        console.log(`[Token Check] START - Platform: ${account.platform}, Account: ${account.accountName || account._id}, Force: ${forceRefresh}`);
        console.log(`[Token Check] Has refreshToken: ${!!account.credentials?.refreshToken}, Has expiresAt: ${!!account.credentials?.expiresAt}`);

        // If not an OAuth platform or no refresh token, return existing
        if (!account.credentials.refreshToken || !account.credentials.expiresAt) {
            if (forceRefresh) {
                console.error(`[Token Check] CRITICAL - Force refresh requested but no refreshToken exists for ${account.platform}`);
                throw new Error(`Account connection expired and no refresh token available. Please reconnect your ${account.platform} account.`);
            }
            console.log(`[Token Check] EARLY RETURN - Missing refreshToken or expiresAt, returning existing credentials`);
            return account.credentials;
        }

        const expiresAt = new Date(account.credentials.expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        console.log(`[Token Check] Platform: ${account.platform}, Account: ${account.accountName || account._id}`);
        console.log(`[Token Check] Expires at: ${new Date(expiresAt).toISOString()}, Time until expiry: ${Math.round(timeUntilExpiry / 1000)}s`);
        console.log(`[Token Check] Force refresh: ${forceRefresh}, Will refresh: ${forceRefresh || timeUntilExpiry < 5 * 60 * 1000}`);

        // Refresh if forced or expired or expiring in 5 minutes
        if (forceRefresh || timeUntilExpiry < 5 * 60 * 1000) {
            console.log(`[Token Refresh] Starting token refresh for ${account.platform} (${account.accountName || account._id})`);
            try {
                const tokens = await this.refreshOAuthToken(account.platform, account.credentials.refreshToken);
                console.log(`[Token Refresh] Successfully refreshed token for ${account.platform}`);

                // Update Account in DB
                account.credentials.accessToken = tokens.access_token;
                if (tokens.refresh_token) {
                    account.credentials.refreshToken = tokens.refresh_token;
                }
                account.credentials.expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

                // We need to save this. Since we received a mongoose document or a plain object?
                // The caller in platforms.ts passes a mongoose doc usually.
                if (typeof account.save === 'function') {
                    await account.save();
                } else {
                    // If it's a plain object, we can't save here. 
                    // We should rely on the caller passing a Mongoose Document.
                    // Or we explicitly update via model here if we had the ID.
                    // For now, assume it's a doc or the caller handles it.
                    // Actually, let's just import UserPlatformAccount and update if we have _id
                    if (account._id) {
                        await UserPlatformAccount.findByIdAndUpdate(account._id, {
                            $set: { credentials: account.credentials }
                        });
                    }
                }

                console.log(`[Token Refresh] Token saved to database for ${account.platform}`);
                return account.credentials;
            } catch (error) {
                console.error(`[Token Refresh] Failed to refresh token for ${account.platform}:`, error);
                // If refresh fails (revoked), we might want to mark account as error?
                // For now, throw so the user knows.
                throw error;
            }
        }

        console.log(`[Token Check] Using existing valid token for ${account.platform}`);
        return account.credentials;
    }

    /**
     * User Profile from Platform
     */
    static async getUserProfile(platform: SocialPlatform, accessToken: string): Promise<{ id: string, name: string, avatar?: string, email?: string }> {
        switch (platform) {
            case SocialPlatform.YOUTUBE:
                try {
                    const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
                        headers: { Authorization: `Bearer ${accessToken} ` }
                    });

                    // Add a call to userinfo to get email
                    let email = undefined;
                    try {
                        const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        email = userRes.data.email;
                    } catch (e) {
                        console.error('Failed to get user email via userinfo:', e);
                    }

                    const channel = ytRes.data.items?.[0]?.snippet;
                    // If no channel found, it returns empty items list, handled by optional chaining
                    if (!ytRes.data.items?.length) {
                        return { id: 'no-channel', name: 'No YouTube Channel', email };
                    }
                    return {
                        id: ytRes.data.items?.[0]?.id,
                        name: channel?.title || 'YouTube Channel',
                        avatar: channel?.thumbnails?.default?.url,
                        email
                    };
                } catch (error: any) {
                    if (error.response?.status === 403) {
                        throw new Error('YouTube Data API v3 is not enabled. Please enable it in Google Cloud Console.');
                    }
                    throw error;
                }

            case SocialPlatform.FACEBOOK:
                const fbRes = await axios.get('https://graph.facebook.com/me?fields=id,name,email,picture', {
                    headers: { Authorization: `Bearer ${accessToken} ` }
                });
                return {
                    id: fbRes.data.id,
                    name: fbRes.data.name,
                    avatar: fbRes.data.picture?.data?.url,
                    email: fbRes.data.email
                };

            case SocialPlatform.TIKTOK:
                const ttRes = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const ttUser = ttRes.data.data?.user;
                return {
                    id: ttUser?.open_id || 'unknown',
                    name: ttUser?.display_name || 'TikTok User',
                    avatar: ttUser?.avatar_url
                };

            default:
                return { id: 'unknown', name: 'Unknown User' };
        }
    }

    /**
     * Verify AMS
     */
    static async verifyAMS(url: string, email: string, pass: string): Promise<boolean> {
        try {
            // Normalize URL
            const baseUrl = url.replace(/\/$/, '');
            const hashedPassword = crypto.createHash('md5').update(pass).digest('hex');

            // AMS Auth Endpoint
            const res = await axios.post(`${baseUrl}/rest/v2/users/authenticate`, {
                email: email,
                password: hashedPassword
            });

            return res.data.success === true;
        } catch (e) {
            console.error('AMS Verification Failed:', e);
            throw new Error('Failed to authenticate with Ant Media Server. Check credentials and URL.');
        }
    }

    /**
     * Fetch Videos/VoDs from Platform
     */
    /**
     * Fetch Videos/VoDs from Platform with Pagination & Search
     */
    static async getVideos(platform: SocialPlatform, credentials: any, options: { page?: number, limit?: number, search?: string, sort?: string } = {}): Promise<{ videos: any[], total: number }> {
        const { accessToken, serverUrl, email, password, appName } = credentials;
        const page = options.page || 1;
        const limit = options.limit || 12;
        const search = options.search?.toLowerCase() || '';

        switch (platform) {
            case SocialPlatform.YOUTUBE:
                // 1. Fetch all uploads (or a large batch) then slice in memory
                // YouTube API is complex for offset-based pagination. 
                // We'll fetch 50 items (max) or maybe two pages if needed, but for now let's stick to 50 max for "Browse" mode.
                // If search is present, we might need search.list instead of playlistItems.

                let items: any[] = [];

                if (search) {
                    // Search API
                    const searchRes = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&q=${encodeURIComponent(search)}&maxResults=50`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    items = searchRes.data.items.map((item: any) => ({ ...item, id: item.id.videoId }));
                } else {
                    // Playlist API (Uploads)
                    const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true', {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    const uploadPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
                    const vidRes = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadPlaylistId}&maxResults=50`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    items = vidRes.data.items.map((item: any) => ({ ...item, id: item.snippet.resourceId.videoId }));
                }

                // Map to unified format
                let ytVideos = items.map((item: any) => ({
                    id: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.medium?.url,
                    publishedAt: item.snippet.publishedAt,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    views: 0, // Will be populated below
                    platform: 'youtube'
                }));

                // Fetch statistics for all videos in batch
                if (ytVideos.length > 0) {
                    try {
                        const videoIds = ytVideos.map(v => v.id).join(',');
                        const statsRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}`, {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });

                        // Map stats back to videos
                        const statsMap = new Map();
                        statsRes.data.items?.forEach((item: any) => {
                            statsMap.set(item.id, {
                                views: parseInt(item.statistics.viewCount || '0'),
                                likes: parseInt(item.statistics.likeCount || '0'),
                                comments: parseInt(item.statistics.commentCount || '0')
                            });
                        });

                        ytVideos = ytVideos.map(video => ({
                            ...video,
                            views: statsMap.get(video.id)?.views || 0,
                            stats: statsMap.get(video.id)
                        }));
                    } catch (error) {
                        console.error('Failed to fetch video statistics:', error);
                    }
                }

                // Client-side Sort
                if (options.sort === 'date' || !options.sort) {
                    ytVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
                } else if (options.sort === 'views') {
                    ytVideos.sort((a, b) => b.views - a.views);
                }

                // Client-side Pagination
                const ytTotal = ytVideos.length; // Approximate total in this batch
                const startIndex = (page - 1) * limit;
                const slicedYt = ytVideos.slice(startIndex, startIndex + limit);

                return { videos: slicedYt, total: ytTotal };

            case SocialPlatform.FACEBOOK:
                const fbRes = await axios.get('https://graph.facebook.com/me/videos?fields=id,title,description,picture,created_time,permalink_url,views', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                let fbVideos = fbRes.data.data.map((item: any) => ({
                    id: item.id,
                    title: item.title || 'Untitled Video',
                    description: item.description,
                    thumbnail: item.picture,
                    publishedAt: item.created_time,
                    url: `https://facebook.com${item.permalink_url}`,
                    views: item.views || 0,
                    platform: 'facebook'
                }));

                // Filter
                if (search) {
                    fbVideos = fbVideos.filter((v: any) => v.title.toLowerCase().includes(search));
                }

                // Sort
                if (options.sort === 'views') {
                    fbVideos.sort((a: any, b: any) => b.views - a.views);
                } else {
                    fbVideos.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
                }

                const fbTotal = fbVideos.length;
                const slicedFb = fbVideos.slice((page - 1) * limit, (page - 1) * limit + limit);

                return { videos: slicedFb, total: fbTotal };

            case SocialPlatform.ANT_MEDIA:
                const baseUrl = serverUrl.replace(/\/$/, '');
                const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
                const authRes = await axios.post(`${baseUrl}/rest/v2/users/authenticate`, {
                    email,
                    password: hashedPassword
                });
                const cookie = authRes.headers['set-cookie'];

                // AMS Supports Offset/Size
                const offset = (page - 1) * limit;
                // Fetch list
                const amsRes = await axios.get(`${baseUrl}/${appName || 'LiveApp'}/rest/v2/vods/list/${offset}/${limit}?search=${encodeURIComponent(search)}`, {
                    headers: { Cookie: cookie }
                });

                // Fetch Count for pagination
                const countRes = await axios.get(`${baseUrl}/${appName || 'LiveApp'}/rest/v2/vods/count?search=${encodeURIComponent(search)}`, {
                    headers: { Cookie: cookie }
                });

                const amsVideos = amsRes.data.map((vod: any) => ({
                    id: vod.vodId,
                    title: vod.streamName || vod.vodName || vod.vodId,
                    description: '',
                    thumbnail: vod.previewFilePath ? `${baseUrl}/${appName || 'LiveApp'}/${vod.previewFilePath}` : null,
                    publishedAt: new Date(vod.creationDate).toISOString(),
                    url: `${baseUrl}/${appName || 'LiveApp'}/play.html?id=${vod.filePath}&playOrder=vod&autoPlay=true&mute=false`,
                    filePath: `${baseUrl}/${appName || 'LiveApp'}/${vod.filePath}`,
                    duration: vod.duration / 1000,
                    platform: 'ant-media',
                    views: 0 // AMS doesn't track views natively per VOD in basic API
                }));

                return { videos: amsVideos, total: countRes.data.number };

            case SocialPlatform.TIKTOK:
                // TikTok V2 Video List (POST)
                const ttVideosRes = await axios.post('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,create_time,share_url,video_description,stats',
                    {
                        max_count: limit,
                        // cursor: cursor // for pagination if we want to support it properly
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const ttVideos = (ttVideosRes.data.data?.videos || []).map((v: any) => ({
                    id: v.id,
                    title: v.title || 'Untitled Video',
                    description: v.video_description,
                    thumbnail: v.cover_image_url,
                    publishedAt: new Date(v.create_time * 1000).toISOString(),
                    url: v.share_url,
                    views: v.stats?.video_views || 0,
                    platform: 'tiktok'
                }));

                return { videos: ttVideos, total: ttVideos.length }; // TikTok total is hard to get without walking cursors

            default:
                return { videos: [], total: 0 };
        }
    }

    /**
     * Get Comments for a Video
     */
    static async getComments(platform: SocialPlatform, credentials: any, videoId: string): Promise<any[]> {
        const { accessToken } = credentials;

        switch (platform) {
            case SocialPlatform.YOUTUBE:
                try {
                    const res = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    return res.data.items.map((item: any) => {
                        const top = item.snippet.topLevelComment.snippet;
                        return {
                            id: item.id,
                            author: top.authorDisplayName,
                            avatar: top.authorProfileImageUrl,
                            text: top.textDisplay,
                            date: top.publishedAt,
                            likes: top.likeCount
                        };
                    });
                } catch (e) {
                    return []; // Comments might be disabled
                }

            case SocialPlatform.FACEBOOK:
                try {
                    const res = await axios.get(`https://graph.facebook.com/${videoId}/comments?fields=id,from,message,created_time,like_count`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    return res.data.data.map((item: any) => ({
                        id: item.id,
                        author: item.from?.name || 'Unknown',
                        avatar: null, // Need extra call for avatar, skip for now
                        text: item.message,
                        date: item.created_time,
                        likes: item.like_count
                    }));
                } catch (e) {
                    return [];
                }

            case SocialPlatform.ANT_MEDIA:
                // AMS doesn't have a comment system for VoDs
                return [];

            default:
                return [];
        }
    }

    /**
     * Get Channel/Account Statistics
     */
    static async getStats(platform: SocialPlatform, credentials: any): Promise<any> {
        const { accessToken } = credentials;

        switch (platform) {
            case SocialPlatform.YOUTUBE:
                const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const stats = ytRes.data.items?.[0]?.statistics;
                return {
                    followers: stats?.subscriberCount,
                    views: stats?.viewCount,
                    videos: stats?.videoCount
                };

            case SocialPlatform.FACEBOOK:
                const fbRes = await axios.get('https://graph.facebook.com/me?fields=followers_count', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                return {
                    followers: fbRes.data.followers_count,
                    views: 0,
                    videos: 0
                };

            case SocialPlatform.TIKTOK:
                const ttStatsRes = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const ttStats = ttStatsRes.data.data?.user;
                return {
                    followers: ttStats?.follower_count || 0,
                    views: 0,
                    videos: ttStats?.video_count || 0
                };

            default:
                return {};
        }
    }

    /**
     * Delete Video
     */
    static async deleteVideo(platform: SocialPlatform, credentials: any, videoId: string): Promise<boolean> {
        const { accessToken, serverUrl, email, password, appName } = credentials;

        switch (platform) {
            case SocialPlatform.YOUTUBE:
                await axios.delete(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                return true;

            case SocialPlatform.FACEBOOK:
                // FB Video Delete: https://graph.facebook.com/{video_id}
                await axios.delete(`https://graph.facebook.com/v18.0/${videoId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                return true;

            case SocialPlatform.TIKTOK:
                throw new Error('TikTok API does not support video deletion currently.');

            case SocialPlatform.ANT_MEDIA:
                const baseUrl = serverUrl.replace(/\/$/, '');
                const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
                const authRes = await axios.post(`${baseUrl}/rest/v2/users/authenticate`, {
                    email,
                    password: hashedPassword
                });
                const cookie = authRes.headers['set-cookie'];

                await axios.delete(`${baseUrl}/${appName || 'LiveApp'}/rest/v2/vods/${videoId}`, {
                    headers: { Cookie: cookie }
                });
                return true;

            default:
                throw new Error('Delete not supported for this platform via API');
        }
    }

    /**
     * Upload Video
     * @param platform 
     * @param credentials 
     * @param videoStream Readable stream of the video file
     * @param metadata { title, description }
     * @param filename Optional filename for the upload
     * @param contentType Optional content type for the upload
     */
    static async uploadVideo(platform: SocialPlatform, credentials: any, videoStream: any, metadata: any, filename?: string, contentType?: string): Promise<any> {
        const { accessToken, serverUrl, email, password, appName } = credentials;
        const { google } = await import('googleapis');

        switch (platform) {
            case SocialPlatform.YOUTUBE:
                // Use googleapis for resumable upload
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: accessToken });

                const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

                const res = await youtube.videos.insert({
                    part: ['snippet', 'status'],
                    requestBody: {
                        snippet: {
                            title: metadata.title,
                            description: metadata.description
                        },
                        status: {
                            privacyStatus: 'public' // Default to private or public?
                        }
                    },
                    media: {
                        body: videoStream
                    }
                });
                return res.data;

            case SocialPlatform.ANT_MEDIA:
                // AMS Upload via multipart/form-data
                const amsBaseUrl = serverUrl.replace(/\/$/, '');
                const amsHashedPassword = crypto.createHash('md5').update(password).digest('hex');

                // 1. Authenticate to get session cookie
                const amsAuthRes = await axios.post(`${amsBaseUrl}/rest/v2/users/authenticate`, {
                    email,
                    password: amsHashedPassword
                });

                // Better cookie handling for session
                const cookies = amsAuthRes.headers['set-cookie'];
                const amsCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies || '';

                // 2. Prepare Form Data
                const { default: NodeFormData } = await import('form-data');
                const form = new NodeFormData();

                // form-data package handles Streams natively
                // Use video/* to let AMS decide the type as requested
                form.append('file', videoStream, {
                    filename: filename || 'video.mp4',
                    contentType: 'video/*'
                });

                const amsUploadRes = await axios.post(
                    `${amsBaseUrl}/${appName || 'WebRTCAppEE'}/rest/v2/vods/create?name=${encodeURIComponent(filename || 'video.mp4')}`,
                    form,
                    {
                        headers: {
                            Cookie: amsCookie,
                            ...form.getHeaders()
                        }
                    }
                );
                return amsUploadRes.data;
            default:
                throw new Error('Upload not supported via API');
        }
    }

    /**
     * Create or Fetch Live Stream Ingest Info
     */
    static async getLiveStreamInfo(platform: SocialPlatform, credentials: any, metadata: { title: string, description: string }): Promise<{ rtmpUrl: string, streamKey: string }> {
        const { accessToken, serverUrl, email, password, appName } = credentials;

        switch (platform) {
            case SocialPlatform.YOUTUBE:
                const { google } = await import('googleapis');
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: accessToken });
                const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

                try {
                    // 1. Create a live broadcast
                    const broadcastRes = await youtube.liveBroadcasts.insert({
                        part: ['snippet', 'status'],
                        requestBody: {
                            snippet: {
                                title: metadata.title || 'AntFlow Live Stream',
                                description: metadata.description || 'Streaming via AntFlow',
                                scheduledStartTime: new Date().toISOString()
                            },
                            status: {
                                privacyStatus: 'public', // Or private
                                selfDeclaredMadeForKids: false
                            }
                        }
                    });

                    // 2. Create a live stream
                    const streamRes = await youtube.liveStreams.insert({
                        part: ['snippet', 'cdn'],
                        requestBody: {
                            snippet: {
                                title: metadata.title || 'AntFlow Ingest'
                            },
                            cdn: {
                                frameRate: 'variable',
                                ingestionType: 'rtmp',
                                resolution: 'variable'
                            }
                        }
                    });

                    // 3. Bind them
                    await youtube.liveBroadcasts.bind({
                        part: ['id', 'contentDetails'],
                        id: broadcastRes.data.id!,
                        streamId: streamRes.data.id!
                    });

                    return {
                        rtmpUrl: streamRes.data.cdn?.ingestionInfo?.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2',
                        streamKey: streamRes.data.cdn?.ingestionInfo?.streamName || ''
                    };
                } catch (error: any) {
                    const errMsg = error.response?.data?.error?.message || error.message || '';
                    if (errMsg.includes('live streaming') || errMsg.includes('not enabled')) {
                        throw new Error('Your YouTube account is not enabled for live streaming. Please enable it in YouTube Studio and wait 24 hours for activation.');
                    }
                    console.error('YouTube Live Setup Error:', error.response?.data || error.message);
                    throw error;
                }

            case SocialPlatform.ANT_MEDIA:
                const amsBaseUrl = serverUrl.replace(/\/$/, '');
                const amsHashedPassword = crypto.createHash('md5').update(password).digest('hex');

                const amsAuthRes = await axios.post(`${amsBaseUrl}/rest/v2/users/authenticate`, {
                    email,
                    password: amsHashedPassword
                });
                const amsCookie = Array.isArray(amsAuthRes.headers['set-cookie']) ? amsAuthRes.headers['set-cookie'].join('; ') : amsAuthRes.headers['set-cookie'] || '';

                const amsApp = appName || 'WebRTCAppEE';
                // Create a broadcast
                const amsRes = await axios.post(`${amsBaseUrl}/${amsApp}/rest/v2/broadcasts/create`, {
                    name: metadata.title || 'AntFlow Live',
                    type: 'liveStream'
                }, {
                    headers: { Cookie: amsCookie }
                });

                return {
                    rtmpUrl: `rtmp://${new URL(amsBaseUrl).hostname}/${amsApp}`,
                    streamKey: amsRes.data.streamId
                };

            default:
                throw new Error(`Live stream setup not supported for ${platform} via API yet`);
        }
    }
}
