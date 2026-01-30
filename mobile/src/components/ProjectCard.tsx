import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

export const ProjectCard = ({ project, onPress }: { project: any, onPress: () => void }) => {
    return (
        <TouchableOpacity onPress={onPress} className="bg-gray-800 rounded-xl mb-4 overflow-hidden shadow-lg">
            <View className="h-40 bg-gray-700">
                {/* Placeholder for Video/Image thumbnail */}
                {project.thumbnailUrl ? (
                    <Image source={{ uri: project.thumbnailUrl }} className="w-full h-full" resizeMode="cover" />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-500">No Preview</Text>
                    </View>
                )}

                <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded">
                    <Text className="text-white text-xs font-bold">{project.status.toUpperCase()}</Text>
                </View>
            </View>

            <View className="p-4">
                <Text className="text-white text-lg font-bold" numberOfLines={1}>{project.title}</Text>
                <Text className="text-gray-400 text-sm mt-1">{new Date(project.updatedAt || Date.now()).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );
};
