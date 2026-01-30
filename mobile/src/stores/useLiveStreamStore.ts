import { create } from 'zustand';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'paused' | 'ended';
export type StreamPlatform = 'youtube' | 'facebook' | 'tiktok';

interface StreamConfig {
    title: string;
    description: string;
    platforms: StreamPlatform[];
    privacy: 'public' | 'unlisted' | 'private';
    aiDirectorEnabled: boolean;
    commerceEnabled: boolean;
}

interface StreamAnalytics {
    viewerCount: number;
    peakViewers: number;
    likes: number;
    comments: number;
    shares: number;
    averageWatchTime: number;
}

interface LiveStreamState {
    status: StreamStatus;
    config: StreamConfig | null;
    analytics: StreamAnalytics;
    streamId: string | null;
    streamUrl: string | null;

    // Actions
    setConfig: (config: StreamConfig) => void;
    setStatus: (status: StreamStatus) => void;
    updateAnalytics: (analytics: Partial<StreamAnalytics>) => void;
    setStreamId: (id: string) => void;
    setStreamUrl: (url: string) => void;
    reset: () => void;
}

const initialAnalytics: StreamAnalytics = {
    viewerCount: 0,
    peakViewers: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    averageWatchTime: 0,
};

export const useLiveStreamStore = create<LiveStreamState>((set) => ({
    status: 'idle',
    config: null,
    analytics: initialAnalytics,
    streamId: null,
    streamUrl: null,

    setConfig: (config) => set({ config }),

    setStatus: (status) => set({ status }),

    updateAnalytics: (updates) =>
        set((state) => ({
            analytics: { ...state.analytics, ...updates },
        })),

    setStreamId: (streamId) => set({ streamId }),

    setStreamUrl: (streamUrl) => set({ streamUrl }),

    reset: () => set({
        status: 'idle',
        config: null,
        analytics: initialAnalytics,
        streamId: null,
        streamUrl: null,
    }),
}));
