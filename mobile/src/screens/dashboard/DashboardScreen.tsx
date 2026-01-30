import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ViewStyle } from 'react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProjectCard } from '../../components/ProjectCard';

// Mock Data
const MOCK_PROJECTS = [
    { id: '1', title: 'Top 10 AI Tools', status: 'completed', thumbnailUrl: 'https://via.placeholder.com/300' },
    { id: '2', title: 'Future of Coding', status: 'processing', thumbnailUrl: null },
    { id: '3', title: 'AntMedia Demo', status: 'draft', thumbnailUrl: null },
];

export const DashboardScreen = ({ navigation }: any) => {
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);

    return (
        <View className="flex-1 bg-gray-900 pt-12 px-4">
            <View className="flex-row justify-between items-center mb-6">
                <View>
                    <Text className="text-gray-400 text-sm">Welcome back,</Text>
                    <Text className="text-white text-2xl font-bold">{user?.name || 'User'}</Text>
                </View>
                <TouchableOpacity onPress={logout} className="bg-gray-800 px-3 py-2 rounded-lg">
                    <Text className="text-white text-xs">Logout</Text>
                </TouchableOpacity>
            </View>

            <View className="flex-row gap-4 mb-6">
                <TouchableOpacity
                    className="flex-1 bg-blue-600 p-4 rounded-lg items-center"
                    onPress={() => navigation.navigate('Templates')}
                >
                    <Text className="text-white font-bold">Templates</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-1 bg-purple-600 p-4 rounded-lg items-center"
                    onPress={() => navigation.navigate('Analytics')}
                >
                    <Text className="text-white font-bold">Analytics</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-white text-xl font-bold mb-4">Your Projects</Text>

            <FlatList
                data={MOCK_PROJECTS}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <ProjectCard
                        project={item}
                        onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id, title: item.title })}
                    />
                )}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = {
    listContent: { paddingBottom: 20 } as ViewStyle
};
