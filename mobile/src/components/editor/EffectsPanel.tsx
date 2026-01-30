import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Slider } from 'react-native';
import { Effect } from '../../stores/useEditorStore';

interface Props {
    onApplyEffect: (effect: Effect) => void;
}

const FILTERS = [
    { id: 'vintage', name: 'Vintage', icon: '📷' },
    { id: 'blackwhite', name: 'B&W', icon: '⚫' },
    { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
    { id: 'warm', name: 'Warm', icon: '🌅' },
    { id: 'cool', name: 'Cool', icon: '❄️' },
];

export const EffectsPanel: React.FC<Props> = ({ onApplyEffect }) => {
    const [activeTab, setActiveTab] = useState<'filters' | 'adjustments' | 'speed'>('filters');
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(1);
    const [saturation, setSaturation] = useState(1);
    const [speed, setSpeed] = useState(1);

    const handleFilterPress = (filterId: string, filterName: string) => {
        const effect: Effect = {
            id: `effect-${Date.now()}`,
            type: 'filter',
            name: filterId,
            params: {},
        };
        onApplyEffect(effect);
    };

    const handleApplyAdjustments = () => {
        const effect: Effect = {
            id: `effect-${Date.now()}`,
            type: 'adjustment',
            name: 'adjustments',
            params: { brightness, contrast, saturation },
        };
        onApplyEffect(effect);
    };

    const handleApplySpeed = () => {
        const effect: Effect = {
            id: `effect-${Date.now()}`,
            type: 'speed',
            name: 'speed',
            params: { speed },
        };
        onApplyEffect(effect);
    };

    return (
        <View className="bg-gray-900 p-4">
            {/* Tabs */}
            <View className="flex-row mb-4">
                <TouchableOpacity
                    className={`flex-1 p-3 rounded-l ${activeTab === 'filters' ? 'bg-blue-600' : 'bg-gray-800'}`}
                    onPress={() => setActiveTab('filters')}
                >
                    <Text className="text-white text-center">Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 p-3 ${activeTab === 'adjustments' ? 'bg-blue-600' : 'bg-gray-800'}`}
                    onPress={() => setActiveTab('adjustments')}
                >
                    <Text className="text-white text-center">Adjust</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 p-3 rounded-r ${activeTab === 'speed' ? 'bg-blue-600' : 'bg-gray-800'}`}
                    onPress={() => setActiveTab('speed')}
                >
                    <Text className="text-white text-center">Speed</Text>
                </TouchableOpacity>
            </View>

            {/* Filters Tab */}
            {activeTab === 'filters' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-3">
                        {FILTERS.map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                className="w-24 h-24 bg-gray-800 rounded items-center justify-center"
                                onPress={() => handleFilterPress(filter.id, filter.name)}
                            >
                                <Text className="text-4xl mb-1">{filter.icon}</Text>
                                <Text className="text-white text-xs">{filter.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Adjustments Tab */}
            {activeTab === 'adjustments' && (
                <View>
                    <View className="mb-4">
                        <Text className="text-white mb-2">Brightness: {brightness.toFixed(2)}</Text>
                        <Slider
                            value={brightness}
                            onValueChange={setBrightness}
                            minimumValue={-1}
                            maximumValue={1}
                            step={0.1}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor="#4b5563"
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-white mb-2">Contrast: {contrast.toFixed(2)}</Text>
                        <Slider
                            value={contrast}
                            onValueChange={setContrast}
                            minimumValue={0}
                            maximumValue={2}
                            step={0.1}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor="#4b5563"
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-white mb-2">Saturation: {saturation.toFixed(2)}</Text>
                        <Slider
                            value={saturation}
                            onValueChange={setSaturation}
                            minimumValue={0}
                            maximumValue={2}
                            step={0.1}
                            minimumTrackTintColor="#3b82f6"
                            maximumTrackTintColor="#4b5563"
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-blue-600 p-3 rounded"
                        onPress={handleApplyAdjustments}
                    >
                        <Text className="text-white text-center font-bold">Apply Adjustments</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Speed Tab */}
            {activeTab === 'speed' && (
                <View>
                    <Text className="text-white mb-2">Speed: {speed.toFixed(1)}x</Text>
                    <Slider
                        value={speed}
                        onValueChange={setSpeed}
                        minimumValue={0.5}
                        maximumValue={2}
                        step={0.1}
                        minimumTrackTintColor="#3b82f6"
                        maximumTrackTintColor="#4b5563"
                    />

                    <View className="flex-row justify-around mt-4 mb-4">
                        <TouchableOpacity onPress={() => setSpeed(0.5)}>
                            <Text className="text-white">0.5x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSpeed(1)}>
                            <Text className="text-white">1x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSpeed(1.5)}>
                            <Text className="text-white">1.5x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSpeed(2)}>
                            <Text className="text-white">2x</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        className="bg-blue-600 p-3 rounded"
                        onPress={handleApplySpeed}
                    >
                        <Text className="text-white text-center font-bold">Apply Speed</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
