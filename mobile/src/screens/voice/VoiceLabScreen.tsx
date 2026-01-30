import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { voiceService } from '../../services/VoiceService';
import { analyticsService } from '../../utils/analytics';

interface Voice {
    voiceId: string;
    name: string;
    description?: string;
    previewUrl?: string;
}

interface Props {
    navigation: any;
}

export const VoiceLabScreen: React.FC<Props> = () => {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
    const [ttsText, setTtsText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'library' | 'clone' | 'tts'>('library');

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        try {
            setIsLoading(true);
            const voiceList = await voiceService.getVoices();
            setVoices(voiceList);
        } catch (error) {
            console.error('Failed to load voices:', error);
            Alert.alert('Error', 'Failed to load voice library');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSpeech = async () => {
        if (!selectedVoice) {
            Alert.alert('No Voice Selected', 'Please select a voice first');
            return;
        }

        if (!ttsText.trim()) {
            Alert.alert('No Text', 'Please enter text to convert to speech');
            return;
        }

        try {
            setIsGenerating(true);

            await voiceService.generateSpeech({
                text: ttsText,
                voiceId: selectedVoice.voiceId,
            });

            analyticsService.logEvent('tts_generated', {
                voice_id: selectedVoice.voiceId,
                text_length: ttsText.length,
            });

            Alert.alert('Success', 'Speech generated successfully!');
            // In real app, play the audio
        } catch (error) {
            console.error('TTS generation failed:', error);
            Alert.alert('Error', 'Failed to generate speech');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCloneVoice = () => {
        // Navigate to voice cloning screen
        Alert.alert('Voice Cloning', 'Voice cloning feature coming soon!');
    };

    return (
        <View className="flex-1 bg-black">
            {/* Header */}
            <View className="p-4 border-b border-gray-800">
                <Text className="text-white text-2xl font-bold">Voice Lab</Text>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-gray-800">
                <TouchableOpacity
                    className={`flex-1 p-4 ${activeTab === 'library' ? 'border-b-2 border-blue-600' : ''}`}
                    onPress={() => setActiveTab('library')}
                >
                    <Text className={`text-center ${activeTab === 'library' ? 'text-blue-600' : 'text-gray-400'}`}>
                        Library
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 p-4 ${activeTab === 'clone' ? 'border-b-2 border-blue-600' : ''}`}
                    onPress={() => setActiveTab('clone')}
                >
                    <Text className={`text-center ${activeTab === 'clone' ? 'text-blue-600' : 'text-gray-400'}`}>
                        Clone
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 p-4 ${activeTab === 'tts' ? 'border-b-2 border-blue-600' : ''}`}
                    onPress={() => setActiveTab('tts')}
                >
                    <Text className={`text-center ${activeTab === 'tts' ? 'text-blue-600' : 'text-gray-400'}`}>
                        TTS
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Voice Library Tab */}
            {activeTab === 'library' && (
                <ScrollView className="flex-1 p-4">
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#3b82f6" />
                    ) : (
                        voices.map((voice) => (
                            <TouchableOpacity
                                key={voice.voiceId}
                                className={`bg-gray-900 p-4 rounded mb-3 ${selectedVoice?.voiceId === voice.voiceId ? 'border-2 border-blue-600' : ''
                                    }`}
                                onPress={() => setSelectedVoice(voice)}
                            >
                                <Text className="text-white font-bold">{voice.name}</Text>
                                {voice.description && (
                                    <Text className="text-gray-400 text-sm mt-1">{voice.description}</Text>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Clone Tab */}
            {activeTab === 'clone' && (
                <View className="flex-1 p-4 items-center justify-center">
                    <Text className="text-white text-lg mb-4">Clone Your Voice</Text>
                    <Text className="text-gray-400 text-center mb-6">
                        Record 3-5 audio samples to create a digital clone of your voice
                    </Text>
                    <TouchableOpacity
                        className="bg-blue-600 px-6 py-3 rounded"
                        onPress={handleCloneVoice}
                    >
                        <Text className="text-white font-bold">Start Cloning</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* TTS Tab */}
            {activeTab === 'tts' && (
                <View className="flex-1 p-4">
                    {selectedVoice ? (
                        <>
                            <View className="bg-gray-900 p-3 rounded mb-4">
                                <Text className="text-gray-400 text-sm">Selected Voice</Text>
                                <Text className="text-white font-bold">{selectedVoice.name}</Text>
                            </View>

                            <TextInput
                                className="bg-gray-900 text-white p-4 rounded h-40 mb-4"
                                placeholder="Enter text to convert to speech..."
                                placeholderTextColor="#666"
                                value={ttsText}
                                onChangeText={setTtsText}
                                multiline
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                className={`p-4 rounded ${isGenerating ? 'bg-gray-600' : 'bg-blue-600'}`}
                                onPress={handleGenerateSpeech}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white text-center font-bold">Generate Speech</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-gray-400">Select a voice from the library first</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
