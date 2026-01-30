import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { socialSharingService, SocialPlatform } from '../../services/SocialSharingService';
import { analyticsService } from '../../utils/analytics';

interface Props {
    navigation: any;
    route: {
        params: {
            videoPath: string;
        };
    };
}

export const ShareScreen: React.FC<Props> = ({ navigation, route }) => {
    const { videoPath } = route.params;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
    const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const togglePlatform = (platform: SocialPlatform) => {
        if (selectedPlatforms.includes(platform)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
        } else {
            setSelectedPlatforms([...selectedPlatforms, platform]);
        }
    };

    const handleShare = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        if (selectedPlatforms.length === 0) {
            Alert.alert('Error', 'Please select at least one platform');
            return;
        }

        setIsUploading(true);
        const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

        try {
            const uploadPromises = selectedPlatforms.map(platform =>
                socialSharingService.upload(
                    {
                        platform,
                        videoPath,
                        title,
                        description,
                        tags: tagArray,
                        privacy,
                    },
                    (progress) => setUploadProgress(progress)
                )
            );

            const results = await Promise.all(uploadPromises);

            // Track event
            analyticsService.logEvent('video_shared', {
                platforms: selectedPlatforms.join(','),
                video_count: results.length,
            });

            Alert.alert(
                'Success',
                `Video uploaded to ${selectedPlatforms.length} platform(s)!`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Upload failed:', error);
            Alert.alert('Error', 'Failed to upload video. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <ScrollView className="flex-1 bg-black">
            <View className="p-4">
                <Text className="text-white text-2xl font-bold mb-6">Share Video</Text>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Title *</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded"
                        placeholder="Enter video title"
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

                {/* Tags */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Tags (comma-separated)</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded"
                        placeholder="e.g. travel, vlog, adventure"
                        placeholderTextColor="#666"
                        value={tags}
                        onChangeText={setTags}
                    />
                </View>

                {/* Platforms */}
                <View className="mb-4">
                    <Text className="text-white text-sm mb-2">Select Platforms *</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded ${selectedPlatforms.includes('youtube') ? 'bg-red-600' : 'bg-gray-800'}`}
                            onPress={() => togglePlatform('youtube')}
                        >
                            <Text className="text-white text-center">YouTube</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded ${selectedPlatforms.includes('tiktok') ? 'bg-pink-600' : 'bg-gray-800'}`}
                            onPress={() => togglePlatform('tiktok')}
                        >
                            <Text className="text-white text-center">TikTok</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded ${selectedPlatforms.includes('instagram') ? 'bg-purple-600' : 'bg-gray-800'}`}
                            onPress={() => togglePlatform('instagram')}
                        >
                            <Text className="text-white text-center">Instagram</Text>
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

                {/* Upload Progress */}
                {isUploading && (
                    <View className="mb-4 bg-gray-800 p-4 rounded">
                        <Text className="text-white mb-2">Uploading... {uploadProgress.toFixed(0)}%</Text>
                        <View className="h-2 bg-gray-700 rounded overflow-hidden">
                            <View
                                style={{ width: `${uploadProgress}%` }}
                                className="h-full bg-blue-600"
                            />
                        </View>
                    </View>
                )}

                {/* Share Button */}
                <TouchableOpacity
                    className={`p-4 rounded-lg ${isUploading ? 'bg-gray-600' : 'bg-blue-600'}`}
                    onPress={handleShare}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white text-center font-bold text-lg">Share Video</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};
