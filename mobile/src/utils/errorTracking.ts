import * as Sentry from '@sentry/react-native';

class ErrorTracking {
    initialize(dsn?: string) {
        if (!dsn) {
            console.warn('⚠️ Sentry DSN not provided, error tracking disabled');
            return;
        }

        Sentry.init({
            dsn,
            environment: __DEV__ ? 'development' : 'production',
            enableAutoSessionTracking: true,
            tracesSampleRate: 1.0, // Adjust for production
            beforeSend(event) {
                // Filter out development errors if needed
                if (__DEV__) {
                    console.log('Sentry Event:', event);
                }
                return event;
            },
        });

        console.log('🛡️ Sentry initialized');
    }

    // Capture exception
    captureException(error: Error, context?: Record<string, any>) {
        if (context) {
            Sentry.setContext('custom', context);
        }
        Sentry.captureException(error);
    }

    // Capture message
    captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
        Sentry.captureMessage(message, level);
    }

    // Set user context
    setUser(userId: string, email?: string, username?: string) {
        Sentry.setUser({
            id: userId,
            email,
            username,
        });
    }

    // Clear user context
    clearUser() {
        Sentry.setUser(null);
    }

    // Add breadcrumb
    addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
        Sentry.addBreadcrumb({
            message,
            category,
            data,
            level: 'info',
        });
    }

    // Set tag
    setTag(key: string, value: string) {
        Sentry.setTag(key, value);
    }
}

export const errorTracking = new ErrorTracking();
export { Sentry };
