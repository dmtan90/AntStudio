import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLiveStreamStore } from '../stores/useLiveStreamStore';

interface Props {
    onStartStop: () => void;
    onFlipCamera: () => void;
    onToggleMute: () => void;
    isMuted: boolean;
}

export const LiveControlsOverlay: React.FC<Props> = ({
    onStartStop,
    onFlipCamera,
    onToggleMute,
    isMuted,
}) => {
    const status = useLiveStreamStore(state => state.status);
    const analytics = useLiveStreamStore(state => state.analytics);
    const config = useLiveStreamStore(state => state.config);

    const isLive = status === 'live';

    return (
        <View className="absolute inset-0 pointer-events-box-none">
            {/* Top Bar */}
            <View className="flex-row justify-between items-center p-4 pointer-events-auto">
                {/* Live Indicator */}
                {isLive && (
                    <View className="bg-red-600 px-3 py-1 rounded-full flex-row items-center">
                        <View className="w-2 h-2 bg-white rounded-full mr-2" />
                        <Text className="text-white font-bold">LIVE</Text>
                    </View>
                )}

                {/* Viewer Count */}
                {isLive && (
                    <View className="bg-black/50 px-3 py-1 rounded-full">
                        <Text className="text-white">👁️ {analytics.viewerCount}</Text>
                    </View>
                )}
            </View>

            {/* AI Status Indicators */}
            {isLive && (
                <View className="absolute top-20 right-4 pointer-events-auto">
                    {config?.aiDirectorEnabled && (
                        <View className="bg-blue-600/80 px-3 py-1 rounded-full mb-2">
                            <Text className="text-white text-xs">🤖 AI Director</Text>
                        </View>
                    )}
                    {config?.commerceEnabled && (
                        <View className="bg-green-600/80 px-3 py-1 rounded-full">
                            <Text className="text-white text-xs">💰 Commerce</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Bottom Controls */}
            <View className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
                <View className="flex-row justify-around items-center">
                    {/* Flip Camera */}
                    <TouchableOpacity
                        className="bg-gray-800/80 w-14 h-14 rounded-full items-center justify-center"
                        onPress={onFlipCamera}
                    >
                        <Text className="text-white text-2xl">🔄</Text>
                    </TouchableOpacity>

                    {/* Start/Stop Button */}
                    <TouchableOpacity
                        className={`w-20 h-20 rounded-full items-center justify-center ${isLive ? 'bg-red-600' : 'bg-white'
                            }`}
                        onPress={onStartStop}
                    >
                        {isLive ? (
                            <View className="w-8 h-8 bg-white rounded" />
                        ) : (
                            <View className="w-0 h-0 border-l-[16px] border-l-red-600 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
                        )}
                    </TouchableOpacity>

                    {/* Mute Button */}
                    <TouchableOpacity
                        className="bg-gray-800/80 w-14 h-14 rounded-full items-center justify-center"
                        onPress={onToggleMute}
                    >
                        <Text className="text-white text-2xl">{isMuted ? '🔇' : '🎤'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Analytics Bar */}
                {isLive && (
                    <View className="mt-4 bg-black/50 p-3 rounded-lg">
                        <View className="flex-row justify-around">
                            <View className="items-center">
                                <Text className="text-white text-xs">Likes</Text>
                                <Text className="text-white font-bold">{analytics.likes}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-white text-xs">Comments</Text>
                                <Text className="text-white font-bold">{analytics.comments}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-white text-xs">Peak</Text>
                                <Text className="text-white font-bold">{analytics.peakViewers}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};
