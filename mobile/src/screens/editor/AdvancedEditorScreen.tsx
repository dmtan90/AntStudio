import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import Video from 'react-native-video';
import { Timeline } from '../../components/editor/Timeline';
import { EffectsPanel } from '../../components/editor/EffectsPanel';
import { CollaborationPanel } from '../../components/collaboration/CollaborationPanel';
import { useEditorStore, Clip, Effect } from '../../stores/useEditorStore';
import { videoEditorService } from '../../services/VideoEditorService';
import { analyticsService } from '../../utils/analytics';
import { collaborationService, useCollaborationStore } from '../../services/CollaborationService';

interface Props {
    navigation: any;
    route: {
        params: {
            projectId: string;
        };
    };
}

export const AdvancedEditorScreen: React.FC<Props> = ({ navigation, route }) => {
    // Default to a test project ID if not provided (for development/testing without full flow)
    const projectId = route.params?.projectId || 'test-project-id';

    const tracks = useEditorStore(state => state.tracks);
    const currentTime = useEditorStore(state => state.currentTime);
    const duration = useEditorStore(state => state.duration);
    const isPlaying = useEditorStore(state => state.isPlaying);
    const selectedClipId = useEditorStore(state => state.selectedClipId);
    const zoom = useEditorStore(state => state.zoom);

    const setCurrentTime = useEditorStore(state => state.setCurrentTime);
    const setIsPlaying = useEditorStore(state => state.setIsPlaying);
    const setSelectedClip = useEditorStore(state => state.setSelectedClip);
    const setZoom = useEditorStore(state => state.setZoom);
    const updateClip = useEditorStore(state => state.updateClip);

    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showEffects, setShowEffects] = useState(false);
    const [showCollaboration, setShowCollaboration] = useState(false);

    // Collaboration store
    const cursors = useCollaborationStore(state => state.cursors);
    const activeUsers = useCollaborationStore(state => state.activeUsers);

    // Prepare cursors with colors for Timeline
    const timelineCursors = React.useMemo(() => {
        const result: Record<string, { userId: string; timestamp: number; color?: string }> = {};
        Object.values(cursors).forEach(cursor => {
            const user = activeUsers.find(u => u.id === cursor.userId);
            result[cursor.userId] = {
                ...cursor,
                color: user?.color
            };
        });
        return result;
    }, [cursors, activeUsers]);

    useEffect(() => {
        if (projectId) {
            collaborationService.connect(projectId);
        }

        return () => {
            collaborationService.disconnect();
        };
    }, [projectId]);

    // specific effect to broadcast cursor position
    useEffect(() => {
        if (projectId) {
            // throttle this in real app
            collaborationService.sendCursorMove(currentTime);
        }
    }, [currentTime, projectId]);

    const handleClipPress = (clip: Clip) => {
        setSelectedClip(clip.id);
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleApplyEffect = (effect: Effect) => {
        if (!selectedClipId) {
            Alert.alert('No Clip Selected', 'Please select a clip to apply effects');
            return;
        }

        const selectedClip = tracks
            .flatMap(t => t.clips)
            .find(c => c.id === selectedClipId);

        if (selectedClip) {
            updateClip(selectedClipId, {
                effects: [...selectedClip.effects, effect],
            });

            analyticsService.logEvent('effect_applied', {
                effect_type: effect.type,
                effect_name: effect.name,
            });
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);

            const allClips = tracks.flatMap(t => t.clips);

            if (allClips.length === 0) {
                Alert.alert('No Content', 'Add clips to the timeline before exporting');
                return;
            }

            const outputPath = await videoEditorService.exportVideo(
                allClips,
                '1080p',
                (progress) => setExportProgress(progress)
            );

            analyticsService.logEvent('video_exported', {
                clip_count: allClips.length,
                duration: duration,
            });

            Alert.alert(
                'Export Complete',
                'Video exported successfully!',
                [
                    { text: 'Share', onPress: () => navigation.navigate('Share', { videoPath: outputPath }) },
                    { text: 'OK' },
                ]
            );
        } catch (error) {
            console.error('Export failed:', error);
            Alert.alert('Export Failed', 'Failed to export video. Please try again.');
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const handleZoomIn = () => setZoom(Math.min(zoom * 1.5, 5));
    const handleZoomOut = () => setZoom(Math.max(zoom / 1.5, 0.5));

    return (
        <View className="flex-1 bg-black flex-row">
            {/* Main Content Area */}
            <View className="flex-1">
                {/* Video Preview */}
                <View className="h-64 bg-gray-900 items-center justify-center relative">
                    {tracks[0]?.clips[0] ? (
                        <Video
                            source={{ uri: tracks[0].clips[0].uri }}
                            className="w-full h-full"
                            paused={!isPlaying}
                            onProgress={(data) => setCurrentTime(data.currentTime)}
                            resizeMode="contain"
                        />
                    ) : (
                        <Text className="text-gray-500">No video loaded</Text>
                    )}

                    {/* Playback Controls */}
                    <View className="absolute bottom-4 flex-row gap-4">
                        <TouchableOpacity
                            className="bg-white/20 w-12 h-12 rounded-full items-center justify-center"
                            onPress={handlePlayPause}
                        >
                            <Text className="text-white text-xl">{isPlaying ? '⏸' : '▶️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Timeline */}
                <Timeline
                    onClipPress={handleClipPress}
                    cursors={timelineCursors}
                />

                {/* Tollbar / Toggles */}
                <View className="flex-row justify-center p-2 bg-gray-900">
                    <TouchableOpacity
                        className={`p-3 m-1 rounded flex-1 ${showEffects ? 'bg-purple-600' : 'bg-gray-800'}`}
                        onPress={() => {
                            setShowEffects(!showEffects);
                            setShowCollaboration(false);
                        }}
                    >
                        <Text className="text-white text-center font-bold">Effects</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`p-3 m-1 rounded flex-1 ${showCollaboration ? 'bg-blue-600' : 'bg-gray-800'}`}
                        onPress={() => {
                            setShowCollaboration(!showCollaboration);
                            setShowEffects(false);
                        }}
                    >
                        <Text className="text-white text-center font-bold">Collaboration</Text>
                    </TouchableOpacity>
                </View>

                {/* Panels Area */}
                <View className="flex-1 bg-gray-900">
                    {showEffects && <EffectsPanel onApplyEffect={handleApplyEffect} />}
                    {showCollaboration && <CollaborationPanel currentTime={currentTime} />}
                </View>

                {/* Bottom Controls */}
                <View className="bg-gray-900 p-4 flex-row justify-between items-center border-t border-gray-800">
                    {/* Zoom Controls */}
                    <View className="flex-row gap-2">
                        <TouchableOpacity className="bg-gray-800 px-3 py-2 rounded" onPress={handleZoomOut}>
                            <Text className="text-white">-</Text>
                        </TouchableOpacity>
                        <Text className="text-white self-center">{zoom.toFixed(1)}x</Text>
                        <TouchableOpacity className="bg-gray-800 px-3 py-2 rounded" onPress={handleZoomIn}>
                            <Text className="text-white">+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Export Button */}
                    <TouchableOpacity
                        className={`px-6 py-3 rounded ${isExporting ? 'bg-gray-600' : 'bg-green-600'}`}
                        onPress={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <View className="flex-row items-center gap-2">
                                <ActivityIndicator size="small" color="#fff" />
                                <Text className="text-white">{exportProgress.toFixed(0)}%</Text>
                            </View>
                        ) : (
                            <Text className="text-white font-bold">Export</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
