import axios from 'axios';

export interface AntMediaConfig {
    baseUrl: string;
    email: string;
    password?: string;
    appName: string;
}

export class AntMediaService {
    private config: AntMediaConfig;
    private token: string | null = null;

    constructor(config: AntMediaConfig) {
        this.config = config;
    }

    private get apiBaseUrl() {
        return `${this.config.baseUrl}/rest/v2`;
    }

    private get app() {
        return this.config.appName || 'WebRTCAppEE';
    }

    /**
     * Authenticate with Ant Media Server
     */
    async login(): Promise<boolean> {
        try {
            // Check if we are already authenticated (some AMS versions use JSESSIONID)
            const response = await axios.post(`${this.apiBaseUrl}/users/authenticate`, {
                email: this.config.email,
                password: this.config.password
            });

            return response.data.success;
        } catch (error) {
            console.error('[AntMedia] Login failed:', error);
            return false;
        }
    }

    /**
     * Get list of broadcast streams
     */
    async getStreams(offset = 0, size = 50): Promise<any[]> {
        try {
            const response = await axios.get(`${this.apiBaseUrl}/broadcasts/list/${offset}/${size}`, {
                params: { app: this.app }
            });
            return response.data;
        } catch (error) {
            console.error('[AntMedia] Failed to fetch streams:', error);
            return [];
        }
    }

    /**
     * Create a new broadcast stream (Live or Stream Source)
     */
    async createBroadcast(params: {
        name: string,
        streamId?: string,
        type?: 'liveStream' | 'ipCamera' | 'streamSource' | 'playlist',
        streamUrl?: string
    }): Promise<any> {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/broadcasts/create`, {
                name: params.name,
                streamId: params.streamId,
                type: params.type || 'liveStream',
                streamUrl: params.streamUrl,
                status: 'finished'
            }, {
                params: { app: this.app }
            });
            return response.data;
        } catch (error) {
            console.error('[AntMedia] Failed to create broadcast:', error);
            return null;
        }
    }

    /**
     * Upload a video file as a VoD asset to AMS
     */
    async uploadVoD(blob: Blob, fileName: string): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('file', blob, fileName);

            const response = await axios.post(`${this.apiBaseUrl}/vods/create`, formData, {
                params: { app: this.app },
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('[AntMedia] Failed to upload VoD:', error);
            return null;
        }
    }

    /**
     * Start a stream source (server pulls from URL)
     */
    async startStreamSource(streamId: string): Promise<boolean> {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/broadcasts/start/${streamId}`, {}, {
                params: { app: this.app }
            });
            return response.data.success;
        } catch (error) {
            console.error('[AntMedia] Failed to start stream:', error);
            return false;
        }
    }

    /**
     * Stop a broadcast
     */
    async stopBroadcast(streamId: string): Promise<boolean> {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/broadcasts/stop/${streamId}`, {}, {
                params: { app: this.app }
            });
            return response.data.success;
        } catch (error) {
            console.error('[AntMedia] Failed to stop broadcast:', error);
            return false;
        }
    }
}
