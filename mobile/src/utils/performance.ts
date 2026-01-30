import perf, { FirebasePerformanceTypes } from '@react-native-firebase/perf';

class Performance {
    // Track HTTP request
    async trackHttpRequest(
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        statusCode: number,
        duration: number
    ) {
        try {
            const metric = perf().newHttpMetric(url, method as FirebasePerformanceTypes.HttpMethod);
            metric.setHttpResponseCode(statusCode);
            metric.setResponseContentType('application/json');
            await metric.start();

            // Simulate duration
            setTimeout(async () => {
                await metric.stop();
            }, duration);
        } catch (error) {
            console.error('Failed to track HTTP request:', error);
        }
    }

    // Custom trace
    async trace<T>(traceName: string, fn: () => Promise<T>): Promise<T> {
        const trace = await perf().startTrace(traceName);

        try {
            const result = await fn();
            await trace.stop();
            return result;
        } catch (error) {
            await trace.stop();
            throw error;
        }
    }

    // Screen rendering trace
    async startScreenTrace(screenName: string) {
        try {
            const trace = await perf().startTrace(`screen_${screenName}`);
            return trace;
        } catch (error) {
            console.error('Failed to start screen trace:', error);
            return null;
        }
    }

    // Measure app startup time
    async measureAppStartup() {
        try {
            const trace = await perf().startTrace('app_startup');

            // Stop after initialization complete
            setTimeout(async () => {
                await trace.stop();
                console.log('📈 App startup measured');
            }, 100);
        } catch (error) {
            console.error('Failed to measure app startup:', error);
        }
    }

    // Custom metric
    async putMetric(traceName: string, metricName: string, value: number) {
        try {
            const trace = await perf().startTrace(traceName);
            trace.putMetric(metricName, value);
            await trace.stop();
        } catch (error) {
            console.error('Failed to put metric:', error);
        }
    }
}

export const performanceService = new Performance();
