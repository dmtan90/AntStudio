import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useLiveStreamStore, StreamPlatform } from '../../stores/useLiveStreamStore';
import { analyticsService } from '../../utils/analytics';

interface Props {
    navigation: any;
}

export const LiveStreamSetupScreen: React.FC<Props> = ({ navigation }) => {
    const setConfig = useLiveStreamStore(state => state.setConfig);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [platforms, setPlatforms] = useState<StreamPlatform[]>(['youtube']);
    const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
    const [aiDirectorEnabled, setAiDirectorEnabled] = useState(true);
    const [commerceEnabled, setCommerceEnabled] = useState(false);

    const togglePlatform = (platform: StreamPlatform) => {
        if (platforms.includes(platform)) {
            setPlatforms(platforms.filter(p => p !== platform));
        } else {
            setPlatforms([...platforms, platform]);
        }
    };

    const handleStartStream = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a stream title');
            return;
        }

        if (platforms.length === 0) {
            Alert.alert('Error', 'Please select at least one platform');
            return;
        }

        const config = {
            title,
            description,
            platforms,
            privacy,
            aiDirectorEnabled,
            commerceEnabled,
        };

        setConfig(config);

        // Track event
        analyticsService.logEvent('live_stream_setup', {
            platforms: platforms.join(','),
            ai_director: aiDirectorEnabled,
            commerce: commerceEnabled,
        });

        // Navigate to live stream screen
        navigation.navigate('LiveStream');
    };

    return (
        <ScrollView className="flex-1 bg-black">
            <View className="p-4">
                <Text className="text-white text-2xl font-bold mb-6">Setup Live Stream</Text>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Stream Title *</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded"
                        placeholder="Enter stream title"
                        placeholderTextColor="#666"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Description */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Description</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded h-24"
                        placeholder="Enter description"
                        placeholderTextColor="#666"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {/* Platforms */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Streaming Platforms *</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded ${platforms.includes('youtube') ? 'bg-red-600' : 'bg-gray-800'}`}
                            onPress={() => togglePlatform('youtube')}
                        >
                            <Text className="text-white text-center">YouTube</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded ${platforms.includes('facebook') ? 'bg-blue-600' : 'bg-gray-800'}`}
                            onPress={() => togglePlatform('facebook')}
                        >
                            <Text className="text-white text-center">Facebook</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded ${platforms.includes('tiktok') ? 'bg-pink-600' : 'bg-gray-800'}`}
                            onPress={() => togglePlatform('tiktok')}
                        >
                            <Text className="text-white text-center">TikTok</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Privacy */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Privacy</Text>
                    <View className="flex-row gap-2">
                        {(['public', 'unlisted', 'private'] as const).map((option) => (
                            <TouchableOpacity
                                key={option}
                                className={`flex-1 p-3 rounded ${privacy === option ? 'bg-blue-600' : 'bg-gray-800'}`}
                                onPress={() => setPrivacy(option)}
                            >
                                <Text className="text-white text-center capitalize">{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* AI Features */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-3">AI Features</Text>

                    <View className="flex-row justify-between items-center bg-gray-800 p-3 rounded mb-2">
                        <View>
                            <Text className="text-white font-medium">AI Director</Text>
                            <Text className="text-gray-400 text-xs">Autonomous scene switching</Text>
                        </View>
                        <Switch
                            value={aiDirectorEnabled}
                            onValueChange={setAiDirectorEnabled}
                            trackColor={{ false: '#555', true: '#3b82f6' }}
                        />
                    </View>

                    <View className="flex-row justify-between items-center bg-gray-800 p-3 rounded">
                        <View>
                            <Text className="text-white font-medium">Commerce Intelligence</Text>
                            <Text className="text-gray-400 text-xs">Product detection & QR codes</Text>
                        </View>
                        <Switch
                            value={commerceEnabled}
                            onValueChange={setCommerceEnabled}
                            trackColor={{ false: '#555', true: '#3b82f6' }}
                        />
                    </View>
                </View>

                {/* Start Button */}
                <TouchableOpacity
                    className="bg-red-600 p-4 rounded-lg mt-4"
                    onPress={handleStartStream}
                >
                    <Text className="text-white text-center font-bold text-lg">Start Live Stream</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};
