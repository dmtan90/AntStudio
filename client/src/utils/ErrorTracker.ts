import { toast } from 'vue-sonner';
import api from './api';

/**
 * Automates client-side error tracking and reporting.
 * Captures JS errors, HTTP errors, and network failures.
 */
export class ErrorTracker {
    private static isInitialized = false;
    private static breadcrumbs: string[] = [];
    private static maxBreadcrumbs = 10;

    /**
     * Initializes global error listeners.
     */
    public static init() {
        if (this.isInitialized) return;

        // 1. JavaScript Runtime Errors
        window.onerror = (message, source, lineno, colno, error) => {
            const msg = message.toString();
            // Filter out benign ResizeObserver loop errors
            if (msg.includes('ResizeObserver loop') || msg.includes('ResizeObserver loop limit exceeded')) {
                return;
            }

            this.reportError('javascript', {
                message: msg,
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
        this.addBreadcrumb('System Initialized');
        console.log('🛡️ ClientErrorTracker initialized');
    }

    /**
     * Adds a behavioral breadcrumb for debugging.
     */
    public static addBreadcrumb(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        this.breadcrumbs.push(`[${timestamp}] ${message}`);
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }
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
                breadcrumbs: this.breadcrumbs,
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
