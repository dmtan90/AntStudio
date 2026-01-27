import { toast } from 'vue-sonner';
import api from './api';

/**
 * Automates client-side error tracking and reporting.
 * Captures JS errors, HTTP errors, and network failures.
 */
export class ErrorTracker {
    private static isInitialized = false;

    /**
     * Initializes global error listeners.
     */
    public static init() {
        if (this.isInitialized) return;

        // 1. JavaScript Runtime Errors
        window.onerror = (message, source, lineno, colno, error) => {
            this.reportError('javascript', {
                message: message.toString(),
                source,
                lineno,
                colno,
                stack: error?.stack
            });
        };

        // 2. Unhandled Promise Rejections
        window.onunhandledrejection = (event) => {
            this.reportError('promise', {
                message: event.reason?.message || 'Unhandled Rejection',
                stack: event.reason?.stack,
                reason: event.reason
            });
        };

        this.isInitialized = true;
        console.log('🛡️ ClientErrorTracker initialized');
    }

    /**
     * Reports an error to the backend monitoring service.
     */
    public static async reportError(type: 'javascript' | 'http' | 'promise' | 'network', details: any) {
        // Log to console for local debugging
        console.error(`[ErrorTracker] [${type.toUpperCase()}]`, details);

        try {
            // Avoid infinite loops if reporting fails
            await api.post('/admin/monitoring/client-logs', {
                type,
                details,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }, {
                // Skip tracking for the reporting request itself
                headers: { 'X-Skip-Tracking': 'true' }
            });
        } catch (e) {
            // Silent fail to avoid recursion
        }
    }
}

/**
 * Hook for Axios to track HTTP errors.
 */
export const setupAxiosTracking = (axiosInstance: any) => {
    axiosInstance.interceptors.response.use(
        (response: any) => response,
        (error: any) => {
            // Skip tracking for specific headers (e.g. tracking itself)
            if (error.config?.headers?.['X-Skip-Tracking']) {
                return Promise.reject(error);
            }

            const status = error.response?.status;

            if (status >= 400) {
                ErrorTracker.reportError(status === 0 ? 'network' : 'http', {
                    status,
                    method: error.config?.method,
                    url: error.config?.url,
                    message: error.message,
                    responseData: error.response?.data
                });
            }

            return Promise.reject(error);
        }
    );
};
