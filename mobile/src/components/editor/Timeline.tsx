import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEditorStore, Clip } from '../../stores/useEditorStore';

interface Props {
    onClipPress: (clip: Clip) => void;
    cursors?: Record<string, { userId: string; timestamp: number; color?: string }>;
}

export const Timeline: React.FC<Props> = ({ onClipPress, cursors = {} }) => {
    const tracks = useEditorStore(state => state.tracks);
    const currentTime = useEditorStore(state => state.currentTime);
    const duration = useEditorStore(state => state.duration);
    const zoom = useEditorStore(state => state.zoom);
    const selectedClipId = useEditorStore(state => state.selectedClipId);

    const pixelsPerSecond = 50 * zoom;
    const timelineWidth = Math.max(duration * pixelsPerSecond, 1000);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View className="bg-gray-900 h-64">
            {/* Time ruler */}
            <View className="h-8 bg-gray-800 border-b border-gray-700">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ width: timelineWidth }} className="flex-row">
                        {Array.from({ length: Math.ceil(duration) + 1 }).map((_, index) => (
                            <View
                                key={index}
                                style={{ width: pixelsPerSecond }}
                                className="border-l border-gray-600 px-1"
                            >
                                <Text className="text-white text-xs">{formatTime(index)}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Tracks */}
            <ScrollView className="flex-1">
                {tracks.map((track) => (
                    <View key={track.id} className="h-16 border-b border-gray-700">
                        <View className="flex-row">
                            {/* Track header */}
                            <View className="w-20 bg-gray-800 items-center justify-center border-r border-gray-700">
                                <Text className="text-white text-xs uppercase">{track.type}</Text>
                            </View>

                            {/* Track content */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ width: timelineWidth }} className="relative">
                                    {track.clips.map((clip) => {
                                        const left = clip.startTime * pixelsPerSecond;
                                        const width = clip.duration * pixelsPerSecond;
                                        const isSelected = clip.id === selectedClipId;

                                        return (
                                            <TouchableOpacity
                                                key={clip.id}
                                                style={{ left, width }}
                                                className={`absolute top-1 h-14 rounded ${isSelected ? 'bg-blue-600' : 'bg-purple-600'
                                                    } border-2 ${isSelected ? 'border-blue-400' : 'border-purple-400'
                                                    } p-1`}
                                                onPress={() => onClipPress(clip)}
                                            >
                                                <Text className="text-white text-xs" numberOfLines={1}>
                                                    {clip.type}
                                                </Text>
                                                <Text className="text-white text-xs opacity-70">
                                                    {formatTime(clip.duration)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {/* Remote Cursors Overlay */}
                                    {Object.values(cursors).map(cursor => (
                                        <View
                                            key={cursor.userId}
                                            style={{ left: cursor.timestamp * pixelsPerSecond, backgroundColor: cursor.color || '#ff0000' }}
                                            className="absolute top-0 bottom-0 w-0.5 opacity-70"
                                        />
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Playhead */}
            <View
                style={{ left: currentTime * pixelsPerSecond + 80 }}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            >
                <View className="w-3 h-3 bg-red-500 rounded-full -ml-1.5" />
            </View>
        </View>
    );
};
