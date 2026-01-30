import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/useAuthStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ProjectDetailScreen } from '../screens/project/ProjectDetailScreen';
import { SimpleEditorScreen } from '../screens/editor/SimpleEditorScreen';
import { AdvancedEditorScreen } from '../screens/editor/AdvancedEditorScreen';
import { LiveStreamSetupScreen } from '../screens/live/LiveStreamSetupScreen';
import { LiveStreamScreen } from '../screens/live/LiveStreamScreen';
import { ShareScreen } from '../screens/share/ShareScreen';
import { VoiceLabScreen } from '../screens/voice/VoiceLabScreen';
import { TemplatesScreen } from '../screens/templates/TemplatesScreen';
import { AnalyticsDashboardScreen } from '../screens/analytics/AnalyticsDashboardScreen';
import { notificationManager } from '../api/notifications';
import { analyticsService } from '../utils/analytics';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const checkAuth = useAuthStore(state => state.checkAuth);
    const routeNameRef = useRef<string | undefined>(undefined);
    const navigationRef = useRef<any>(null);

    useEffect(() => {
        checkAuth();

        // Initialize Notifications
        notificationManager.registerForPushNotificationsAsync().then(_token => {
            // In real app, send this token to backend
        });

        const cleanup = notificationManager.addListeners();
        return cleanup;
    }, [checkAuth]);

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
            }}
            onStateChange={async () => {
                const previousRouteName = routeNameRef.current;
                const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

                if (previousRouteName !== currentRouteName && currentRouteName) {
                    // Track screen view
                    await analyticsService.logScreenView(currentRouteName);
                }

                routeNameRef.current = currentRouteName;
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Group>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
                        <Stack.Screen name="SimpleEditor" component={SimpleEditorScreen} />
                        <Stack.Screen name="AdvancedEditor" component={AdvancedEditorScreen as any} />
                        <Stack.Screen name="LiveStreamSetup" component={LiveStreamSetupScreen} />
                        <Stack.Screen name="LiveStream" component={LiveStreamScreen} />
                        <Stack.Screen name="Share" component={ShareScreen as any} />
                        <Stack.Screen name="VoiceLab" component={VoiceLabScreen as any} />
                        <Stack.Screen name="Templates" component={TemplatesScreen as any} />
                        <Stack.Screen name="Analytics" component={AnalyticsDashboardScreen as any} />
                    </Stack.Group>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
