import analytics from '@react-native-firebase/analytics';

class Analytics {
    private enabled: boolean = true;

    // Initialize analytics
    async initialize() {
        try {
            await analytics().setAnalyticsCollectionEnabled(this.enabled);
            console.log('📊 Analytics initialized');
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
        }
    }

    // Set user properties
    async setUserProperties(userId: string, properties: Record<string, any>) {
        if (!this.enabled) return;

        try {
            await analytics().setUserId(userId);
            await analytics().setUserProperties(properties);
        } catch (error) {
            console.error('Failed to set user properties:', error);
        }
    }

    // Log custom event
    async logEvent(eventName: string, params?: Record<string, any>) {
        if (!this.enabled) return;

        try {
            await analytics().logEvent(eventName, params);
            console.log(`📊 Event: ${eventName}`, params);
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    // Log screen view
    async logScreenView(screenName: string, screenClass?: string) {
        if (!this.enabled) return;

        try {
            await analytics().logScreenView({
                screen_name: screenName,
                screen_class: screenClass || screenName,
            });
        } catch (error) {
            console.error('Failed to log screen view:', error);
        }
    }

    // Predefined events
    async logLogin(method: string) {
        await this.logEvent('login', { method });
    }

    async logSignUp(method: string) {
        await this.logEvent('sign_up', { method });
    }

    async logProjectView(projectId: string) {
        await this.logEvent('project_view', { project_id: projectId });
    }

    async logMediaUpload(type: 'image' | 'video', size: number) {
        await this.logEvent('media_upload', { media_type: type, file_size: size });
    }

    async logVideoTrim(duration: number) {
        await this.logEvent('video_trim', { duration_seconds: duration });
    }

    async logSyncCompleted(itemCount: number) {
        await this.logEvent('sync_completed', { items_synced: itemCount });
    }

    // Enable/disable analytics
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        analytics().setAnalyticsCollectionEnabled(enabled);
    }
}

export const analyticsService = new Analytics();
