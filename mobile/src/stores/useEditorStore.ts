import { create } from 'zustand';

export interface Clip {
    id: string;
    uri: string;
    type: 'video' | 'audio' | 'image';
    trackId: string;
    startTime: number; // in seconds
    duration: number;
    trimStart: number;
    trimEnd: number;
    effects: Effect[];
    transition?: Transition;
}

export interface Effect {
    id: string;
    type: 'filter' | 'speed' | 'adjustment';
    name: string;
    params: Record<string, any>;
}

export interface Transition {
    type: 'fade' | 'dissolve' | 'wipe';
    duration: number;
}

export interface Track {
    id: string;
    type: 'video' | 'audio';
    clips: Clip[];
    muted: boolean;
    volume: number;
}

interface EditorState {
    tracks: Track[];
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    selectedClipId: string | null;
    zoom: number;

    // Actions
    addTrack: (type: 'video' | 'audio') => void;
    removeTrack: (trackId: string) => void;
    addClip: (trackId: string, clip: Omit<Clip, 'id'>) => void;
    removeClip: (clipId: string) => void;
    updateClip: (clipId: string, updates: Partial<Clip>) => void;
    moveClip: (clipId: string, trackId: string, startTime: number) => void;
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setSelectedClip: (clipId: string | null) => void;
    setZoom: (zoom: number) => void;
    reset: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    tracks: [
        { id: 'track-1', type: 'video', clips: [], muted: false, volume: 1 },
        { id: 'track-2', type: 'audio', clips: [], muted: false, volume: 1 },
    ],
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    selectedClipId: null,
    zoom: 1,

    addTrack: (type) => {
        const newTrack: Track = {
            id: `track-${Date.now()}`,
            type,
            clips: [],
            muted: false,
            volume: 1,
        };
        set((state) => ({ tracks: [...state.tracks, newTrack] }));
    },

    removeTrack: (trackId) => {
        set((state) => ({
            tracks: state.tracks.filter((t) => t.id !== trackId),
        }));
    },

    addClip: (trackId, clipData) => {
        const newClip: Clip = {
            ...clipData,
            id: `clip-${Date.now()}`,
        };

        set((state) => ({
            tracks: state.tracks.map((track) =>
                track.id === trackId
                    ? { ...track, clips: [...track.clips, newClip] }
                    : track
            ),
        }));

        // Update duration
        const maxDuration = Math.max(
            ...get().tracks.flatMap((t) =>
                t.clips.map((c) => c.startTime + c.duration)
            )
        );
        set({ duration: maxDuration });
    },

    removeClip: (clipId) => {
        set((state) => ({
            tracks: state.tracks.map((track) => ({
                ...track,
                clips: track.clips.filter((c) => c.id !== clipId),
            })),
        }));
    },

    updateClip: (clipId, updates) => {
        set((state) => ({
            tracks: state.tracks.map((track) => ({
                ...track,
                clips: track.clips.map((clip) =>
                    clip.id === clipId ? { ...clip, ...updates } : clip
                ),
            })),
        }));
    },

    moveClip: (clipId, trackId, startTime) => {
        const state = get();
        let clipToMove: Clip | null = null;

        // Find and remove clip from current track
        const tracksWithoutClip = state.tracks.map((track) => {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
                clipToMove = clip;
                return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
            }
            return track;
        });

        if (!clipToMove) return;

        // Add clip to new track with new start time
        const updatedTracks = tracksWithoutClip.map((track) =>
            track.id === trackId
                ? {
                    ...track,
                    clips: [...track.clips, { ...clipToMove!, startTime }],
                }
                : track
        );

        set({ tracks: updatedTracks });
    },

    setCurrentTime: (time) => set({ currentTime: time }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setSelectedClip: (clipId) => set({ selectedClipId: clipId }),
    setZoom: (zoom) => set({ zoom }),

    reset: () =>
        set({
            tracks: [
                { id: 'track-1', type: 'video', clips: [], muted: false, volume: 1 },
                { id: 'track-2', type: 'audio', clips: [], muted: false, volume: 1 },
            ],
            currentTime: 0,
            duration: 0,
            isPlaying: false,
            selectedClipId: null,
            zoom: 1,
        }),
}));
