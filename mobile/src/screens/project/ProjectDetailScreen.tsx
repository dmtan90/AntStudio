import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MediaPicker } from '../../components/MediaPicker';

export const ProjectDetailScreen = ({ route, navigation }: any) => {
    const { projectId, title } = route.params;

    // Mock data for project details
    const project = {
        id: projectId,
        title: title || 'Project Detail',
        description: 'A cinematic video about AI transformation.',
        assets: [
            { id: '1', type: 'image', url: 'https://via.placeholder.com/150' },
            { id: '2', type: 'video', url: 'https://via.placeholder.com/150' },
        ]
    };

    const handleMediaSelect = (asset: any) => {
        console.log('Selected asset:', asset);
        // Trigger upload logic here
    };

    return (
        <View className="flex-1 bg-gray-900">
            {/* Header */}
            <View className="flex-row items-center p-4 bg-gray-800">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Text className="text-white text-lg">←</Text>
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
                    {project.title}
                </Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Description */}
                <View className="bg-gray-800 p-4 rounded-lg mb-6">
                    <Text className="text-gray-400 mb-2">Description</Text>
                    <Text className="text-white">{project.description}</Text>
                </View>

                {/* Assets Section */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-lg font-bold">Assets</Text>
                    <MediaPicker onSelect={handleMediaSelect} />
                </View>

                <View className="flex-row flex-wrap">
                    {project.assets.map((asset) => (
                        <TouchableOpacity key={asset.id} className="w-1/3 p-1 aspect-square">
                            <Image
                                source={{ uri: asset.url }}
                                className="w-full h-full rounded bg-gray-700"
                            />
                            {asset.type === 'video' && (
                                <View className="absolute inset-0 justify-center items-center bg-black/30">
                                    <Text className="text-white">▶</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};
