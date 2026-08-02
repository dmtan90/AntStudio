import axios from 'axios';
import { Logger } from './Logger.js';

export interface AntMediaBroadcastParams {
    name: string;
    streamId?: string;
    type?: 'liveStream' | 'ipCamera' | 'streamSource' | 'playlist';
    streamUrl?: string;
}

export interface AntMediaConfig {
    baseUrl?: string;
    appName?: string;
    email?: string;
    password?: string;
}

export class AntMediaService {
    public getConfig(overrideConfig?: AntMediaConfig) {
        let baseUrl = overrideConfig?.baseUrl || process.env.ANT_MEDIA_BASE_URL || '';
        if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `http://${baseUrl}`;
        }
        baseUrl = baseUrl.replace(/\/$/, '');

        const appName = overrideConfig?.appName || process.env.ANT_MEDIA_APP_NAME || 'LiveApp';
        const email = overrideConfig?.email || process.env.ANT_MEDIA_EMAIL || '';
        const password = overrideConfig?.password || process.env.ANT_MEDIA_PASSWORD || '';

        // Build single clean API URL. If baseUrl already ends with appName, omit duplicating it
        let apiUrl = '';
        if (baseUrl) {
            const hasApp = appName && baseUrl.toLowerCase().endsWith(`/${appName.toLowerCase()}`);
            apiUrl = hasApp ? `${baseUrl}/rest/v2` : `${baseUrl}/${appName}/rest/v2`;
        }

        return { baseUrl, apiUrl, appName, email, password };
    }

    /**
     * Retrieve session cookie JSESSIONID from AMS
     */
    public async getSessionCookie(overrideConfig?: AntMediaConfig): Promise<string> {
        const { apiUrl, email, password } = this.getConfig(overrideConfig);
        if (!apiUrl || (!email && !password)) return '';
        try {
            const { default: crypto } = await import('crypto');
            const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

            let res = await axios.post(`${apiUrl}/users/authenticate`, {
                email,
                password: hashedPassword
            }).catch(() => null);

            if (!res || !res.data?.success) {
                res = await axios.post(`${apiUrl}/users/authenticate`, {
                    email,
                    password
                }).catch(() => null);
            }

            if (res && res.headers['set-cookie']) {
                const cookies = res.headers['set-cookie'];
                return Array.isArray(cookies) ? cookies.join('; ') : cookies || '';
            }
        } catch (e) {
            Logger.warn('[AntMedia] Session authentication warning', 'AntMedia', { error: e });
        }
        return '';
    }

    /**
     * Authenticate with Ant Media Server
     */
    async authenticate(overrideConfig?: AntMediaConfig): Promise<boolean> {
        const cookie = await this.getSessionCookie(overrideConfig);
        return !!cookie;
    }

    /**
     * Create a new broadcast stream
     */
    async createBroadcast(params: AntMediaBroadcastParams, overrideConfig?: AntMediaConfig): Promise<any> {
        const { apiUrl } = this.getConfig(overrideConfig);
        if (!apiUrl) return null;
        const cookie = await this.getSessionCookie(overrideConfig);
        const headers: Record<string, string> = {};
        if (cookie) headers['Cookie'] = cookie;

        try {
            const response = await axios.post(`${apiUrl}/broadcasts/create`, {
                name: params.name,
                streamId: params.streamId,
                type: params.type || 'streamSource',
                streamUrl: params.streamUrl
            }, {
                headers
            });
            return response.data;
        } catch (error: any) {
            Logger.error('[AntMedia] Failed to create broadcast', 'AntMedia', { error });
            return null;
        }
    }

    /**
     * Start a stream source
     */
    async startStreamSource(streamId: string, overrideConfig?: AntMediaConfig): Promise<boolean> {
        const { apiUrl } = this.getConfig(overrideConfig);
        if (!apiUrl) return false;
        const cookie = await this.getSessionCookie(overrideConfig);
        const headers: Record<string, string> = {};
        if (cookie) headers['Cookie'] = cookie;

        try {
            const response = await axios.post(`${apiUrl}/broadcasts/${streamId}/start`, {}, {
                headers
            });
            return response.data?.success ?? true;
        } catch (error: any) {
            Logger.error('[AntMedia] Start stream failed', 'AntMedia', { error });
            return false;
        }
    }

    /**
     * Upload or Import a VoD asset
     */
    async uploadVoD(data: { name: string; streamUrl: string } | Buffer, fileName?: string, overrideConfig?: AntMediaConfig): Promise<any> {
        const { apiUrl } = this.getConfig(overrideConfig);
        if (!apiUrl) return null;
        const cookie = await this.getSessionCookie(overrideConfig);
        const headers: Record<string, string> = {};
        if (cookie) headers['Cookie'] = cookie;

        try {
            if (Buffer.isBuffer(data)) {
                const { default: FormData } = await import('form-data');
                const formData = new FormData();
                formData.append('file', data, { filename: fileName || 'video.mp4' });

                const response = await axios.post(`${apiUrl}/vods/create`, formData, {
                    headers: {
                        ...headers,
                        ...formData.getHeaders()
                    }
                });
                return response.data;
            } else {
                const response = await axios.post(`${apiUrl}/vods/create`, {
                    name: data.name,
                    streamUrl: data.streamUrl,
                    type: 'vod'
                }, {
                    headers
                });
                return response.data;
            }
        } catch (error: any) {
            Logger.error('[AntMedia] Failed to upload VoD', 'AntMedia', { error });
            return null;
        }
    }

    /**
     * Add RTMP Endpoint for Restreaming (Simulcast)
     */
    async addEndpoint(streamId: string, rtmpUrl: string, overrideConfig?: AntMediaConfig): Promise<boolean> {
        const { apiUrl } = this.getConfig(overrideConfig);
        if (!apiUrl) return false;
        const cookie = await this.getSessionCookie(overrideConfig);
        const headers: Record<string, string> = {};
        if (cookie) headers['Cookie'] = cookie;

        try {
            const response = await axios.post(`${apiUrl}/broadcasts/${streamId}/endpoint`, {
                rtmpUrl: rtmpUrl,
                endpointServiceId: 'generic'
            }, {
                headers
            });
            return response.data?.success ?? true;
        } catch (error: any) {
            Logger.error('[AntMedia] Failed to add endpoint', 'AntMedia', { error });
            return false;
        }
    }

    /**
     * Stop a broadcast
     */
    async stopBroadcast(streamId: string, overrideConfig?: AntMediaConfig): Promise<boolean> {
        const { apiUrl } = this.getConfig(overrideConfig);
        if (!apiUrl) return false;
        const cookie = await this.getSessionCookie(overrideConfig);
        const headers: Record<string, string> = {};
        if (cookie) headers['Cookie'] = cookie;

        try {
            const response = await axios.post(`${apiUrl}/broadcasts/${streamId}/stop`, {}, {
                headers
            });
            return response.data?.success ?? true;
        } catch (error: any) {
            Logger.error('[AntMedia] Failed to stop broadcast', 'AntMedia', { error });
            return false;
        }
    }
}

export const antMediaService = new AntMediaService();
