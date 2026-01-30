import axios from 'axios';
import { authStorage } from './authStorage';
import { performanceService } from '../utils/performance';
import { errorTracking } from '../utils/errorTracking';
import { API_URL } from '../config';

export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await authStorage.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Track request start time
        (config as any).metadata = { startTime: Date.now() };

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => {
        // Track API performance
        const config = response.config as any;
        if (config.metadata) {
            const duration = Date.now() - config.metadata.startTime;
            const url = config.url || 'unknown';
            const method = (config.method?.toUpperCase() || 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE';

            performanceService.trackHttpRequest(
                url,
                method,
                response.status,
                duration
            );

            // Log slow requests
            if (duration > 2000) {
                errorTracking.addBreadcrumb(
                    `Slow API request: ${method} ${url}`,
                    'http',
                    { duration, status: response.status }
                );
            }
        }

        return response;
    },
    async (error) => {
        // Track error
        if (error.config) {
            const config = error.config as any;
            const duration = config.metadata ? Date.now() - config.metadata.startTime : 0;

            errorTracking.captureException(error, {
                url: config.url,
                method: config.method,
                duration,
                status: error.response?.status,
            });
        }

        // Simple 401 handling
        if (error.response?.status === 401) {
            await authStorage.removeToken();
        }
        return Promise.reject(error);
    }
);

export const mediaApi = {
    upload: async (uri: string, type: string = 'image/jpeg', name: string = 'upload.jpg') => {
        const formData = new FormData();
        formData.append('file', {
            uri,
            type,
            name,
        } as any);

        const response = await apiClient.post('/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
