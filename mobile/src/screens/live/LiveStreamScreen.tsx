import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { CameraPreview } from '../../components/CameraPreview';
import { LiveControlsOverlay } from '../../components/LiveControlsOverlay';
import { cameraService, CameraPosition } from '../../services/CameraService';
import { streamingService } from '../../services/StreamingService';
import { useLiveStreamStore } from '../../stores/useLiveStreamStore';
import { analyticsService } from '../../utils/analytics';
import { errorTracking } from '../../utils/errorTracking';

interface Props {
    navigation: any;
}

export const LiveStreamScreen: React.FC<Props> = ({ navigation }) => {
    const [cameraPosition, setCameraPosition] = useState<CameraPosition>('back');
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);

    const status = useLiveStreamStore(state => state.status);
    const config = useLiveStreamStore(state => state.config);
    const setStatus = useLiveStreamStore(state => state.setStatus);

    useEffect(() => {
        checkPermissions();

        return () => {
            // Cleanup on unmount
            if (status === 'live') {
                handleStopStream();
            }
        };
    }, []);

    const checkPermissions = async () => {
        const granted = await cameraService.hasPermissions();

        if (!granted) {
            const requested = await cameraService.requestPermissions();
            setHasPermissions(requested);

            if (!requested) {
                Alert.alert(
                    'Permissions Required',
                    'Camera and microphone permissions are required for live streaming.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } else {
            setHasPermissions(granted);
        }
    };

    const handleStartStop = async () => {
        if (status === 'idle' || status === 'ended') {
            await handleStartStream();
        } else if (status === 'live') {
            await handleStopStream();
        }
    };

    const handleStartStream = async () => {
        if (!config) {
            Alert.alert('Error', 'Stream configuration not found');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('connecting');

            // Initialize stream with backend
            const streamData = await streamingService.initializeStream(config);

            if (!streamData) {
                throw new Error('Failed to initialize stream');
            }

            // Get media stream (simplified - in real app, get from camera)
            // const mediaStream = await getMediaStream();
            // await streamingService.startStream(mediaStream, streamData.streamUrl);

            // For now, just set status to live
            setStatus('live');

            // Track event
            analyticsService.logEvent('live_stream_started', {
                platforms: config.platforms.join(','),
            });

        } catch (error) {
            console.error('Failed to start stream:', error);
            errorTracking.captureException(error as Error, {
                context: 'live_stream_start',
            });

            Alert.alert('Error', 'Failed to start stream. Please try again.');
            setStatus('idle');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopStream = async () => {
        try {
            setIsLoading(true);

            await streamingService.stopStream();

            // Track event
            const analytics = useLiveStreamStore.getState().analytics;
            analyticsService.logEvent('live_stream_ended', {
                duration: 0, // Calculate actual duration
                peak_viewers: analytics.peakViewers,
                total_comments: analytics.comments,
            });

            Alert.alert(
                'Stream Ended',
                `Peak viewers: ${analytics.peakViewers}\nTotal comments: ${analytics.comments}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );

        } catch (error) {
            console.error('Failed to stop stream:', error);
            errorTracking.captureException(error as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFlipCamera = () => {
        setCameraPosition(prev => prev === 'back' ? 'front' : 'back');
    };

    const handleToggleMute = () => {
        setIsMuted(prev => !prev);
        // In real app, mute/unmute audio track
    };

    if (!hasPermissions) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <CameraPreview
                position={cameraPosition}
                isActive={true}
            />

            <LiveControlsOverlay
                onStartStop={handleStartStop}
                onFlipCamera={handleFlipCamera}
                onToggleMute={handleToggleMute}
                isMuted={isMuted}
            />

            {isLoading && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
        </View>
    );
};
