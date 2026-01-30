import { apiClient } from '../api/client';
import { socketClient } from '../api/socket';
import { useLiveStreamStore, StreamConfig } from '../stores/useLiveStreamStore';
import { RTCPeerConnection } from 'react-native-webrtc';

class StreamingService {
    private mediaStream: MediaStream | null = null;
    private peerConnection: RTCPeerConnection | null = null;

    // Initialize stream with backend
    async initializeStream(config: StreamConfig): Promise<{ streamId: string; streamUrl: string } | null> {
        try {
            const response = await apiClient.post('/streaming/mobile/start', {
                title: config.title,
                description: config.description,
                platforms: config.platforms,
                privacy: config.privacy,
                aiDirectorEnabled: config.aiDirectorEnabled,
                commerceEnabled: config.commerceEnabled,
            });

            const { streamId, streamUrl } = response.data;

            useLiveStreamStore.getState().setStreamId(streamId);
            useLiveStreamStore.getState().setStreamUrl(streamUrl);

            return { streamId, streamUrl };
        } catch (error) {
            console.error('Failed to initialize stream:', error);
            return null;
        }
    }

    // Start streaming
    async startStream(mediaStream: MediaStream, _streamUrl: string): Promise<boolean> {
        try {
            this.mediaStream = mediaStream;

            // Create RTCPeerConnection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                ],
            });

            // Add media tracks
            mediaStream.getTracks().forEach((track: any) => {
                this.peerConnection?.addTrack(track, mediaStream);
            });

            // Create offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            });

            await this.peerConnection.setLocalDescription(offer);

            // Send offer to server (simplified - in real app, use signaling server)
            console.log('Stream started with offer:', offer);

            useLiveStreamStore.getState().setStatus('live');

            // Setup analytics listeners
            this.setupAnalyticsListeners();

            return true;
        } catch (error) {
            console.error('Failed to start stream:', error);
            return false;
        }
    }

    // Stop streaming
    async stopStream(): Promise<boolean> {
        try {
            const streamId = useLiveStreamStore.getState().streamId;

            if (streamId) {
                await apiClient.post(`/streaming/mobile/stop`, { streamId });
            }

            // Close peer connection
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            // Stop media tracks
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach((track: any) => track.stop());
                this.mediaStream = null;
            }

            useLiveStreamStore.getState().setStatus('ended');

            return true;
        } catch (error) {
            console.error('Failed to stop stream:', error);
            return false;
        }
    }

    // Pause streaming
    pauseStream() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track: any) => {
                track.enabled = false;
            });
            useLiveStreamStore.getState().setStatus('paused');
        }
    }

    // Resume streaming
    resumeStream() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track: any) => {
                track.enabled = true;
            });
            useLiveStreamStore.getState().setStatus('live');
        }
    }

    // Setup analytics listeners
    private setupAnalyticsListeners() {
        socketClient.on('stream:viewer_joined', (_data: any) => {
            const currentCount = useLiveStreamStore.getState().analytics.viewerCount;
            const newCount = currentCount + 1;

            useLiveStreamStore.getState().updateAnalytics({
                viewerCount: newCount,
                peakViewers: Math.max(newCount, useLiveStreamStore.getState().analytics.peakViewers),
            });
        });

        socketClient.on('stream:analytics_update', (data: any) => {
            useLiveStreamStore.getState().updateAnalytics(data);
        });

        socketClient.on('stream:comment_received', (_data: any) => {
            const currentComments = useLiveStreamStore.getState().analytics.comments;
            useLiveStreamStore.getState().updateAnalytics({
                comments: currentComments + 1,
            });
        });
    }

    // Get current stream status
    getStreamStatus() {
        return useLiveStreamStore.getState().status;
    }
}

export const streamingService = new StreamingService();
export type { StreamConfig };
