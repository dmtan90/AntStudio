import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { templateService, Template } from '../../services/TemplateService';
import { useNavigation } from '@react-navigation/native';

export const TemplatesScreen = () => {
    const navigation = useNavigation<any>();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [applyingId, setApplyingId] = useState<string | null>(null);

    const categories = ['All', 'Vlog', 'Travel', 'Business', 'Social'];

    useEffect(() => {
        loadTemplates();
    }, [selectedCategory]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            // Simulate network delay for better UX feel during mock
            // await new Promise(resolve => setTimeout(resolve, 500));
            const data = await templateService.getTemplates(selectedCategory);
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyTemplate = async (template: Template) => {
        setApplyingId(template.id);
        try {
            await templateService.applyTemplate(template.id);
            Alert.alert(
                'Template Applied',
                `"${template.name}" has been applied to a new project.`,
                [
                    {
                        text: 'Go to Editor',
                        onPress: () => {
                            // Create a temporary project ID or navigate to editor with special flag
                            navigation.navigate('AdvancedEditor', { projectId: `temp_${Date.now()}` });
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to apply template');
        } finally {
            setApplyingId(null);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View className="flex-1 bg-black">
            {/* Header */}
            <View className="p-4 border-b border-gray-800">
                <Text className="text-white text-2xl font-bold mb-4">Templates</Text>

                {/* Search */}
                <TextInput
                    className="bg-gray-800 text-white p-3 rounded-lg mb-4"
                    placeholder="Search templates..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />

                {/* Categories */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === cat ? 'bg-white' : 'bg-gray-800'}`}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text className={`${selectedCategory === cat ? 'text-black font-bold' : 'text-gray-400'}`}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Grid */}
            <ScrollView className="flex-1 p-2">
                {isLoading ? (
                    <View className="mt-20">
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                ) : (
                    <View className="flex-row flex-wrap justify-between">
                        {filteredTemplates.map(template => (
                            <View key={template.id} className="w-[48%] bg-gray-900 rounded-lg mb-4 overflow-hidden">
                                <View className="h-32 bg-gray-800 relative">
                                    <Image
                                        source={{ uri: template.thumbnail }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                    <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded">
                                        <Text className="text-white text-xs">{template.duration}s</Text>
                                    </View>
                                </View>

                                <View className="p-3">
                                    <Text className="text-white font-bold mb-1" numberOfLines={1}>{template.name}</Text>
                                    <Text className="text-gray-400 text-xs mb-3" numberOfLines={2}>{template.description}</Text>

                                    <TouchableOpacity
                                        className={`py-2 rounded items-center ${applyingId === template.id ? 'bg-gray-700' : 'bg-blue-600'}`}
                                        onPress={() => handleApplyTemplate(template)}
                                        disabled={!!applyingId}
                                    >
                                        {applyingId === template.id ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text className="text-white font-bold text-xs">Use Template</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
};
