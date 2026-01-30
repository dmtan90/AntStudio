import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Video, { VideoRef } from 'react-native-video';

const { width } = Dimensions.get('window');

export const SimpleEditorScreen = ({ route }: any) => {
    const { videoUri } = route.params || { videoUri: 'https://via.placeholder.com/150' }; // Fallback
    const videoRef = useRef<VideoRef>(null);

    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(10); // Default 10s

    const handleLoad = (meta: any) => {
        setDuration(meta.duration);
        setEndTime(meta.duration);
    };

    const handleProgress = (prog: any) => {
        setCurrentTime(prog.currentTime);
        // Loop logic relative to trim
        if (prog.currentTime >= endTime) {
            videoRef.current?.seek(startTime);
        }
    };

    return (
        <View className="flex-1 bg-black justify-center">
            <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={styles.video}
                resizeMode="contain"
                onLoad={handleLoad}
                onProgress={handleProgress}
                repeat={true}
            />

            {/* Controls Overlay */}
            <View className="absolute bottom-10 left-0 right-0 p-4">
                <Text className="text-white text-center mb-2">
                    {Math.floor(currentTime)}s / {Math.floor(duration)}s
                </Text>

                {/* Set Start/End Buttons */}
                <View className="flex-row justify-between mb-4">
                    <TouchableOpacity className="bg-gray-700 p-2 rounded" onPress={() => setStartTime(currentTime)}>
                        <Text className="text-white">Set Start ({Math.floor(startTime)}s)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-gray-700 p-2 rounded" onPress={() => setEndTime(currentTime)}>
                        <Text className="text-white">Set End ({Math.floor(endTime)}s)</Text>
                    </TouchableOpacity>
                </View>

                {/* Trimmer Visual */}
                <View className="bg-gray-800 h-12 rounded flex-row items-center px-2">
                    <View className="flex-1 bg-gray-600 h-2 rounded mx-2">
                        <View
                            style={{
                                left: `${(startTime / duration || 0) * 100}%`,
                                width: `${((endTime - startTime) / (duration || 1)) * 100}%`
                            }}
                            className="absolute h-full bg-blue-500"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    className="bg-blue-600 mt-4 p-4 rounded-lg items-center"
                    onPress={() => console.log(`Trimmed: ${startTime} - ${endTime}`)}
                >
                    <Text className="text-white font-bold">Save Trim</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    video: {
        width: width,
        height: width * (9 / 16), // 16:9 aspect ratio
        backgroundColor: 'black',
    },
});
