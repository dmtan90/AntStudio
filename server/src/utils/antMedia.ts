import axios from 'axios';
import { configService } from './configService.js';

export interface AntMediaBroadcastParams {
    name: string;
    streamId?: string;
    type?: 'liveStream' | 'ipCamera' | 'streamSource' | 'playlist';
    streamUrl?: string;
}

export class AntMediaService {
    private get config() {
        return configService.antMedia;
    }

    private get apiBaseUrl() {
        return `${this.config.baseUrl}/rest/v2`;
    }

    private get app() {
        return this.config.appName || 'WebRTCAppEE';
    }

    /**
     * Authenticate with Ant Media Server and return the JSESSIONID or success
     */
    async authenticate(): Promise<boolean> {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/users/authenticate`, {
                email: this.config.email,
                password: this.config.password
            });
            return response.data.success;
        } catch (error) {
            console.error('[AntMedia] Authentication failed:', error);
            return false;
        }
    }

    /**
     * Create a new broadcast stream
     */
    async createBroadcast(params: AntMediaBroadcastParams): Promise<any> {
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
     * Start a stream source
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
     * Upload a VoD asset
     */
    async uploadVoD(buffer: Buffer, fileName: string): Promise<any> {
        try {
            const { default: FormData } = await import('form-data');
            const formData = new FormData();
            formData.append('file', buffer, { filename: fileName });

            const response = await axios.post(`${this.apiBaseUrl}/vods/create`, formData, {
                params: { app: this.app },
                headers: { ...formData.getHeaders() }
            });
            return response.data;
        } catch (error) {
            console.error('[AntMedia] Failed to upload VoD:', error);
            return null;
        }
    }
}

export const antMediaService = new AntMediaService();
