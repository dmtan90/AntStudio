import React, { useEffect } from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useOfflineStore } from './src/stores/useOfflineStore';
import { socketClient } from './src/api/socket';
import { analyticsService } from './src/utils/analytics';
import { errorTracking, Sentry } from './src/utils/errorTracking';
import { performanceService } from './src/utils/performance';

// Initialize React Query Client
const queryClient = new QueryClient();

// Initialize error tracking (replace with your Sentry DSN)
const SENTRY_DSN = process.env.SENTRY_DSN || '';
errorTracking.initialize(SENTRY_DSN);

function App() {
  const initializeNetworkListener = useOfflineStore(state => state.initializeNetworkListener);

  useEffect(() => {
    // Initialize analytics
    analyticsService.initialize();

    // Measure app startup
    performanceService.measureAppStartup();

    // Initialize network monitoring
    initializeNetworkListener();

    // Setup socket event listeners
    socketClient.on('project:updated', (data: any) => {
      console.log('Project updated:', data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socketClient.on('job:completed', (data: any) => {
      console.log('Job completed:', data);
      analyticsService.logEvent('job_completed', { job_id: data.jobId });
    });

    socketClient.on('notification:new', (data: any) => {
      console.log('New notification:', data);
    });
  }, [initializeNetworkListener]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
